import express from "express";
import dotenv from "dotenv";
import webhookRouter from "./routes/webhook.route";
import { setCorrelationId } from "./middleware/correlationId";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(setCorrelationId);

app.use(
  express.json({
    verify: (req: any, res: any, buf: Buffer) => {
      req.rawBody = buf.toString(); //main work here to convert the object into string..
    },
  }),
);

app.use("/v1/webhooks", webhookRouter);

app.listen(port, () => {
  console.log(`receiver server is started at http://localhost:${port}`);
});
