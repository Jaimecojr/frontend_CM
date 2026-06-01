const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ApiErrorData = {
  message?: string;
  errors?: Record<string, string[] | string>;
};

export class ApiError extends Error {
  status: number;
  data?: ApiErrorData;

  constructor(message: string, status: number, data?: ApiErrorData) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getXsrfToken() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function csrf() {
  await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    method: "GET",
    credentials: "include",
  });
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      // 🔥 Sanctum CSRF header (solo si existe cookie)
      "X-XSRF-TOKEN": getXsrfToken() ?? "",
      ...(options.headers || {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as any;

  if (!res.ok) {
    const message = data?.message || `Error ${res.status} al consumir API`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
