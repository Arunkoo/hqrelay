import dotenv from "dotenv";
dotenv.config();
import { setupRabbitMq } from "@hqrelay/shared";
import { consumeQueue } from "./consumer/consumeQueue";

async function main() {
  try {
    await setupRabbitMq();
    await consumeQueue();
  } catch (error) {
    console.error("Failed to start server — dependency check failed:", error);
    process.exit(1);
  }
}

main();
