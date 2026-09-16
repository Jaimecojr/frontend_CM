import { apiFetch, csrf, getXsrfToken } from "@/lib/api";
import { memCache, TTL_LIST, TTL_CATALOG } from "@/lib/memCache";
import type { AuthUser } from "@/context/AuthContext";

export { csrf, getXsrfToken };

//
// Get authenticated user
//
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>("/user");
  } catch {
    return null;
  }
}

//
// Logout
//
export async function logout() {
  return await apiFetch("/logout", { method: "POST" });
}

// ─── Dashboard Types ─────────────────────────────────────────────────────────

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
    const res = await apiFetch<{ message: string; data: TodayAppointment[]; date: string }>(
      '/api/appointments/today',
    );
    return { data: res.data ?? [], date: res.date };
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return memCache.get('dashboard:stats', TTL_CATALOG, async () => {
    const res = await apiFetch<{ message: string; data: DashboardStats }>('/api/dashboard/stats');
    return res.data;
  });
}

export async function getDashboardCharts(year: number): Promise<DashboardCharts> {
  return memCache.get(`dashboard:charts:${year}`, TTL_CATALOG, async () => {
    const res = await apiFetch<{ message: string; data: DashboardCharts }>(
      `/api/dashboard/charts?year=${year}`,
    );
    return res.data;
  });
}