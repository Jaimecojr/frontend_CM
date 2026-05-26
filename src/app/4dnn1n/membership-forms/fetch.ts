import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_LIST } from "@/lib/memCache";

export type ApiMembershipFormBeneficiary = {
  id?: number;
  membership_form_id?: number;
  name: string;
};

export type ApiMembershipForm = {
  id: number;
  name: string;
  lastname: string;
  id_card: string;
  phone: string;
  email: string;
  bithdate?: string | null;
  address: string;
  city_id: number;
  date: string;
  seller: string;
  state: number;
  city?: { id: number; name: string; department_id?: number } | null;
  membership_form_beneficiaries?: ApiMembershipFormBeneficiary[];
  created_at?: string;
  updated_at?: string;
};

export type MembershipFormMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ApiResponse<T> = { message: string; data: T };
type ListResponse = { data: ApiMembershipForm[]; meta: MembershipFormMeta };

export async function getMembershipForms(params?: {
  search?: string;
  page?: number;
  per_page?: number;
  stade?: string;
}): Promise<ListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const key = `membership-forms:list:${query}`;
  return memCache.get(key, TTL_LIST, async () => {
    const res = await apiFetch<{ message: string; data: ApiMembershipForm[]; meta: MembershipFormMeta }>(
      `/api/membership-forms${query}`,
    );
    return { data: res.data ?? [], meta: res.meta };
  });
}

export async function getMembershipForm(id: number): Promise<ApiMembershipForm> {
  const res = await apiFetch<ApiResponse<ApiMembershipForm>>(`/api/membership-forms/${id}`);
  return res.data;
}

export async function deleteMembershipForm(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/membership-forms/${id}`, { method: "DELETE" });
  memCache.invalidatePrefix("membership-forms:list:");
}

export async function markMembershipFormConverted(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/membership-forms/${id}/convert`, { method: "PATCH" });
  memCache.invalidatePrefix("membership-forms:list:");
}
