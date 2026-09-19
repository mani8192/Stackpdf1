import { Redis } from "ioredis";

// Single shared Redis connection. Set REDIS_URL in your environment
// (locally: redis://127.0.0.1:6379, or your hosted Redis provider's URL).
let connection;
export function getRedis() {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}
