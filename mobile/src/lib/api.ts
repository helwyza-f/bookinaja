import { env } from "@/lib/env";
import { getAdminToken, getCustomerToken } from "@/lib/session";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type Audience = "admin" | "customer" | "none";

type RequestOptions = RequestInit & {
  audience?: Audience;
};

async function resolveToken(audience: Audience) {
  if (audience === "admin") return getAdminToken();
  if (audience === "customer") return getCustomerToken();
  return null;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  const { audience = "none", headers, body, ...rest } = options;
  const token = await resolveToken(audience);
  const nextHeaders = new Headers(headers || {});

  if (body && !(body instanceof FormData) && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...rest,
    body,
    headers: nextHeaders,
  });

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : null) || `HTTP ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
