"use client";

import type { ApiFailure, ApiResponse } from "@paylane/shared";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
}

function networkFailure<T>(message: string): ApiFailure<T> {
  return {
    success: false,
    status: "failed",
    message,
    error: { code: "NETWORK_ERROR" },
    meta: { requestId: "offline", timestamp: new Date().toISOString() },
  };
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api/v1${path}`, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.idempotencyKey ? { "idempotency-key": options.idempotencyKey } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
    if (!payload) {
      return networkFailure("Paylane returned an unreadable response. Please try again.");
    }
    return payload;
  } catch {
    return networkFailure("Cannot reach Paylane right now. Check your connection and try again.");
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
