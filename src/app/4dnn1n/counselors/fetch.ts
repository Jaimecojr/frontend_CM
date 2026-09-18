import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

export type CounselorTypeContra =
  | "Término Fijo"
  | "Término Indefinido"
  | "Corretaje"
  | "Con Garantizado";

export type ApiCounselor = {
  id: number;
  name: string;
  lastname: string;
  id_card: string;
  address?: string | null;
  date_admission?: string | null; // YYYY-MM-DD
  type_contra: CounselorTypeContra | string;

  email?: string | null;
  rol?: string | null;
  phone?: string | null;
  movil?: string | null;

  password?: string; // Should NOT come back, but we leave it optional for typing purposes
  state: number; // 1/2

  city_id: number;
  user_id: number;

  city?: { id: number; name: string; department_id?: number } | null;
  user?: { id: number; name: string } | null;
};

import type { Department, City } from "@/types/geo";
export type { Department, City };

type ApiResponse<T> = { message: string; data: T };

export async function getCounselors(): Promise<ApiCounselor[]> {
  return memCache.get("counselors:all", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<ApiCounselor[]>>("/api/counselors");
    return res.data ?? [];
  });
}

export async function getCounselor(id: number): Promise<ApiCounselor> {
  const res = await apiFetch<ApiResponse<ApiCounselor>>(`/api/counselors/${id}`);
  return res.data;
}

export { getDepartments, getCitiesByDepartment } from "@/lib/geo";

export type CreateCounselorPayload = {
  name: string;
  lastname: string;
  id_card: string;

  address?: string | null;
  date_admission?: string | null;
  // Widened to accept a plain string: `ApiCounselor.type_contra` also accepts
  // a plain string to represent legacy values read from the backend that may
  // not match the current fixed options list. Written as `| (string & {})`
  // instead of `| string` so TypeScript doesn't collapse the union down to
  // plain `string` — the literal members of `CounselorTypeContra` still show
  // up in autocomplete, while any other string remains assignable.
  type_contra: CounselorTypeContra | (string & {});

  email?: string | null;
  // Widened to `| null`: CounselorForm never lets the user set a password
  // here (advisor accounts don't manage credentials through this form) and
  // always sends `null` explicitly.
  password: string | null;

  // Widened to include `number`: CounselorForm always sends the literal `0`
  // (see the "rol always 0" comment in CounselorForm.tsx) — the backend
  // field predates this form and used to be a free string.
  rol?: string | number | null;
  phone?: string | null;
  movil?: string | null;

  state?: 1 | 2;

  city_id: number;
  user_id: number; // franchise
};

export async function createCounselor(payload: CreateCounselorPayload) {
  await csrf();
  const result = await apiFetch<ApiResponse<ApiCounselor>>("/api/counselors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("counselors:");
  return result;
}

export type UpdateCounselorPayload = Partial<Omit<CreateCounselorPayload, "password">> & {
  password?: string | null; // optional when editing
};

export async function updateCounselor(id: number, payload: UpdateCounselorPayload) {
  await csrf();
  const result = await apiFetch<ApiResponse<ApiCounselor>>(`/api/counselors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("counselors:");
  return result;
}

export async function updateCounselorState(id: number, state: 1 | 2) {
  await csrf();
  const result = await apiFetch<ApiResponse<ApiCounselor>>(`/api/counselors/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ state }),
  });
  memCache.invalidatePrefix("counselors:");
  return result;
}

//Check id card
type CheckIdCardResponse = { exists: boolean; message?: string };

export async function checkCounselorIdCard(id_card: string, ignore_id?: number) {
  const params = new URLSearchParams();
  params.set("id_card", id_card);
  if (ignore_id) params.set("ignore_id", String(ignore_id));

  return apiFetch<CheckIdCardResponse>(`/api/counselors/check-id-card?${params.toString()}`);
}

//Query active franchises
export type FranchiseOption = {
  id: number;
  name: string;
};

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  return memCache.get("franchises:active", TTL_CATALOG, async () => {
    const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
    return res.data ?? [];
  });
}
