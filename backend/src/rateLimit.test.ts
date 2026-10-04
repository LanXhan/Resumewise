import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createRateLimiter } from "./rateLimit.js";

const ONE_MINUTE = 60_000;

// A fresh app per test, so counters never carry over between tests.
function buildApp(limit: number, trustProxy?: number) {
  const app = express();
  if (trustProxy !== undefined) app.set("trust proxy", trustProxy);
  app.get("/test", createRateLimiter({ limit, windowMs: ONE_MINUTE }), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("createRateLimiter", () => {
  it("lets requests through up to the limit", async () => {
    const app = buildApp(2);
    expect((await request(app).get("/test")).status).toBe(200);
    expect((await request(app).get("/test")).status).toBe(200);
  });

  it("blocks the next request with our JSON error", async () => {
    const app = buildApp(2);
    await request(app).get("/test");
    await request(app).get("/test");

    const res = await request(app).get("/test");
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });

  it("sends the standard rate limit headers", async () => {
    const app = buildApp(1);
    const allowed = await request(app).get("/test");
    expect(allowed.headers["ratelimit"]).toBeDefined();

    const blocked = await request(app).get("/test");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("tells the client how long to wait", async () => {
    const app = buildApp(1);
    await request(app).get("/test");

    const res = await request(app).get("/test");
    expect(res.body.error.message).toBe("Too many requests. Try again in 1 minute(s).");
  });

  it("keeps a separate counter for each limiter", async () => {
    const app = express();
    app.get("/a", createRateLimiter({ limit: 1, windowMs: ONE_MINUTE }), (_req, res) => {
      res.json({ ok: true });
    });
    app.get("/b", createRateLimiter({ limit: 1, windowMs: ONE_MINUTE }), (_req, res) => {
      res.json({ ok: true });
    });

    await request(app).get("/a"); // allowed
    expect((await request(app).get("/a")).status).toBe(429); //blocks next 
    expect((await request(app).get("/b")).status).toBe(200); // allowed because it's a different limiter
  });

  it("counts each client separately when behind a trusted proxy", async () => {
    const app = buildApp(1, 1);
    const client = (ip: string) => request(app).get("/test").set("X-Forwarded-For", ip);

    await client("203.0.113.5");
    expect((await client("203.0.113.5")).status).toBe(429);
    expect((await client("198.51.100.7")).status).toBe(200);
  });
});
