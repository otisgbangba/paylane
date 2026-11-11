import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ipKeyGenerator, rateLimit as expressRateLimit } from "express-rate-limit";
import { ZodError, type ZodTypeAny } from "zod";
import { AppError } from "../../lib/errors";
import { sendFailure } from "../../lib/respond";

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming?.trim().slice(0, 80) || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startedAt = performance.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        level: "info",
        type: "http",
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      }),
    );
  });

  next();
}

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  sendFailure(res, 404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} does not exist.`);
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError) {
    sendFailure(
      res,
      422,
      "VALIDATION_ERROR",
      error.issues[0]?.message ?? "Check the submitted details and try again.",
      error.flatten(),
    );
    return;
  }

  if (error instanceof AppError) {
    sendFailure(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  console.error(
    JSON.stringify({
      level: "error",
      type: "unhandled",
      requestId: res.locals.requestId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
  );
  sendFailure(res, 500, "INTERNAL_ERROR", "Something went wrong on our side. Please try again.");
}

export function rateLimiter(options: {
  windowMs: number;
  limit: number;
  message: string;
  keyPrefix?: string;
}) {
  return expressRateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) =>
      `${options.keyPrefix ?? "rl"}:${ipKeyGenerator(req.ip ?? "unknown")}`,
    handler: (_req, res) => {
      sendFailure(res, 429, "RATE_LIMITED", options.message);
    },
  });
}
