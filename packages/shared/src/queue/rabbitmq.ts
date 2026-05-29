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

export async function setupRabbitMq() {
  try {
    const ch = await createChannel();

    await assertExchanges(ch);

    await assertQueues(ch);

    console.log("✅ RabbitMQ Setup Complete");

    return ch;
  } catch (error) {
    console.error("❌ RabbitMQ Setup Failed", error);

    throw error;
  }
}
