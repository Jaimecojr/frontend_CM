import { apiFetch, csrf, getXsrfToken } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ApiAlly = {
  id: number;
  image: string;
  image_filename: string;
  url: string;
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

export async function getAllies(): Promise<ApiAlly[]> {
  return memCache.get("content-allies:all", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<ApiAlly[]>>("/api/content-allies");
    return res.data ?? [];
  });
}

export async function createAlly(formData: FormData): Promise<ApiAlly> {
  await csrf();
  const res = await apiFetchFormData<ApiResponse<ApiAlly>>(
    "/api/content-allies",
    "POST",
    formData,
  );
  memCache.invalidatePrefix("content-allies:");
  return res.data;
}

export async function updateAlly(id: number, formData: FormData): Promise<ApiAlly> {
  await csrf();
  formData.append("_method", "PUT");
  const res = await apiFetchFormData<ApiResponse<ApiAlly>>(
    `/api/content-allies/${id}`,
    "POST",
    formData,
  );
  memCache.invalidatePrefix("content-allies:");
  return res.data;
}

export async function deleteAlly(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/content-allies/${id}`, { method: "DELETE" });
  memCache.invalidatePrefix("content-allies:");
}

export async function reorderAllies(
  items: { id: number; position: number }[],
): Promise<void> {
  await csrf();
  await apiFetch("/api/content-allies/reorder", {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
  memCache.invalidatePrefix("content-allies:");
}
