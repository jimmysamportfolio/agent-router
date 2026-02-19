import Redis from "ioredis";

let redis: Redis;

export function getRedis(): Redis {
  if (redis) return redis;

  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required");

  redis = new Redis(process.env.REDIS_URL);

  return redis;
}
