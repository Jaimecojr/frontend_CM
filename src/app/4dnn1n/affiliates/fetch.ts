import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_GEO, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";

export type ApiBeneficiary = {
  id?: number;
  name: string;
  id_card?: string;
  bithdate?: string | null;
};

export type ApiAffiliate = {
  id: number;
  counselor_id: number;
  contract_code: string;
  name: string;
  lastname: string;
  bithdate?: string | null;
  id_card: string;
  phone?: string | null;
  movil?: string | null;
  address: string;
  city_id: number;
  email: string;
  validity: string;
  agreement_id: number;
  company: string;
  photo?: string | null;
  photo_rename?: string | null;
  validity_end: string;
  payment_date?: string | null;
  value?: number | null;
  balance?: number | null;
  commission?: number | null;
  payment_commission?: "si" | "no" | null;
  stade?: number | null;
  carnet: "si" | "no";
  state: number;
  user_id: number;

  // relationships
  city?: { id: number; name: string; department_id?: number } | null;
  counselor?: { id: number; name: string; lastname: string } | null;
  agreement?: { id: number; name: string } | null;
  user?: { id: number; name: string } | null;
  beneficiaries?: ApiBeneficiary[];

  created_at?: string;
  updated_at?: string;
};

export type Department = { id: number; name: string };
export type City = { id: number; name: string; department_id: number };
export type FranchiseOption = { id: number; name: string };
export type CounselorOption = { id: number; name: string; lastname: string };
export type AgreementOption = { id: number; name: string; amount?: number };

type ApiResponse<T> = { message: string; data: T };

export type AffiliateMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AffiliatesResponse = {
  data: ApiAffiliate[];
  meta: AffiliateMeta;
};

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

// Helpers para combos
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

// Validar cédula
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

// Crear / Actualizar
export type CreateAffiliatePayload = {
  counselor_id: number;
  contract_code?: string;
  name: string;
  lastname: string;
  bithdate?: string | null;
  id_card: string;
  phone?: string | null;
  movil?: string | null;
  address?: string;
  city_id: number;
  email?: string;
  validity: string;
  agreement_id: number;
  company?: string;
  photo?: string | null;
  photo_rename?: string | null;
  validity_end: string;
  payment_date: string;
  value: number;
  balance: number;
  commission: number;
  payment_commission: "si" | "no";
  stade?: number | null;
  carnet: "si" | "no";
  state: number;
  user_id: number;
  beneficiaries?: ApiBeneficiary[];
};

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

// Renovación
export type CreateRenovationPayload = {
  affiliate_id: number;
  date_ini: string;
  date_end: string;
  date_payment: string;
  value: number;
};

export async function createRenovation(payload: CreateRenovationPayload) {
  await csrf();
  return apiFetch<ApiResponse<any>>("/api/renovations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Afiliados que vencen hoy (para el dashboard)
export type ExpiringAffiliate = Pick<ApiAffiliate, 'id' | 'name' | 'lastname' | 'id_card' | 'validity_end' | 'movil' | 'phone'> & {
  counselor?: { id: number; name: string; lastname: string } | null;
  agreement?: { id: number; name: string } | null;
};

export type ExpiringTodayResponse = {
  data: ExpiringAffiliate[];
  date: string;
};

export async function getExpiringToday(): Promise<ExpiringTodayResponse> {
  return memCache.get('affiliates:expiring-today', TTL_LIST, async () => {
    const res = await apiFetch<{ message: string; data: ExpiringAffiliate[]; date: string }>(
      '/api/affiliates/expiring-today',
    );
    return { data: res.data ?? [], date: res.date };
  });
}

// ─── Notas de afiliado ────────────────────────────────────────────────────────

export type ApiAffiliateNote = {
  id: number;
  affiliate_id: number;
  user_id: number;
  body: string;
  created_at: string;
  user?: { id: number; name: string };
};

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
