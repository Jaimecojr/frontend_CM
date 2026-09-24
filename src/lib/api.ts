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

// Caches the CSRF request promise: while the session stays active,
// the XSRF-TOKEN cookie remains valid, so there's no need to request it
// again before each individual mutation.
let csrfPromise: Promise<void> | null = null;

export function csrf(): Promise<void> {
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_URL}/sanctum/csrf-cookie`, {
      method: "GET",
      credentials: "include",
    })
      .then(() => undefined)
      .catch((err) => {
        csrfPromise = null;
        throw err;
      });
  }
  return csrfPromise;
}

// Invalidates the cached CSRF cookie — used when the backend responds 419
// (expired or invalid CSRF token), to force requesting it again once.
// Exported so other fetch-based helpers that can't go through apiFetch
// (e.g. `downloadFile`, which needs a raw binary response) can mirror this
// exact self-heal instead of duplicating the retry logic themselves.
export function resetCsrf() {
  csrfPromise = null;
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  // A FormData body (file uploads) must NOT get an explicit Content-Type —
  // the browser sets its own `multipart/form-data; boundary=...` only when
  // the header is left unset.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        // Content-Type is only sent on requests with a body — on a GET
        // this header isn't necessary and triggers an extra CORS preflight.
        ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
        "X-XSRF-TOKEN": getXsrfToken() ?? "",
        ...(options.headers || {}),
      },
    });

  let res = await doFetch();

  if (res.status === 419) {
    resetCsrf();
    await csrf();
    res = await doFetch();
  }

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    const errorData = data as ApiErrorData;
    const message = errorData?.message || `Error ${res.status} al consumir API`;
    throw new ApiError(message, res.status, errorData);
  }

  return data as T;
}
