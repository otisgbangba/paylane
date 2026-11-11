import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ApiResponse, UserDTO } from "@paylane/shared";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export async function serverFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      cookie: cookieStore.toString(),
      ...init.headers,
    },
    cache: "no-store",
  });

  return (await response.json()) as ApiResponse<T>;
}

export async function getSessionUser(): Promise<UserDTO | null> {
  try {
    const response = await serverFetch<{ user: UserDTO }>("/auth/me");
    return response.success ? response.data.user : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<UserDTO> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function fetchData<T>(path: string): Promise<T | null> {
  try {
    const response = await serverFetch<T>(path);
    return response.success ? response.data : null;
  } catch {
    return null;
  }
}
