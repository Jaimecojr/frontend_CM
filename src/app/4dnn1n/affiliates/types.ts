import type { Department, City } from "@/types/geo";

export type { Department, City };

export type ApiBeneficiary = {
  id?: number;
  name: string;
  id_card?: string;
  bithdate?: string | null;
};

export type ApiAffiliate = {
  id: number;
  counselor_id: number;
  contract_code: string;
  name: string;
  lastname: string;
  bithdate?: string | null;
  id_card: string;
  phone?: string | null;
  movil?: string | null;
  address: string;
  city_id: number;
  email: string;
  validity: string;
  agreement_id: number;
  company: string;
  photo?: string | null;
  photo_rename?: string | null;
  validity_end: string;
  payment_date?: string | null;
  value?: number | null;
  balance?: number | null;
  commission?: number | null;
  payment_commission?: "si" | "no" | null;
  stade?: number | null;
  carnet: "si" | "no";
  state: number;
  user_id: number;

  // relationships
  city?: { id: number; name: string; department_id?: number } | null;
  counselor?: { id: number; name: string; lastname: string } | null;
  agreement?: { id: number; name: string } | null;
  user?: { id: number; name: string } | null;
  beneficiaries?: ApiBeneficiary[];

  created_at?: string;
  updated_at?: string;
};

export type FranchiseOption = { id: number; name: string };
export type CounselorOption = { id: number; name: string; lastname: string };
export type AgreementOption = { id: number; name: string; amount?: number };

export type AffiliateMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AffiliatesResponse = {
  data: ApiAffiliate[];
  meta: AffiliateMeta;
};

// Create / Update
export type CreateAffiliatePayload = {
  counselor_id: number;
  contract_code?: string;
  name: string;
  lastname: string;
  bithdate?: string | null;
  id_card: string;
  phone?: string | null;
  movil?: string | null;
  address?: string;
  city_id: number;
  email?: string;
  validity: string;
  agreement_id: number;
  company?: string;
  photo?: string | null;
  photo_rename?: string | null;
  validity_end: string;
  payment_date: string;
  value: number;
  balance: number;
  commission: number;
  payment_commission: "si" | "no";
  stade?: number | null;
  carnet: "si" | "no";
  state: number;
  user_id: number;
  beneficiaries?: ApiBeneficiary[];
};

// Renovation
export type CreateRenovationPayload = {
  affiliate_id: number;
  date_ini: string;
  date_end: string;
  date_payment: string;
  value: number;
};

// Affiliates expiring today (for the dashboard)
export type ExpiringAffiliate = Pick<ApiAffiliate, 'id' | 'name' | 'lastname' | 'id_card' | 'validity_end' | 'movil' | 'phone'> & {
  counselor?: { id: number; name: string; lastname: string } | null;
  agreement?: { id: number; name: string } | null;
};

export type ExpiringTodayResponse = {
  data: ExpiringAffiliate[];
  date: string;
};

// ─── Affiliate notes ────────────────────────────────────────────────────────

export type ApiAffiliateNote = {
  id: number;
  affiliate_id: number;
  user_id: number;
  body: string;
  created_at: string;
  user?: { id: number; name: string };
};
