import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_GEO, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";
import type {
  ApiAffiliate,
  Department,
  City,
  FranchiseOption,
  CounselorOption,
  AgreementOption,
  AffiliateMeta,
  AffiliatesResponse,
  CreateAffiliatePayload,
  CreateRenovationPayload,
  ExpiringAffiliate,
  ExpiringTodayResponse,
  ApiAffiliateNote,
} from "./types";

export type {
  ApiBeneficiary,
  ApiAffiliate,
  Department,
  City,
  FranchiseOption,
  CounselorOption,
  AgreementOption,
  AffiliateMeta,
  AffiliatesResponse,
  CreateAffiliatePayload,
  CreateRenovationPayload,
  ExpiringAffiliate,
  ExpiringTodayResponse,
  ApiAffiliateNote,
} from "./types";

type ApiResponse<T> = { message: string; data: T };

export async function getAffiliates(params?: {
  stade?: string;
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<AffiliatesResponse> {
  const qs = new URLSearchParams();
  if (params?.stade !== undefined && params.stade !== "all") qs.set("stade", params.stade);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const key = `affiliates:list:${query}`;
  return memCache.get(key, TTL_LIST, async () => {
    const res = await apiFetch<{ message: string; data: ApiAffiliate[]; meta: AffiliateMeta }>(
      `/api/affiliates${query}`,
    );
    return { data: res.data ?? [], meta: res.meta };
  });
}

export async function getAffiliate(id: number): Promise<ApiAffiliate> {
  const res = await apiFetch<ApiResponse<ApiAffiliate>>(
    `/api/affiliates/${id}`,
  );
  return res.data;
}

export async function updateAffiliateState(id: number, stade: 1 | 2) {
  await csrf();
  const result = apiFetch<ApiResponse<ApiAffiliate>>(`/api/affiliates/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ stade }),
  });
  memCache.invalidatePrefix("affiliates:list:");
  return result;
}

// Helpers for combo boxes
export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
    return res.data ?? [];
  });
}

export async function getCitiesByDepartment(
  departmentId: number,
): Promise<City[]> {
  return memCache.get(`cities:${departmentId}`, TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<City[]>>(
      `/api/departments/${departmentId}/cities`,
    );
    return res.data ?? [];
  });
}

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  return memCache.get("franchises:active", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<FranchiseOption[]>>("/api/users/active");
    return res.data ?? [];
  });
}

export async function getActiveCounselors(): Promise<CounselorOption[]> {
  return memCache.get("counselors:active", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<CounselorOption[]>>("/api/counselors/active");
    return res.data ?? [];
  });
}

export async function getActiveAgreements(): Promise<AgreementOption[]> {
  return memCache.get("agreements:active", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<AgreementOption[]>>("/api/agreements/active");
    return res.data ?? [];
  });
}

// Validate id card
type CheckIdCardResponse = { exists: boolean; message?: string };
export async function checkAffiliateIdCard(
  id_card: string,
  ignore_id?: number,
) {
  const params = new URLSearchParams();
  params.set("id_card", id_card);
  if (ignore_id) params.set("ignore_id", String(ignore_id));
  return apiFetch<CheckIdCardResponse>(
    `/api/affiliates/check-id-card?${params.toString()}`,
  );
}

// Create / Update
export async function createAffiliate(payload: CreateAffiliatePayload) {
  await csrf();
  const result = apiFetch<ApiResponse<ApiAffiliate>>("/api/affiliates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("affiliates:list:");
  return result;
}

export async function updateAffiliate(
  id: number,
  payload: Partial<CreateAffiliatePayload>,
) {
  await csrf();
  const result = apiFetch<ApiResponse<ApiAffiliate>>(`/api/affiliates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("affiliates:list:");
  return result;
}

// Renovation
export async function createRenovation(payload: CreateRenovationPayload) {
  await csrf();
  return apiFetch<ApiResponse<any>>("/api/renovations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Affiliates expiring today (for the dashboard)
export async function getExpiringToday(): Promise<ExpiringTodayResponse> {
  return memCache.get('affiliates:expiring-today', TTL_LIST, async () => {
    const res = await apiFetch<{ message: string; data: ExpiringAffiliate[]; date: string }>(
      '/api/affiliates/expiring-today',
    );
    return { data: res.data ?? [], date: res.date };
  });
}

// ─── Affiliate notes ────────────────────────────────────────────────────────

export async function getAffiliateNotes(affiliateId: number): Promise<ApiAffiliateNote[]> {
  const res = await apiFetch<ApiResponse<ApiAffiliateNote[]>>(`/api/affiliates/${affiliateId}/notes`);
  return res.data ?? [];
}

export async function createAffiliateNote(affiliateId: number, body: string): Promise<ApiAffiliateNote> {
  await csrf();
  const res = await apiFetch<ApiResponse<ApiAffiliateNote>>(`/api/affiliates/${affiliateId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.data;
}

export async function deleteAffiliateNote(affiliateId: number, noteId: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/affiliates/${affiliateId}/notes/${noteId}`, { method: "DELETE" });
}

export async function sendCarnet(id: number): Promise<{ message: string; data?: unknown; error?: unknown }> {
  await csrf();
  return apiFetch<{ message: string; data?: unknown; error?: unknown }>(
    `/api/affiliates/${id}/carnet`,
    { method: "POST" },
  );
}

export async function markMembershipFormConverted(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/membership-forms/${id}/convert`, { method: "PATCH" });
  memCache.invalidatePrefix("membership-forms:list:");
}
