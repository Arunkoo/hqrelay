import { RABBITMQ_CONFIG } from "@hqrelay/shared/src/config/rabbitmq.config";
import { createChannel } from "@hqrelay/shared/src/queue/rabbitmq";

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

      channel.ack(msg);
    } catch (error) {
      console.error(
        `[${msg.properties.correlationId}]: failed to process message`,
        error,
      );
      channel.nack(msg, false, false); //for parse failure..
    }
  });
}
