import { apiFetch, csrf } from "@/lib/api";

export type ApiSpecialty = {
  id: number;
  name: string;
  state: number;
};

export async function getSpecialties(): Promise<ApiSpecialty[]> {
  const res = await apiFetch<{ message: string; data: ApiSpecialty[] }>("/api/specialties");
  return res.data ?? [];
}

export async function createSpecialty(data: Partial<ApiSpecialty>): Promise<ApiSpecialty> {
  await csrf();
  const res = await apiFetch<{ message: string; data: ApiSpecialty }>("/api/specialties", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function getSpecialty(id: number): Promise<ApiSpecialty> {
  const res = await apiFetch<{ message: string; data: ApiSpecialty }>(`/api/specialties/${id}`);
  return res.data;
}

export async function updateSpecialty(id: number, data: Partial<ApiSpecialty>): Promise<ApiSpecialty> {
  await csrf();
  const res = await apiFetch<{ message: string; data: ApiSpecialty }>(`/api/specialties/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateSpecialtyState(id: number, state: 0 | 1): Promise<ApiSpecialty> {
  await csrf();
  return updateSpecialty(id, { state });
}

export async function deleteSpecialty(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/specialties/${id}`, {
    method: "DELETE",
  });
}
