import type { Response } from "express";
import type { ApiFailure, ApiSuccess } from "@paylane/shared";

export function responseMeta(res: Response) {
  return {
    requestId: String(res.locals.requestId ?? "unknown"),
    timestamp: new Date().toISOString(),
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Request completed.",
  options: { status?: "success" | "pending"; httpStatus?: number } = {},
): void {
  const payload: ApiSuccess<T> = {
    success: true,
    status: options.status ?? "success",
    message,
    data,
    meta: responseMeta(res),
  };
  res.status(options.httpStatus ?? 200).json(payload);
}

export function sendFailure<T = unknown>(
  res: Response,
  httpStatus: number,
  code: string,
  message: string,
  details?: unknown,
  data?: T,
): void {
  const payload: ApiFailure<T> = {
    success: false,
    status: "failed",
    message,
    error: { code, details },
    meta: responseMeta(res),
    ...(data !== undefined ? { data } : {}),
  };
  res.status(httpStatus).json(payload);
}
