import express from "express";
import dotenv from "dotenv";
import webhookRouter from "./routes/webhook.route";
import { IncomingMessage, ServerResponse } from "http";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  express.json({
    verify: (req: IncomingMessage, res: ServerResponse, buf: Buffer) => {
      (req as any).rawBody = buf.toString;
    },
  }),
);

app.use("/v1/webhooks", webhookRouter);

app.listen(port, () => {
  console.log(`receiver server is started at http://localhost:${port}`);
});
