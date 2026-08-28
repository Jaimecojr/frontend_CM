import type { Department, City } from "@/types/geo";

export type { Department, City };

export type ApiAppointment = {
  id: number;
  afi_code: number;
  doctor_id: number;
  date: string;
  hour: string;
  address: string;
  city_id: number;
  phone: string;
  value: number;
  /** 1 = policyholder (affiliate), 2 = beneficiary */
  type: 1 | 2;
  name: string;
  user_id: number;

  // relationships
  doctor?: { id: number; name: string; lastname: string; specialty_id?: number } | null;
  city?: { id: number; name: string } | null;
  user?: { id: number; name: string } | null;
  /** policyholder or beneficiary depending on type — normalized in the backend */
  owner?: { id: number; name: string; lastname?: string; id_card?: string } | null;
  /** id of the policyholder affiliate (for the edit form) */
  affiliate_id?: number | null;

  created_at?: string;
  updated_at?: string;
};

export type AppointmentMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AppointmentsResponse = {
  data: ApiAppointment[];
  meta: AppointmentMeta;
};

export type CreateAppointmentPayload = {
  afi_code: number;
  doctor_id: number;
  date: string;
  hour: string;
  address: string;
  city_id: number;
  phone: string;
  value: number;
  type: 1 | 2;
  name: string;
  user_id: number;
};

export type AffiliateBeneficiary = {
  id: number;
  name: string;
  id_card?: string | null;
};

export type AffiliateForAppointment = {
  id: number;
  name: string;
  lastname: string;
  id_card: string;
  movil?: string | null;
  phone?: string | null;
  stade: number;
  validity_end: string;
  beneficiaries?: AffiliateBeneficiary[];
};

export type SpecialtyOption = { id: number; name: string };

export type DoctorForAppointment = {
  id: number;
  name: string;
  lastname: string;
  address: string;
  city_id: number;
  city?: { id: number; name: string; department_id?: number } | null;
  value_agreement: number;
  movil?: string | null;
};
