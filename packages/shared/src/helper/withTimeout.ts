/**
 * Race a dependency check against a timeout.
 * If the timeout wins, the dependency is treated as unhealthy (rejects).
 * If the dependency settles first, its result/error propagates as-is.
 *
 * @param promise - the dependency call to race (e.g. db query, channel.checkQueue, redis.ping)
 * @param ms - timeout duration in milliseconds
 * @returns Promise<T> - resolves with the dependency's value if it wins,
 *                        rejects with a timeout Error if the timer fires first
 */

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]);
}
