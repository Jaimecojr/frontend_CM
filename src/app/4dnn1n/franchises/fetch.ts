import { apiFetch, csrf } from "@/lib/api";

export enum FranchiseType {
  SuperAdmin = 1,
  Admin = 2,
  Asesor = 3,
}

export type ApiFranchise = {
  id: number;
  nit: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  movil?: string | null;
  address?: string | null;
  date_afi?: string | null; // "YYYY-MM-DD"
  email: string;
  user: string;
  state: number; // 1/2
  type: FranchiseType | number | string;
  city_id?: number | null;
  city?: { id: number; name: string; department_id?: number } | null;
};

export type Department = { id: number; name: string };
export type City = { id: number; name: string; department_id: number };

type ApiResponse<T> = { message: string; data: T };

export async function getFranchises(): Promise<ApiFranchise[]> {
  const res = await apiFetch<ApiResponse<any[]>>("/api/users");
  const data = (res.data ?? []) as any[];

  return data
    .map((u) => ({ ...u, type: Number(u.type) as FranchiseType }))
    .filter((u) => u.type !== FranchiseType.SuperAdmin);
}

export async function getFranchise(id: number): Promise<ApiFranchise> {
  const res = await apiFetch<ApiResponse<ApiFranchise>>(`/api/users/${id}`);
  return res.data;
}

export async function getDepartments(): Promise<Department[]> {
  const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
  return res.data ?? [];
}

export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  const res = await apiFetch<ApiResponse<City[]>>(`/api/departments/${departmentId}/cities`);
  return res.data ?? [];
}

export type CreateFranchisePayload = {
  nit: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  movil?: string | null;
  address?: string | null;
  date_afi?: string | null;
  email: string;
  user: string;
  password: string;
  state?: 1 | 2;
  city_id: number;
  type?: 1 | 2 | 3; // backend default 2
};

export async function createUser(payload: CreateFranchisePayload) {
  await csrf();
  return apiFetch<ApiResponse<ApiFranchise>>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type UpdateFranchisePayload = Partial<Omit<CreateFranchisePayload, "password">> & {
  password?: string; // opcional en editar
};

export async function updateFranchise(id: number, payload: UpdateFranchisePayload) {
  await csrf();
  return apiFetch<ApiResponse<ApiFranchise>>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateFranchiseState(id: number, state: 1 | 2) {
  await csrf();
  return apiFetch<ApiResponse<ApiFranchise>>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ state }),
  });
}
