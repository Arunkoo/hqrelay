import axios from "axios";

export async function deliverJob(
  targetUrl: string,
  payload: unknown,
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

    return {
      delivered: true,
      statusCode: res.status,
      latencyMs: endTime - startTime,
    };
  } catch (error) {
    console.error("Delivery Failed", error);
    return {
      delivered: false,
      statusCode: null,
      latencyMs: null,
    };
  }
}
