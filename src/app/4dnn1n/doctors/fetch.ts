import { apiFetch, csrf } from "@/lib/api";

export type ApiDoctor = {
  id: number;
  name: string;
  lastname: string;
  specialty_id: number;
  city_id: number;
  phone: string;
  movil: string;
  email?: string | null;
  address: string;
  secretary_name: string;
  value_agreement: number;
  state: number;
  specialty?: { id: number; name: string };
  city?: { id: number; name: string; department_id?: number };
};

export async function getDoctors({
  page = 1,
  per_page = 20,
  search = "",
  stade = "",
  department_id,
  city_id,
  specialty_id,
}: {
  page?: number;
  per_page?: number;
  search?: string;
  stade?: string;
  department_id?: string | number;
  city_id?: string | number;
  specialty_id?: string | number;
} = {}): Promise<{
  data: ApiDoctor[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", String(per_page));
  if (search) params.set("search", search);
  if (stade) params.set("state", stade); // Usamos state internamente para la API de doctores
  if (department_id) params.set("department_id", String(department_id));
  if (city_id) params.set("city_id", String(city_id));
  if (specialty_id) params.set("specialty_id", String(specialty_id));

  const res = await apiFetch<{
    message: string;
    data: ApiDoctor[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/api/doctors?${params.toString()}`);

  return {
    data: res.data ?? [],
    meta: res.meta ?? { current_page: 1, last_page: 1, per_page: 20, total: 0 },
  };
}

export async function createDoctor(data: Partial<ApiDoctor>): Promise<ApiDoctor> {
  await csrf();
  const res = await apiFetch<{ message: string; data: ApiDoctor }>("/api/doctors", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function getDoctor(id: number): Promise<ApiDoctor> {
  const res = await apiFetch<{ message: string; data: ApiDoctor }>(`/api/doctors/${id}`);
  return res.data;
}

export async function updateDoctor(id: number, data: Partial<ApiDoctor>): Promise<ApiDoctor> {
  await csrf();
  const res = await apiFetch<{ message: string; data: ApiDoctor }>(`/api/doctors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateDoctorState(id: number, state: 1 | 2): Promise<ApiDoctor> {
  await csrf();
  return updateDoctor(id, { state });
}

export async function deleteDoctor(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/doctors/${id}`, {
    method: "DELETE",
  });
}
