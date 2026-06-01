import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_LIST } from "@/lib/memCache";

export type ApiContact = {
  id: number;
  name: string;
  email: string;
  phone: string;
  city_id: number;
  subject: string;
  comment: string;
  created_at: string;
  updated_at: string;
  city?: { id: number; name: string } | null;
};

export type ContactMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ApiResponse<T> = { message: string; data: T };
type ListResponse = { data: ApiContact[]; meta: ContactMeta };

export async function getContacts(params?: {
  search?: string;
  page?: number;
  per_page?: number;
}): Promise<ListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const key = `contacts:list:${query}`;
  return memCache.get(key, TTL_LIST, async () => {
    const res = await apiFetch<{ message: string; data: ApiContact[]; meta: ContactMeta }>(
      `/api/contacts${query}`,
    );
    return { data: res.data ?? [], meta: res.meta };
  });
}

export async function getContact(id: number): Promise<ApiContact> {
  const res = await apiFetch<ApiResponse<ApiContact>>(`/api/contacts/${id}`);
  return res.data;
}

export async function deleteContact(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/contacts/${id}`, { method: "DELETE" });
  memCache.invalidatePrefix("contacts:list:");
}
