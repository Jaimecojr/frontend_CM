import { apiFetch } from "@/lib/api";
import { toQueryString } from "../_lib/query";
import type { ApiAppointmentReportRow, AppointmentsReportResponse, DoctorOption } from "./types";

export type { ApiAppointmentReportRow, AppointmentsMeta, AppointmentsReportResponse, DoctorOption } from "./types";

/** Fetches one page of the Citas report for the given filters/page/per_page. */
export async function getAppointmentsReport(
  params: Record<string, string | number | undefined>,
): Promise<AppointmentsReportResponse> {
  const res = await apiFetch<{
    message: string;
    data: ApiAppointmentReportRow[];
    meta: AppointmentsReportResponse["meta"];
  }>(`/api/reports/appointments${toQueryString(params)}`);
  return { data: res.data ?? [], meta: res.meta };
}

/**
 * Fetches active doctors for the "Médico" filter. Reuses the general doctors
 * endpoint (no dedicated reports catalog exists for doctors) — revisit only
 * if a franchise's active-doctor count ever exceeds this fixed page size.
 */
export async function getActiveDoctors(): Promise<DoctorOption[]> {
  const res = await apiFetch<{ message: string; data: DoctorOption[] }>("/api/doctors?state=1&per_page=100");
  return res.data ?? [];
}
