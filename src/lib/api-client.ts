'use client';

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
};

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error: string }).error
        : response.statusText || "Request failed";

    throw new Error(errorMessage);
  }

  return payload as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const init: RequestInit = {
    method,
    headers: {
      ...(method !== "GET"
        ? { "Content-Type": "application/json" }
        : undefined),
      ...headers,
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(path, init);
  return handleResponse<T>(response);
}

