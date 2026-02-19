import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

const skipInTest = { skip: () => isTest };

/** Auth endpoints: 10 requests per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  ...skipInTest,
});

/** Write endpoints: 30 requests per 15 minutes */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  ...skipInTest,
});

/** Game action endpoints: 60 requests per 1 minute */
export const gameActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  ...skipInTest,
});

/** General catch-all: 100 requests per 15 minutes */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  ...skipInTest,
});
