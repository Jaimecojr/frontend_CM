/**
 * Row shape for the Citas report, as returned by GET /api/reports/appointments.
 * `name` already carries the "(Titular)"/"(Beneficiario)" suffix from the
 * backend — this report never recomputes that distinction on the frontend.
 */
export type ApiAppointmentReportRow = {
  id: number;
  name: string;
  doctor: string | null;
  city: string | null;
  date: string;
};

export type AppointmentsMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type AppointmentsReportResponse = { data: ApiAppointmentReportRow[]; meta: AppointmentsMeta };

/** A doctor as offered by the "Médico" filter — reuses the general active-doctors catalog. */
export type DoctorOption = { id: number; name: string; lastname: string };
