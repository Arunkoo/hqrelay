import amqp, { Channel, ChannelModel } from "amqplib";

import { RABBITMQ_CONFIG } from "../config/rabbitmq.config";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectToRabbitMq() {
  try {
    if (connection) {
      return connection;
    }

    connection = await amqp.connect(RABBITMQ_CONFIG.url!);

    return connection;
  } catch (error) {
    console.error("RabbitMQ Connection Error", error);

    throw error;
  }
}

export async function createChannel(): Promise<Channel> {
  try {
    if (channel) return channel;
    const conn = await connectToRabbitMq();
    channel = await conn.createChannel();

    return channel;
  } catch (error) {
    console.error("Channel Creation Error", error);

    throw error;
  }
}

export async function assertExchanges(channel: Channel) {
  try {
    await channel.assertExchange(RABBITMQ_CONFIG.exchanges.main, "direct", {
      durable: true,
    });

    await channel.assertExchange(RABBITMQ_CONFIG.exchanges.dlx, "direct", {
      durable: true,
    });
  } catch (error) {
    console.error("Exchange Assertion Error", error);

    throw error;
  }
}

export async function assertQueues(channel: Channel) {
  try {
    await channel.assertQueue(RABBITMQ_CONFIG.queue.main, {
      durable: true,
      // argument here means we are telling rabbitmq to send back the undeleiverd message to the dead letter queue
      arguments: {
        "x-dead-letter-exchange": RABBITMQ_CONFIG.exchanges.dlx,
        "x-dead-letter-routing-key": "dead",
      },
    });

    await channel.assertQueue(RABBITMQ_CONFIG.queue.dlx, {
      durable: true,
    });

    // Bind Main Queue
    await channel.bindQueue(
      RABBITMQ_CONFIG.queue.main,
      RABBITMQ_CONFIG.exchanges.main,
      RABBITMQ_CONFIG.routingKey,
    );

    // Bind Dead Queue
    await channel.bindQueue(
      RABBITMQ_CONFIG.queue.dlx,
      RABBITMQ_CONFIG.exchanges.dlx,
      "dead",
    );
  } catch (error) {
    console.error("Queue Assertion Error", error);

    throw error;
  }
}

export async function publishWebhook(
  projectId: string,
  payload: unknown,
  correlationId: string,
): Promise<{ queued: boolean }> {
  try {
    //important note if channel fails means still log to webhook as failed matching current design from queueWebhook function
    //later we will move to approach where we wrap the publishWebhook in queueWebhook... it self for seperate concern...
    const channel = await createChannel();
    const res = channel.publish(
      RABBITMQ_CONFIG.exchanges.main,
      RABBITMQ_CONFIG.routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        correlationId: correlationId,
        headers: {
          projectId: projectId,
        },
      },
    );
    return { queued: res };
  } catch (error) {
    console.error("failed to publish webhook", error); //we need log here so we can know why this webhook failed as remark in console.. no db save..
    return { queued: false };
  }
}

//delay queues..
export async function assertDelayQueues(channel: Channel) {
  try {
    await Promise.all(
      RABBITMQ_CONFIG.retryDelays.map(async ({ name, ttl }) => {
        await channel.assertQueue(name, {
          durable: true,
          arguments: {
            "x-message-ttl": ttl,
            "x-dead-letter-exchange": RABBITMQ_CONFIG.exchanges.main,
            "x-dead-letter-routing-key": RABBITMQ_CONFIG.routingKey,
          },
        });
      }),
    );

    console.log("✅ Delay Queues Asserted");
  } catch (error) {
    console.error("Delay Queue Assertion Error", error);
    throw error;
  }
}

export async function setupRabbitMq() {
  try {
    const ch = await createChannel();

    await assertExchanges(ch);

    await assertQueues(ch);
    await assertDelayQueues(ch);

    console.log("✅ RabbitMQ Setup Complete");

    return ch;
  } catch (error) {
    console.error("❌ RabbitMQ Setup Failed", error);

    throw error;
  }
}
