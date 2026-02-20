import Redis from "ioredis";
import { ConfigError } from "@/lib/errors";

let redis: Redis;

export function getRedis(): Redis {
  if (redis) return redis;

  if (!process.env.REDIS_URL) throw new ConfigError("REDIS_URL");

  redis = new Redis(process.env.REDIS_URL);

  return redis;
}
