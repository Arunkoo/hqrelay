import { createChannel } from "./rabbitmq";
import { RABBITMQ_CONFIG } from "../config/rabbitmq.config";
import { withTimeout } from "../helper/withTimeout";

export async function checkRabbitMQLiveness(): Promise<boolean> {
  try {
    await withTimeout(
      (async () => {
        const ch = await createChannel();
        await ch.checkQueue(RABBITMQ_CONFIG.queue.main);
      })(),
      2000,
    );

    return true;
  } catch (error) {
    console.error(`Queue does not exist or channel closed: ${error}`);
    return false;
  }
}
