import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";

/**
 * These tests create fresh rate limiters (not the exported ones, which skip
 * in NODE_ENV=test) to verify actual limiting behavior.
 */

function createApp(max: number, windowMs = 60_000) {
  const app = express();
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/test", limiter, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("rate limiter", () => {
  it("allows requests under the limit", async () => {
    const app = createApp(3);
    const agent = request(app);

    for (let i = 0; i < 3; i++) {
      const res = await agent.get("/test");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    }
  });

  it("returns 429 when limit is exceeded", async () => {
    const app = createApp(2);
    const agent = request(app);

    await agent.get("/test");
    await agent.get("/test");

    const res = await agent.get("/test");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: "Too many requests, please try again later.",
    });
  });

  it("includes standard RateLimit headers", async () => {
    const app = createApp(5);
    const res = await request(app).get("/test");

    expect(res.status).toBe(200);
    expect(res.headers["ratelimit-limit"]).toBe("5");
    expect(res.headers["ratelimit-remaining"]).toBe("4");
    expect(res.headers["ratelimit-reset"]).toBeDefined();
  });

  it("does not include legacy X-RateLimit headers", async () => {
    const app = createApp(5);
    const res = await request(app).get("/test");

    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
    expect(res.headers["x-ratelimit-remaining"]).toBeUndefined();
  });

  it("decrements remaining count with each request", async () => {
    const app = createApp(3);
    const agent = request(app);

    const res1 = await agent.get("/test");
    expect(res1.headers["ratelimit-remaining"]).toBe("2");

    const res2 = await agent.get("/test");
    expect(res2.headers["ratelimit-remaining"]).toBe("1");

    const res3 = await agent.get("/test");
    expect(res3.headers["ratelimit-remaining"]).toBe("0");
  });

  it("skips rate limiting when skip returns true", async () => {
    const app = express();
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
      skip: () => true,
    });
    app.use("/test", limiter, (_req, res) => {
      res.json({ ok: true });
    });

    const agent = request(app);

    // Should allow all requests even though max is 1
    for (let i = 0; i < 5; i++) {
      const res = await agent.get("/test");
      expect(res.status).toBe(200);
    }
  });
});
