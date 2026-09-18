import { apiFetch } from "@/lib/api";
import { memCache, TTL_GEO } from "@/lib/memCache";
import type { Department, City } from "@/types/geo";

export type { Department, City } from "@/types/geo";

type ApiResponse<T> = { message: string; data: T };

/**
 * Departments and cities used by the location selectors across several
 * modules (affiliates, agreements, appointments, counselors, franchises,
 * doctors). Lives here — not inside any single domain module — because
 * 6+ modules consume it equally; nesting it inside one of them would
 * reintroduce a cross-module dependency (see `DoctorForm.tsx`, which used
 * to import these from `counselors/fetch.ts`).
 */
export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
    return res.data ?? [];
  });
}

export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  return memCache.get(`cities:${departmentId}`, TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<City[]>>(`/api/departments/${departmentId}/cities`);
    return res.data ?? [];
  });
}
