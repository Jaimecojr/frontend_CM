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

// Cachea la promesa de la petición CSRF: mientras la sesión siga activa,
// la cookie XSRF-TOKEN sigue siendo válida, así que no hace falta pedirla
// de nuevo antes de cada mutación individual.
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

// Invalida la cookie CSRF cacheada — se usa cuando el backend responde 419
// (token CSRF vencido o inválido), para forzar pedirla de nuevo una vez.
function resetCsrf() {
  csrfPromise = null;
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const llevaBody = method !== "GET" && method !== "HEAD";

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        // Solo se envía Content-Type en peticiones con body — en un GET
        // este header no es necesario y provoca un preflight CORS extra.
        ...(llevaBody ? { "Content-Type": "application/json" } : {}),
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

  const data = (await res.json().catch(() => ({}))) as any;

  if (!res.ok) {
    const message = data?.message || `Error ${res.status} al consumir API`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
