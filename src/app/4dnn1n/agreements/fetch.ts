import { apiFetch, csrf } from "@/lib/api";

export type ApiAgreement = {
  id: number;
  name: string;
  amount: number;
  state: number;
  city_id: number;

  city?: { id: number; name: string; department_id?: number } | null;
};

export type Department = { id: number; name: string };
export type City = { id: number; name: string; department_id: number };

type ApiResponse<T> = { message: string; data: T };

export async function getAgreements(): Promise<ApiAgreement[]> {
  const res = await apiFetch<ApiResponse<ApiAgreement[]>>("/api/agreements");
  return res.data ?? [];
}

export async function getAgreement(id: number): Promise<ApiAgreement> {
  const res = await apiFetch<ApiResponse<ApiAgreement>>(`/api/agreements/${id}`);
  return res.data;
}

export async function getDepartments(): Promise<Department[]> {
  const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
  return res.data ?? [];
}

export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  const res = await apiFetch<ApiResponse<City[]>>(
    `/api/departments/${departmentId}/cities`,
  );
  return res.data ?? [];
}

export type CreateAgreementPayload = {
  name: string;
  amount: number;
  state: 1 | 0;
  city_id: number;
};

export async function createAgreement(payload: CreateAgreementPayload) {
  await csrf();
  return apiFetch<ApiResponse<ApiAgreement>>("/api/agreements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UpdateAgreementPayload = CreateAgreementPayload;

export async function updateAgreement(id: number, payload: UpdateAgreementPayload) {
  await csrf();
  return apiFetch<ApiResponse<ApiAgreement>>(`/api/agreements/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateAgreementState(agreement: ApiAgreement, newState: 1 | 0) {
  await csrf();
  const payload: UpdateAgreementPayload = {
    name: agreement.name,
    amount: agreement.amount,
    state: newState,
    city_id: agreement.city_id,
  };
  return apiFetch<ApiResponse<ApiAgreement>>(`/api/agreements/${agreement.id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
