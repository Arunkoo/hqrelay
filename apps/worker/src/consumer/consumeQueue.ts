import { RABBITMQ_CONFIG } from "@hqrelay/shared/src/config/rabbitmq.config";
import { createChannel } from "@hqrelay/shared/src/queue/rabbitmq";
import { deliverJob } from "../deliver/deliverJob";
import { retryWithBackoff } from "../retry/retryWithBackoff";

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
      const isdelivered = await deliverJob(url, payload);

      if (isdelivered) {
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
