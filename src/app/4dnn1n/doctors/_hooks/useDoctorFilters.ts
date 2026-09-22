"use client";

import { useEffect, useState } from "react";
import { getDepartments, getCitiesByDepartment } from "@/lib/geo";
import type { Department, City } from "@/types/geo";
import { getSpecialties, type ApiSpecialty } from "../specialties/fetch";

/**
 * Loads the department/city/specialty catalogs used by the doctors table's
 * advanced filters, and resolves the specialty free-text input (an
 * `<input list>` combo, not a plain select) to the matching
 * `ApiSpecialty.id` that the server-side filter needs.
 */
export function useDoctorFilters() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);

  const [filterDepartmentId, setFilterDepartmentId] = useState<number | "">("");
  const [filterCityId, setFilterCityId] = useState<number | "">("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [filterSpecialtyId, setFilterSpecialtyId] = useState<number | "">("");

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
    getSpecialties()
      .then((list) => setSpecialties(list.filter((s) => s.state === 1)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!filterDepartmentId) {
      setCities([]);
      setFilterCityId("");
      return;
    }
    setCitiesLoading(true);
    getCitiesByDepartment(Number(filterDepartmentId))
      .then(setCities)
      .catch(console.error)
      .finally(() => setCitiesLoading(false));
  }, [filterDepartmentId]);

  const handleSpecialtyChange = (val: string) => {
    setSpecialtySearch(val);
    if (!val) {
      setFilterSpecialtyId("");
      return;
    }
    const spec = specialties.find((s) => s.name.toLowerCase() === val.toLowerCase());
    if (spec) setFilterSpecialtyId(spec.id);
    else setFilterSpecialtyId("");
  };

  return {
    departments,
    cities,
    citiesLoading,
    specialties,
    filterDepartmentId,
    setFilterDepartmentId,
    filterCityId,
    setFilterCityId,
    specialtySearch,
    filterSpecialtyId,
    handleSpecialtyChange,
  };
}
