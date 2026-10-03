import { rateLimit } from "express-rate-limit";

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  // ponytail: in-memory store, resets on restart and isn't shared across instances; use a Redis store if we scale out
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res, _next, config) => {
      // The library sets Retry-After (in seconds) before calling this handler.
      const retryAfterSeconds = Number(res.getHeader("Retry-After"));
      const message =
        retryAfterSeconds > 0
          ? `Too many requests. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`
          : "Too many requests. Try again later.";

      res.status(config.statusCode).json({ error: { code: "RATE_LIMITED", message } });
    },
  });
}
