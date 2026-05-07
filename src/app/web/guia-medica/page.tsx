"use client";

import { useEffect, useState, useCallback } from "react";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";
import type { Department, City } from "@/app/4dnn1n/counselors/fetch";
import type { ApiSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function getDepartments(): Promise<Department[]> {
  const res = await publicFetch<{ data: Department[] }>("/api/public/departments");
  return res.data ?? [];
}

async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  const res = await publicFetch<{ data: City[] }>(
    `/api/public/departments/${departmentId}/cities`
  );
  return res.data ?? [];
}

async function getSpecialties(): Promise<ApiSpecialty[]> {
  const res = await publicFetch<{ data: ApiSpecialty[] }>("/api/public/specialties");
  return res.data ?? [];
}

async function getDoctors(params: {
  page: number;
  search: string;
  department_id?: number | "";
  city_id?: number | "";
  specialty_id?: number | "";
}): Promise<{
  data: ApiDoctor[];
  meta: { current_page: number; last_page: number; total: number };
}> {
  const p = new URLSearchParams();
  p.set("page", String(params.page));
  p.set("per_page", "12");
  if (params.search) p.set("search", params.search);
  if (params.department_id) p.set("department_id", String(params.department_id));
  if (params.city_id) p.set("city_id", String(params.city_id));
  if (params.specialty_id) p.set("specialty_id", String(params.specialty_id));
  const res = await publicFetch<{
    data: ApiDoctor[];
    meta: { current_page: number; last_page: number; total: number };
  }>(`/api/public/doctors?${p.toString()}`);
  return { data: res.data ?? [], meta: res.meta ?? { current_page: 1, last_page: 1, total: 0 } };
}

