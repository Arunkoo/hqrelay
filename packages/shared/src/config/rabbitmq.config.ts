export const RABBITMQ_CONFIG = {
  url: process.env.RABBITMQ_URL,
  exchanges: {
    main: "webhooks",
    dlx: "webhooks.dlx", //dlx-->dead letter queue
  },
  queue: {
    main: "webhooks.deliver",
    dlx: "webhooks.dead",
  },
  routingKey: "deliver",
  retryDelays: [
    { name: "delay.5s", ttl: 5000 },
    { name: "delay.30s", ttl: 30000 },
    { name: "delay.5min", ttl: 300000 },
    { name: "delay.30min", ttl: 1800000 },
    { name: "delay.1hr", ttl: 3600000 },
  ],
};
