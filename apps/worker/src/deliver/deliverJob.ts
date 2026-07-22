import axios from "axios";
import type { Logger } from "@hqrelay/shared/src/logger/index";

export async function deliverJob(
  targetUrl: string,
  payload: unknown,
  log: Logger,
): Promise<{
  delivered: boolean;
  statusCode: number | null;
  latencyMs: number | null;
}> {
  try {
    const startTime = Date.now();
    const res = await axios.post(targetUrl, payload, {
      timeout: 10000, //10s timeout for delivery
      headers: {
        "Content-Type": "application/json",
      },
    });
    const endTime = Date.now();
    const lat_ms = endTime - startTime;
    log.info(
      { targetUrl, statusCode: res.status, lat_ms },
      "Delivered succesfully",
    );
    return {
      delivered: true,
      statusCode: res.status,
      latencyMs: lat_ms,
    };
  } catch (error) {
    //TODO: ERROR NEED TO BE OF AXIOS INSTANCE AND NEED TO HANDLE ALL THREE TESTCASE...
    log.error({ targetUrl, err: error }, "Delivery failed");
    return {
      delivered: false,
      statusCode: null,
      latencyMs: null,
    };
  }
}
