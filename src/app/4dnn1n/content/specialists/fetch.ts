import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

export type ApiSpecialist = {
  id: number;
  name: string;
  specialty: string;
  photo: string;
  photo_filename: string;
  position: number;
  created_at?: string;
  updated_at?: string;
};

type ApiResponse<T> = { message: string; data: T };

export async function getSpecialists(): Promise<ApiSpecialist[]> {
  return memCache.get("content-specialists:all", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<ApiSpecialist[]>>("/api/content-specialists");
    return res.data ?? [];
  });
}

export async function createSpecialist(formData: FormData): Promise<ApiSpecialist> {
  await csrf();
  const res = await apiFetch<ApiResponse<ApiSpecialist>>("/api/content-specialists", {
    method: "POST",
    body: formData,
  });
  memCache.invalidatePrefix("content-specialists:");
  return res.data;
}

export async function updateSpecialist(id: number, formData: FormData): Promise<ApiSpecialist> {
  await csrf();
  formData.append("_method", "PUT");
  const res = await apiFetch<ApiResponse<ApiSpecialist>>(`/api/content-specialists/${id}`, {
    method: "POST",
    body: formData,
  });
  memCache.invalidatePrefix("content-specialists:");
  return res.data;
}

export async function deleteSpecialist(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/content-specialists/${id}`, { method: "DELETE" });
  memCache.invalidatePrefix("content-specialists:");
}

export async function reorderSpecialists(
  items: { id: number; position: number }[],
): Promise<void> {
  await csrf();
  await apiFetch("/api/content-specialists/reorder", {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
  memCache.invalidatePrefix("content-specialists:");
}
