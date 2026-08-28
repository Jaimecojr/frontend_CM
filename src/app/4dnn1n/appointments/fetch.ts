import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_GEO, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";
import type {
  ApiAppointment,
  AppointmentMeta,
  AppointmentsResponse,
  CreateAppointmentPayload,
  AffiliateForAppointment,
  SpecialtyOption,
  DoctorForAppointment,
  Department,
  City,
} from "./types";

export type {
  ApiAppointment,
  AppointmentMeta,
  AppointmentsResponse,
  CreateAppointmentPayload,
  AffiliateBeneficiary,
  AffiliateForAppointment,
  SpecialtyOption,
  DoctorForAppointment,
  Department,
  City,
} from "./types";

type ApiResponse<T> = { message: string; data: T };

// ─── List ──────────────────────────────────────────────────────────────────

export async function getAppointments(params?: {
  search?: string;
  page?: number;
  per_page?: number;
  date?: string;
  period?: string;
  [key: string]: unknown;
}): Promise<AppointmentsResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.date) qs.set("date", params.date);
  if (params?.period) qs.set("period", params.period);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return memCache.get(`appointments:list:${query}`, TTL_LIST, async () => {
    const res = await apiFetch<{ message: string; data: ApiAppointment[]; meta: AppointmentMeta }>(
      `/api/appointments${query}`,
    );
    return { data: res.data ?? [], meta: res.meta };
  });
}

export async function getAppointment(id: number): Promise<ApiAppointment> {
  const res = await apiFetch<ApiResponse<ApiAppointment>>(`/api/appointments/${id}`);
  return res.data;
}

// ─── Create / Update ────────────────────────────────────────────────────────

export async function createAppointment(payload: CreateAppointmentPayload): Promise<ApiAppointment> {
  await csrf();
  const res = await apiFetch<ApiResponse<ApiAppointment>>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("appointments:list:");
  return res.data;
}

export async function updateAppointment(id: number, payload: CreateAppointmentPayload): Promise<ApiAppointment> {
  await csrf();
  const res = await apiFetch<ApiResponse<ApiAppointment>>(`/api/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("appointments:list:");
  return res.data;
}

export async function deleteAppointment(id: number): Promise<void> {
  await csrf();
  await apiFetch(`/api/appointments/${id}`, { method: "DELETE" });
  memCache.invalidatePrefix("appointments:list:");
}

export async function getAffiliateForEdit(affiliateId: number): Promise<AffiliateForAppointment> {
  const res = await apiFetch<ApiResponse<AffiliateForAppointment>>(`/api/affiliates/${affiliateId}`);
  return res.data;
}

// ─── Affiliate search by id card (for the appointment form) ─────────────

export async function searchAffiliateByIdCard(idCard: string): Promise<AffiliateForAppointment> {
  const res = await apiFetch<ApiResponse<AffiliateForAppointment>>(
    `/api/affiliates/by-id-card?id_card=${encodeURIComponent(idCard)}`,
  );
  return res.data;
}

// ─── Active specialties (for the form selector) ─────────────────

export async function getActiveSpecialties(): Promise<SpecialtyOption[]> {
  return memCache.get("specialties:active", TTL_CATALOG, async () => {
    const res = await apiFetch<ApiResponse<(SpecialtyOption & { state: number })[]>>("/api/specialties");
    return (res.data ?? []).filter((s) => s.state === 1);
  });
}

// ─── Active doctors filtered by specialty ───────────────────────────────

export async function getDoctorsBySpecialty(specialtyId: number): Promise<DoctorForAppointment[]> {
  return memCache.get(`doctors:specialty:${specialtyId}`, TTL_CATALOG, async () => {
    const res = await apiFetch<{ message: string; data: DoctorForAppointment[] }>(
      `/api/doctors/by-specialty?specialty_id=${specialtyId}`,
    );
    return res.data ?? [];
  });
}

// ─── Departments and cities (for the city selector) ───────────────────

export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>("/api/departments");
    return res.data ?? [];
  });
}

export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  return memCache.get(`cities:${departmentId}`, TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<City[]>>(`/api/departments/${departmentId}/cities`);
    return res.data ?? [];
  });
}
