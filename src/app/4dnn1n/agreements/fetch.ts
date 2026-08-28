import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_GEO, TTL_CATALOG } from "@/lib/memCache";

export type ApiAgreement = {
  id: number;
  name: string;
  amount: number;
  state: number;
  city_id: number;

  city?: { id: number; name: string; department_id?: number } | null;
};

import type { Department, City } from "@/types/geo";
export type { Department, City };

type ApiResponse<T> = { message: string; data: T };

export async function getAgreements(): Promise<ApiAgreement[]> {
  return memCache.get("agreements:all", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<ApiAgreement[]>>("/api/agreements");
    return res.data ?? [];
  });
}

export async function getAgreement(id: number): Promise<ApiAgreement> {
  const res = await apiFetch<ApiResponse<ApiAgreement>>(`/api/agreements/${id}`);
  return res.data;
}

export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
    return res.data ?? [];
  });
}

export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  return memCache.get(`cities:${departmentId}`, TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<City[]>>(
      `/api/departments/${departmentId}/cities`,
    );
    return res.data ?? [];
  });
}

export type CreateAgreementPayload = {
  name: string;
  amount: number;
  state: 1 | 0;
  city_id: number;
};

export async function createAgreement(payload: CreateAgreementPayload) {
  await csrf();
  const result = await apiFetch<ApiResponse<ApiAgreement>>("/api/agreements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("agreements:");
  return result;
}

export type UpdateAgreementPayload = CreateAgreementPayload;

export async function updateAgreement(id: number, payload: UpdateAgreementPayload) {
  await csrf();
  const result = await apiFetch<ApiResponse<ApiAgreement>>(`/api/agreements/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("agreements:");
  return result;
}

export async function updateAgreementState(id: ApiAgreement["id"], agreement: ApiAgreement, newState: 1 | 0) {
  await csrf();
  const payload: UpdateAgreementPayload = {
    name: agreement.name,
    amount: agreement.amount,
    state: newState,
    city_id: agreement.city_id,
  };
  const result = await apiFetch<ApiResponse<ApiAgreement>>(`/api/agreements/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("agreements:");
  return result;
}
