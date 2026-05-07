import { API_BASE_URL } from "@/constants/app";
import { useSessionStore } from "@/stores/session-store";

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildURL(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path.replace(/^\//, ""), `${API_BASE_URL}/`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const session = useSessionStore.getState();
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  }

  if (session.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  if (session.tenantSlug) {
    headers.set("X-Tenant-Slug", session.tenantSlug);
  }

  const response = await fetch(buildURL(path, options.query), {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: string }).error || "Request failed")
        : "Request failed",
    );
  }

  return payload as T;
}
