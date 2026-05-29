import dotenv from "dotenv";
dotenv.config();
import app from "./index";
import { setupRabbitMq } from "@hqrelay/shared/src/queue/rabbitmq";

const port = process.env.PORT || 3000;

async function main() {
  try {
    await setupRabbitMq();
    app.listen(port, () => {
      console.log(`receiver started at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server — dependency check failed:", error);
    process.exit(1);
  }
}

main();
