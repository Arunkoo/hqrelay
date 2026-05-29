import express from "express";
import webhookRouter from "./routes/webhook.route";
import healthRouter from "./routes/health.route";
import docsRouter from "./routes/api.docs";
import { setCorrelationId } from "./middleware/correlationId";

const app = express();

app.use(setCorrelationId);

app.use(
  express.json({
    verify: (req: any, res: any, buf: Buffer) => {
      req.rawBody = buf.toString(); //main work here to convert the object into string..
    },
  }),
);

app.use("/", docsRouter);
app.use("/", healthRouter);
app.use("/v1/webhooks", webhookRouter);

export default app;
