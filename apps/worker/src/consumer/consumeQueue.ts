import { RABBITMQ_CONFIG } from "@hqrelay/shared/src/config/rabbitmq.config";
import { createChannel } from "@hqrelay/shared/src/queue/rabbitmq";
import { deliverJob } from "../deliver/deliverJob";
import { retryWithBackoff } from "../retry/retryWithBackoff";
import { insertDeliveryAttempt } from "@hqrelay/shared/src/db/repository/deliveryAttempt.repository";
import { attemptParameters } from "@hqrelay/shared/src/types/attemptParameters.type";
import { getEndpointAndTargetUrl } from "@hqrelay/shared/src/db/repository/endpoint.repository";
import { createLogger } from "@hqrelay/shared/src/logger";

//creating a logger instance ....
const baseLogger = createLogger("worker");

export async function consumeQueue(): Promise<void> {
  const channel = await createChannel();
  baseLogger.info(
    { queue: RABBITMQ_CONFIG.queue.main },
    "Consumer registered on queue",
  );
  channel.prefetch(1); //pick only one job at a time..

  channel.consume(RABBITMQ_CONFIG.queue.main, async (msg) => {
    if (!msg) {
      baseLogger.error("msg object is missing");
      return;
    }

    const projectId = msg.properties.headers?.projectId as string;
    const correlationId = msg.properties.correlationId;
    const log = baseLogger.child({ projectId: projectId, correlationId });

    try {
      const parseMessage = msg.content.toString();
      if (!parseMessage) {
        throw new Error("Unable to parse the message object");
      }

      log.debug("message received and parsed");

      const payload = JSON.parse(parseMessage);
      const attemptCount: number = msg.properties.headers?.attemptCount ?? 0;

      const queryRes = await getEndpointAndTargetUrl(projectId);

      if (!queryRes) {
        channel.sendToQueue(RABBITMQ_CONFIG.queue.dlx, msg.content, {
          headers: {
            attemptCount: attemptCount,
            projectId: msg.properties.headers?.projectId,
          },
          correlationId: msg.properties.correlationId,
        });
        //patrn should be log-->ack--->return
        log.error("DB not able to find the targeted url or endpoint");
        channel.ack(msg);
        return;
      }

      const deliver = await deliverJob(queryRes.targetUrl, payload, log);

      let status: attemptParameters["status"] = deliver.delivered
        ? "delivered"
        : "failed";

      if (deliver.delivered) {
        channel.ack(msg);
      } else {
        const retryRes = await retryWithBackoff(
          channel,
          msg,
          attemptCount,
          log,
        );
        status = retryRes === "dead_lettered" ? "dead_lettered" : "failed";
      }

      const data: attemptParameters = {
        projectId: msg.properties.headers?.projectId,
        endpointId: queryRes.endpoint,
        payload: payload,
        statusCode: deliver.statusCode,
        status: status,
        attemptNumber: attemptCount + 1,
        correlationId: msg.properties.correlationId,
        latencyMs: deliver.latencyMs,
      };
      await insertDeliveryAttempt(data);
    } catch (error) {
      log.error({ err: error }, "failed to process message");
      channel.nack(msg, false, false);
    }
  });
}
