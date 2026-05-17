async function queueWebhook(projectId: string, payload: unknown) {
  // TODO: verify HMAC signature
  // TODO: check idempotency key in Redis
  // TODO: publish to RabbitMQ
  // TODO: log to Postgres via repository
  console.log(`Queuing webhook for project: ${projectId}`);
  return { queued: true };
}
