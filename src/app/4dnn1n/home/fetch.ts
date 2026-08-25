import { memCache, TTL_LIST, TTL_CATALOG } from "@/lib/memCache";
import type { AuthUser } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Cachea la promesa de la petición CSRF: mientras la sesión siga activa,
// la cookie XSRF-TOKEN sigue siendo válida, así que no hace falta pedirla
// de nuevo en cada llamada.
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

function resetCsrf() {
  csrfPromise = null;
}

//
// 🔥 Fetch para rutas protegidas (que YA NO tienen /api)
//
export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const llevaBody = method !== "GET" && method !== "HEAD";

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
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

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw { status: res.status, data };
  return data;
}

//
// 🔥 Obtener usuario autenticado
//
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    return await apiFetch("/user");
  } catch {
    return null;
  }
}

//
// 🔥 Logout
//
export async function logout() {
  return await apiFetch("/logout", {
    method: "POST",
    headers: {
      "X-XSRF-TOKEN": getXsrfToken() ?? "",
    },
  });
}

export function getXsrfToken() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ─── Tipos Dashboard ─────────────────────────────────────────────────────────

export type TodayAppointment = {
  id: number;
  name: string;
  hour: string;
  doctor: { id: number; name: string; lastname: string };
};

export type TodayAppointmentsResponse = {
  data: TodayAppointment[];
  date: string;
};

export type DashboardStats = {
  affiliates: {
    active: number;
    inactive: number;
    inactive_by_expiry: number;
  };
  appointments: {
    this_month: number;
  };
};

export type DashboardCharts = {
  appointments_by_month: number[];
  affiliates_by_month: number[];
  by_franchise?: {
    users: { id: number; name: string }[];
    appointments_by_franchise: number[][];
    affiliates_by_franchise: number[][];
  };
};

// ─── Fetch functions ─────────────────────────────────────────────────────────

export async function getTodayAppointments(): Promise<TodayAppointmentsResponse> {
  return memCache.get('appointments:today', TTL_LIST, async () => {
    const res = (await apiFetch('/api/appointments/today')) as { message: string; data: TodayAppointment[]; date: string };
    return { data: res.data ?? [], date: res.date };
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return memCache.get('dashboard:stats', TTL_CATALOG, async () => {
    const res = (await apiFetch('/api/dashboard/stats')) as { message: string; data: DashboardStats };
    return res.data;
  });
}

export async function getDashboardCharts(year: number): Promise<DashboardCharts> {
  return memCache.get(`dashboard:charts:${year}`, TTL_CATALOG, async () => {
    const res = (await apiFetch(`/api/dashboard/charts?year=${year}`)) as { message: string; data: DashboardCharts };
    return res.data;
  });
}