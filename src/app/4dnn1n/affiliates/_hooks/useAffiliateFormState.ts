"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addOneYear, getTodayString } from "@/lib/dates";
import { alert } from "@/lib/alert";
import type {
  ApiAffiliate,
  City,
  Department,
  FranchiseOption,
  CounselorOption,
  AgreementOption,
  ApiBeneficiary,
  CreateAffiliatePayload,
} from "../fetch";
import {
  getCitiesByDepartment,
  getDepartments,
  getActiveFranchises,
  getActiveCounselors,
  getActiveAgreements,
  checkAffiliateIdCard,
} from "../fetch";

export type AffiliateFormMode = "create" | "edit" | "view";

export type AffiliateSubmitPayload = CreateAffiliatePayload & {
  renovation?: {
    date_ini: string;
    date_end: string;
    date_payment: string;
    value: number;
  };
};

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

// Safe number formatter
function FormNumber(val: any, def: number) {
  if (val !== undefined && val !== null) return Number(val);
  return def;
}

type Args = {
  mode: AffiliateFormMode;
  initial?: Partial<ApiAffiliate>;
  onSubmit?: (payload: AffiliateSubmitPayload) => Promise<void>;
};

export function useAffiliateFormState({ mode, initial, onSubmit }: Args) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const affiliateId = Number(initial?.id ?? 0) || undefined;
  const initialIdCard = String(initial?.id_card ?? "");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [agreements, setAgreements] = useState<AgreementOption[]>([]);

  const [saving, setSaving] = useState(false);

  // id-card validation state
  const [idCardError, setIdCardError] = useState<string | null>(null);
  const [checkingIdCard, setCheckingIdCard] = useState(false);
  const lastCheckedRef = useRef<string>("");

  // Smart counselor search
  const [searchCounselor, setSearchCounselor] = useState("");
  const [showCounselors, setShowCounselors] = useState(false);

  // Validity dates
  const defaultToday = getTodayString();

  // Renovation state
  const [wantsRenovation, setWantsRenovation] = useState("no");
  const [renovationType, setRenovationType] = useState("vencimiento");
  const [renovationDateIni, setRenovationDateIni] = useState("");
  const [renovationValue, setRenovationValue] = useState("");
  const [renovationDatePayment, setRenovationDatePayment] = useState(getTodayString());

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    lastname: initial?.lastname ?? "",
    id_card: String(initial?.id_card ?? ""),
    address: initial?.address ?? "",
    bithdate: initial?.bithdate ?? "",
    phone: initial?.phone ?? "",
    movil: initial?.movil ?? "",
    email: initial?.email ?? "",

    city_id: initial?.city_id ?? "",
    user_id: initial?.user_id ?? "",
    agreement_id: initial?.agreement_id ?? "",
    counselor_id: initial?.counselor_id ?? "",

    validity: initial?.validity ?? defaultToday,
    validity_end: initial?.validity_end ?? addOneYear(defaultToday),
    payment_date: initial?.payment_date ?? defaultToday,
    balance: initial?.balance ?? 0,
    value: initial?.value ?? 0,
    commission: FormNumber(initial?.commission, 0),
    payment_commission: (initial?.payment_commission as "si" | "no") ?? "no",
    company: initial?.company ?? "",

    carnet: (initial?.carnet as "si" | "no") ?? "no",
    state: Number(initial?.state ?? 1),
    stade: Number(initial?.stade ?? 1),
    contract_code: initial?.contract_code ?? "",

    beneficiaries: (initial?.beneficiaries?.length
      ? initial.beneficiaries
      : [{ name: "" }]) as ApiBeneficiary[],
  });

  // Set counselor auto-search text initially
  useEffect(() => {
    if (initial?.counselor && initial.counselor.name) {
      setSearchCounselor(
        `${initial.counselor.name} ${initial.counselor.lastname}`,
      );
    }
  }, [initial]);

  // Auto-fill value from the agreement when creating
  useEffect(() => {
    if (isCreate && agreements.length > 0 && form.agreement_id) {
      const selected = agreements.find(a => a.id === Number(form.agreement_id));
      if (selected?.amount) {
        setForm(prev => ({ ...prev, value: selected.amount! }));
      }
    }
  }, [form.agreement_id, agreements, isCreate]);

  // Auto-fill renovation value from the agreement when editing
  useEffect(() => {
    if (isEdit && wantsRenovation === "si" && agreements.length > 0 && form.agreement_id) {
       const selected = agreements.find(a => a.id === Number(form.agreement_id));
       if (selected?.amount) {
          setRenovationValue(selected.amount.toString());
       }
    }
  }, [form.agreement_id, wantsRenovation, agreements, isEdit]);

  // Set renovation dates
  useEffect(() => {
    if (isEdit && wantsRenovation === "si") {
      if (renovationType === "vencimiento") {
        setRenovationDateIni(initial?.validity_end || form.validity_end || "");
      } else {
        setRenovationDateIni(getTodayString());
      }
    }
  }, [renovationType, wantsRenovation, initial?.validity_end, form.validity_end, isEdit]);

  // Load base info
  useEffect(() => {
    (async () => {
      try {
        const [listFranchises, listCounselors, listAgreements, deps] =
          await Promise.all([
            getActiveFranchises(),
            getActiveCounselors(),
            getActiveAgreements(),
            getDepartments(),
          ]);
        setFranchises(listFranchises);
        setCounselors(listCounselors);
        setAgreements(listAgreements);
        setDepartments(deps);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Preselect department from city.department_id (edit/view)
  useEffect(() => {
    const depFromCity = initial?.city?.department_id;
    if (depFromCity && departmentId === "") {
      setDepartmentId(Number(depFromCity));
    }
  }, [initial, departmentId]);

  // Load cities when department changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!departmentId) {
        setCities([]);
        setForm((p) => ({ ...p, city_id: "" }));
        return;
      }

      try {
        const list = await getCitiesByDepartment(Number(departmentId));
        if (cancelled) return;

        setCities(list);

        setForm((prev) => {
          const currentCity = prev.city_id ? Number(prev.city_id) : 0;
          const exists = currentCity && list.some((c) => c.id === currentCity);
          if (exists) return prev;

          const firstCityId = list[0]?.id ? String(list[0].id) : "";
          return { ...prev, city_id: firstCityId };
        });
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  // Id-card validator
  const validateIdCard = async (raw: string) => {
    const value = onlyDigits(raw);

    if (!value) {
      setIdCardError("El documento es obligatorio.");
      return false;
    }

    if (isEdit && value === onlyDigits(initialIdCard)) {
      setIdCardError(null);
      return true;
    }

    if (lastCheckedRef.current === value && idCardError === null) return true;

    setCheckingIdCard(true);
    try {
      const res = await checkAffiliateIdCard(value, affiliateId);
      lastCheckedRef.current = value;

      if (res.exists) {
        setIdCardError("Este documento ya existe en la base de datos.");
        return false;
      }

      setIdCardError(null);
      return true;
    } catch (e) {
      setIdCardError("No se pudo validar el documento.");
      return false;
    } finally {
      setCheckingIdCard(false);
    }
  };

  // Beneficiaries handler
  const addBeneficiary = () => {
    if (form.beneficiaries.length >= 7) return;
    setForm((p) => ({
      ...p,
      beneficiaries: [...p.beneficiaries, { name: "" }],
    }));
  };

  const removeBeneficiary = (index: number) => {
    if (form.beneficiaries.length <= 1) return;
    setForm((p) => {
      const b = [...p.beneficiaries];
      b.splice(index, 1);
      return { ...p, beneficiaries: b };
    });
  };

  const updateBeneficiaryName = (index: number, name: string) => {
    setForm((p) => {
      const b = [...p.beneficiaries];
      b[index].name = name;
      return { ...p, beneficiaries: b };
    });
  };

  // Counselor filtering (autocomplete)
  const filteredCounselors = useMemo(() => {
    const s = searchCounselor.toLowerCase();
    if (!s) return counselors;
    return counselors.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.lastname.toLowerCase().includes(s),
    );
  }, [counselors, searchCounselor]);

  // Block invalid submissions
  const canSubmit = useMemo(() => {
    if (isView) return false;

    if (!form.name || !form.lastname || !form.id_card) return false;
    if (!!idCardError) return false;

    // Mobile phone validation: exactly 10 digits
    if (!form.movil || form.movil.length !== 10) return false;

    if (!form.user_id) return false; // Franchise required
    if (!form.counselor_id) return false; // Counselor required
    if (!form.agreement_id) return false; // Agreement
    if (!departmentId || !form.city_id) return false; // City
    if (!form.email || !form.company) return false; // Email and Company are temporarily required in this view

    return true;
  }, [form, isView, departmentId, idCardError]);

  const submit = async () => {
    if (!onSubmit) return;

    const okId = await validateIdCard(form.id_card);
    if (!okId) {
      await alert.warn(
        "Identificación inválida",
        "Revisa el documento antes de guardar.",
      );
      return;
    }

    if (!canSubmit) {
      await alert.warn(
        "Faltan datos",
        "Revisa los campos obligatorios y asegúrate de que el celular tenga 10 dígitos elegidos.",
      );
      return;
    }

    // Prepare payload
    const payload: AffiliateSubmitPayload = {
      ...form,
      id_card: onlyDigits(form.id_card),
      movil: onlyDigits(form.movil),
      bithdate: form.bithdate || null,
      contract_code: form.contract_code || "",
      value: form.value || 0,
      balance: form.balance || 0,
      commission: form.commission || 0,
      payment_date: form.payment_date || defaultToday,
      city_id: Number(form.city_id),
      user_id: Number(form.user_id),
      counselor_id: Number(form.counselor_id),
      agreement_id: Number(form.agreement_id),
      ...(isCreate && { stade: 1 }),
    };

    if (isEdit && wantsRenovation === "si") {
       payload.payment_date = renovationDatePayment;
       payload.renovation = {
          date_ini: renovationDateIni,
          date_end: addOneYear(renovationDateIni),
          date_payment: renovationDatePayment,
          value: Number(renovationValue) || 0,
       };
    }

    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    if (isView) return;

    setForm({
      name: "",
      lastname: "",
      id_card: "",
      address: "",
      bithdate: "",
      phone: "",
      movil: "",
      email: "",
      city_id: "",
      user_id: "",
      agreement_id: "",
      counselor_id: "",
      validity: defaultToday,
      validity_end: addOneYear(defaultToday),
      payment_date: defaultToday,
      balance: 0,
      value: 0,
      commission: 0,
      payment_commission: "no",
      company: "",
      carnet: "no",
      state: 1,
      stade: 1,
      contract_code: "",
      beneficiaries: [{ name: "" }],
    });

    setDepartmentId("");
    setCities([]);
    setSearchCounselor("");
    setIdCardError(null);
    lastCheckedRef.current = "";
  };

  return {
    isView,
    isEdit,
    isCreate,
    departments,
    cities,
    departmentId,
    setDepartmentId,
    franchises,
    counselors,
    agreements,
    saving,
    idCardError,
    checkingIdCard,
    searchCounselor,
    setSearchCounselor,
    showCounselors,
    setShowCounselors,
    wantsRenovation,
    setWantsRenovation,
    renovationType,
    setRenovationType,
    renovationDateIni,
    setRenovationDateIni,
    renovationValue,
    setRenovationValue,
    renovationDatePayment,
    setRenovationDatePayment,
    form,
    setForm,
    validateIdCard,
    addBeneficiary,
    removeBeneficiary,
    updateBeneficiaryName,
    filteredCounselors,
    canSubmit,
    submit,
    clear,
  };
}
