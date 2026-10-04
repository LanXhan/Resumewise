import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

const app = createApp({ corsOrigin: "http://localhost:5173" });

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("allows the configured frontend origin", async () => {
    const res = await request(app).get("/health").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});

describe("trust proxy", () => {
  it("is off by default", () => {
    expect(app.get("trust proxy")).toBe(false);
  });

  it("is set to the given hop count", () => {
    const proxied = createApp({ corsOrigin: "http://localhost:5173", trustProxy: 1 });
    expect(proxied.get("trust proxy")).toBe(1);
  });
});