export default function GuiaMedicaPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);

  const [search, setSearch] = useState("");
  const [deptId, setDeptId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");
  const [specialtyId, setSpecialtyId] = useState<number | "">("");

  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
    getSpecialties().then(setSpecialties).catch(console.error);
  }, []);

  useEffect(() => {
    if (!deptId) {
      setCities([]);
      setCityId("");
      return;
    }
    getCitiesByDepartment(Number(deptId)).then(setCities).catch(console.error);
  }, [deptId]);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDoctors({ page, search, department_id: deptId, city_id: cityId, specialty_id: specialtyId });
      setDoctors(res.data);
      setMeta(res.meta);
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, deptId, cityId, specialtyId]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleSpecialtyChange = (val: string) => {
    setSpecialtyId(val ? Number(val) : "");
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <main>
      {/* Hero de sección */}
      <section className="relative py-16 bg-[#1A1A2E] overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #E8192C 0%, transparent 50%), radial-gradient(circle at 80% 50%, #1DBFCE 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#E8192C]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E8192C]">
              Directorio Médico
            </span>
            <div className="h-px w-8 bg-[#E8192C]" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Guía{" "}
            <span className="text-[#1DBFCE] italic">Médica</span>
          </h1>
          <p className="text-slate-400 text-[16px] max-w-xl mx-auto leading-relaxed">
            Encuentra el especialista que necesitas. Filtra por departamento, ciudad o
            especialidad para ubicar al profesional más cercano.
          </p>
        </div>
      </section>

      {/* Barra de filtros */}
      <section className="bg-white border-b border-slate-100 shadow-sm sticky top-[75px] z-40">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Búsqueda por nombre */}
            <div className="relative flex-1 min-w-[200px]">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                style={{ fontSize: "18px" }}
              >
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
                placeholder="Buscar por nombre o apellido..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm text-[#1A1A2E] outline-none focus:border-[#1DBFCE] focus:ring-2 focus:ring-[#1DBFCE]/10 transition-all"
              />
            </div>

            {/* Departamento */}
            <select
              value={deptId}
              onChange={(e) => { setDeptId(e.target.value ? Number(e.target.value) : ""); handleFilterChange(); }}
              className="h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A1A2E] outline-none focus:border-[#1DBFCE] bg-white w-[180px] shrink-0 transition-all"
            >
              <option value="">Departamento (Todos)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Ciudad */}
            <select
              value={cityId}
              onChange={(e) => { setCityId(e.target.value ? Number(e.target.value) : ""); handleFilterChange(); }}
              disabled={!deptId || cities.length === 0}
              className="h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A1A2E] outline-none focus:border-[#1DBFCE] bg-white w-[160px] shrink-0 disabled:opacity-40 transition-all"
            >
              <option value="">Ciudad (Todas)</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Especialidad */}
            <select
              value={specialtyId}
              onChange={(e) => { handleSpecialtyChange(e.target.value); handleFilterChange(); }}
              className="h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A1A2E] outline-none focus:border-[#1DBFCE] bg-white w-[200px] shrink-0 transition-all"
            >
              <option value="">Especialidad (Todas)</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Limpiar filtros */}
            {(search || deptId || cityId || specialtyId) && (
              <button
                onClick={() => {
                  setSearch(""); setDeptId(""); setCityId(""); setSpecialtyId(""); setPage(1);
                }}
                className="h-10 px-4 rounded-lg border border-slate-200 text-sm text-[#64748B] hover:border-[#E8192C] hover:text-[#E8192C] transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
                Limpiar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="py-12 bg-[#f8f9ff] min-h-[500px]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          {/* Conteo de resultados */}
          {!loading && (
            <p className="text-sm text-[#64748B] mb-6">
              {meta.total === 0
                ? "No se encontraron médicos con esos filtros."
                : `Mostrando ${doctors.length} de ${meta.total} médico${meta.total !== 1 ? "s" : ""}`}
            </p>
          )}

          {/* Estado de carga */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 animate-pulse">
                  <div className="space-y-2 mb-5">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-slate-300 text-6xl block mb-4">
                medical_services
              </span>
              <p className="text-[#64748B] font-medium">No se encontraron médicos</p>
              <p className="text-sm text-slate-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          )}

          {/* Paginación */}
          {meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-[#64748B] hover:border-[#1DBFCE] hover:text-[#1DBFCE] disabled:opacity-40 transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
                Anterior
              </button>

              <span className="text-sm text-[#64748B] px-2">
                Página {meta.current_page} de {meta.last_page}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-[#64748B] hover:border-[#1DBFCE] hover:text-[#1DBFCE] disabled:opacity-40 transition-all"
              >
                Siguiente
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DoctorCard({ doctor }: { doctor: ApiDoctor }) {
  const contact = doctor.movil || doctor.phone;

  return (
    <div className="group bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-[#1DBFCE]/30 transition-all duration-300 overflow-hidden">
      {/* Barra superior de color */}
      <div className="h-1 w-full bg-gradient-to-r from-[#E8192C] to-[#1DBFCE]" />

      <div className="p-6">
        {/* Cabecera: nombre y especialidad */}
        <div className="mb-5">
          <h3
            className="font-bold text-[16px] text-[#1A1A2E] leading-snug"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            {doctor.name} {doctor.lastname}
          </h3>
          {doctor.specialty && (
            <span className="inline-block mt-1.5 text-xs font-bold uppercase tracking-widest text-[#1DBFCE]">
              {doctor.specialty.name}
            </span>
          )}
        </div>

        {/* Detalles de contacto */}
        <ul className="space-y-2.5">
          {contact && (
            <li className="flex items-center gap-2.5 text-sm text-[#64748B]">
              <span className="material-symbols-outlined text-[#1DBFCE] shrink-0" style={{ fontSize: "16px" }}>
                phone
              </span>
              <span className="truncate">{contact}</span>
            </li>
          )}
          {doctor.address && (
            <li className="flex items-start gap-2.5 text-sm text-[#64748B]">
              <span className="material-symbols-outlined text-[#1DBFCE] shrink-0 mt-0.5" style={{ fontSize: "16px" }}>
                location_on
              </span>
              <span className="line-clamp-2">{doctor.address}</span>
            </li>
          )}
          {doctor.city && (
            <li className="flex items-center gap-2.5 text-sm text-[#64748B]">
              <span className="material-symbols-outlined text-[#1DBFCE] shrink-0" style={{ fontSize: "16px" }}>
                apartment
              </span>
              <span>{doctor.city.name}</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
