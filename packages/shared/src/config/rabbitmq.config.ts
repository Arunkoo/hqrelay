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
};
