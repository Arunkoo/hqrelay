import axios from "axios";

export async function deliverJob(
  targetUrl: string,
  payload: unknown,
): Promise<boolean> {
  try {
    await axios.post(targetUrl, payload, {
      timeout: 10000, //10s timeout for delivery
      headers: {
        "Content-Type": "application/json",
      },
    });

    return true;
  } catch (error) {
    console.error("Delivery Failed", error);
    return false;
  }
}
