import dotenv from "dotenv";
dotenv.config();
import { setupRabbitMq } from "@hqrelay/shared/src/queue/rabbitmq";

async function main() {
  try {
    await setupRabbitMq();
    // TODO: consumeQueue()
  } catch (error) {
    console.error("Failed to start server — dependency check failed:", error);
    process.exit(1);
  }
}

main();
