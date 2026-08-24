import {
  checkRedisLiveness,
  checkDatabaseLiveness,
  checkRabbitMQLiveness,
} from "@hqrelay/shared";

function toStatus(result: PromiseSettledResult<boolean>): "Up" | "Down" {
  if (result.status === "rejected") {
    return "Down";
  }

  //if status is fullfilled we have 2 cases that either timeout fire or either service throw..
  if (result.value === false) {
    return "Down";
  } else {
    return "Up";
  }
}

export async function healthCheck() {
  const val = await Promise.allSettled([
    checkDatabaseLiveness(),
    checkRabbitMQLiveness(),
    checkRedisLiveness(),
  ]);

  const dbVal = toStatus(val[0]);
  const rabbitmqVal = toStatus(val[1]);
  const redisVal = toStatus(val[2]);

  const checks = {
    postgres: dbVal,
    rabbitMq: rabbitmqVal,
    redis: redisVal,
  };
  //redisval is non critical but dbVal and rabbitmqVal that is critical for this system..
  if (dbVal === "Down" || rabbitmqVal === "Down") {
    return {
      status: "down",
      checks: checks,
    };
  } else if (redisVal == "Down") {
    return {
      status: "degraded",
      checks: checks,
    };
  } else {
    return {
      status: "ok",
      checks: checks,
    };
  }
}
