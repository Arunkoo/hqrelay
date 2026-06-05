import { RABBITMQ_CONFIG } from "@hqrelay/shared/src/config/rabbitmq.config";
import { Channel, ConsumeMessage } from "amqplib";

const delayQueue = RABBITMQ_CONFIG.retryDelays;

//later the msg form the dlx need to consume for now this simpler verison is correct

export async function retryWithBackoff(
  channel: Channel,
  msg: ConsumeMessage,
  attemptCount: number,
): Promise<void> {
  const currentQueue = delayQueue[attemptCount];

  if (attemptCount < delayQueue.length) {
    channel.sendToQueue(currentQueue.name, msg.content, {
      headers: {
        attemptCount: attemptCount + 1,
        projectId: msg.properties.headers?.projectId,
      },
      correlationId: msg.properties.correlationId,
    });

    channel.ack(msg);
  } else {
    channel.sendToQueue(RABBITMQ_CONFIG.queue.dlx, msg.content, {
      headers: {
        attemptCount: attemptCount,
        projectId: msg.properties.headers?.projectId,
      },
      correlationId: msg.properties.correlationId,
    });
    channel.ack(msg);
  }
}
