import { apiFetch, csrf, getXsrfToken } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

async function apiFetchFormData<T = any>(
  path: string,
  method: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    body: formData,
    headers: {
      Accept: "application/json",
      "X-XSRF-TOKEN": getXsrfToken() ?? "",
    },
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(data?.message || `Error ${res.status}`);
  }
  return data as T;
}

export async function getSpecialists(): Promise<ApiSpecialist[]> {
  return memCache.get("content-specialists:all", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<ApiSpecialist[]>>("/api/content-specialists");
    return res.data ?? [];
  });
}

export async function createSpecialist(formData: FormData): Promise<ApiSpecialist> {
  await csrf();
  const res = await apiFetchFormData<ApiResponse<ApiSpecialist>>(
    "/api/content-specialists",
    "POST",
    formData,
  );
  memCache.invalidatePrefix("content-specialists:");
  return res.data;
}

export async function updateSpecialist(id: number, formData: FormData): Promise<ApiSpecialist> {
  await csrf();
  formData.append("_method", "PUT");
  const res = await apiFetchFormData<ApiResponse<ApiSpecialist>>(
    `/api/content-specialists/${id}`,
    "POST",
    formData,
  );
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
