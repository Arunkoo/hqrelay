import { RABBITMQ_CONFIG } from "@hqrelay/shared/src/config/rabbitmq.config";
import { createChannel } from "@hqrelay/shared/src/queue/rabbitmq";
import { deliverJob } from "../deliver/deliverJob";
import { retryWithBackoff } from "../retry/retryWithBackoff";
import { insertDeliveryAttempt } from "@hqrelay/shared/src/db/repository/deliveryAttempt.repository";
import { attemptParameters } from "@hqrelay/shared/src/types/attemptParameters.type";

const url = "http://localhost:9999/"; //testphase hard coded string

export async function consumeQueue(): Promise<void> {
  const channel = await createChannel();
  console.log("✅ Consumer registered on queue:", RABBITMQ_CONFIG.queue.main);
  channel.prefetch(1); //pick only one job at a time..

  channel.consume(RABBITMQ_CONFIG.queue.main, async (msg) => {
    if (!msg) return;

    try {
      const parseMessage = msg.content.toString();
      if (!parseMessage) {
        throw new Error("Unable to parse the message object");
      }

      console.log(
        `[${msg.properties.correlationId}] message received`,
        parseMessage,
      );

      const payload = JSON.parse(parseMessage);
      //deliver msg
      const deliver = await deliverJob(url, payload);

      //precalculate and insert data..
      let status: attemptParameters["status"] = deliver.delivered
        ? "delivered"
        : "failed";

      const data: attemptParameters = {
        projectId: msg.properties.headers?.projectId,
        endpointId: "b292f0fb-93e3-4752-8c7f-a4f474e06ead", //TODO: NEED TO REPLCACE WITH DB LOOKUP..STRING
        payload: payload,
        statusCode: deliver.statusCode,
        status: status,
        attemptNumber: msg.properties.headers?.attemptCount ?? 1,
        correlationId: msg.properties.correlationId,
        latencyMs: deliver.latencyMs,
      };

      await insertDeliveryAttempt(data);

      if (deliver.delivered) {
        channel.ack(msg);
      } else {
        const attemptCount = msg.properties.headers?.attemptCount ?? 0;
        console.log(`currentAttempt: ${attemptCount}`);
        await retryWithBackoff(channel, msg, attemptCount);
      }
    } catch (error) {
      console.error(
        `[${msg.properties.correlationId}]: failed to process message`,
        error,
      );
      channel.nack(msg, false, false);
    }
  });
}
