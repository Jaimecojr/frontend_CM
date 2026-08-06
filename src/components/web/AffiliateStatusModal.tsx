"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { AffiliateStatusResponse } from "@/services/affiliateService";

interface AffiliateStatusModalProps {
  result: AffiliateStatusResponse;
  onClose: () => void;
}

/** Iniciales del titular para el distintivo circular (ej. "Juan Pérez" -> "JP"). */
function getInitials(name: string, lastname: string) {
  const a = name?.trim()?.[0] ?? "";
  const b = lastname?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function AffiliateStatusModal({ result, onClose }: AffiliateStatusModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  const data = result.data;
  const beneficiaries = data?.beneficiaries ?? [];
  const activa = !!data && data.stade === 1 && !dayjs(data.validity_end).isBefore(dayjs(), "day");

  const status = activa
    ? {
        icon: "check_circle",
        text: `Afiliación Activa — Vigente hasta ${dayjs(data?.validity_end).format("DD/MM/YYYY")}`,
        chip: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
        iconTint: "text-emerald-600",
      }
    : {
        icon: "cancel",
        text: data
          ? `Afiliación Inactiva — Venció ${dayjs(data.validity_end).format("DD/MM/YYYY")}`
          : "",
        chip: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
        iconTint: "text-red-600",
      };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1c30]/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#e5eeff] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1DBFCE]/12">
              <span
                className="material-symbols-outlined text-[#1DBFCE]"
                style={{ fontSize: "20px" }}
              >
                verified
              </span>
            </span>
            <h2
              className="text-lg font-bold leading-tight text-[#1A1A2E]"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Registro Grupo Familiar
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {result.success && data ? (
            <div className="space-y-6">
              {/* Titular */}
              <div className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#1DBFCE] to-[#12707a] text-lg font-bold text-white shadow-sm">
                  {getInitials(data.name, data.lastname)}
                </span>
                <p
                  className="mt-3 text-xl font-bold text-[#1A1A2E]"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}
                >
                  {data.name} {data.lastname}
                </p>
                <p className="text-sm text-[#64748B]">CC. {data.id_card}</p>
              </div>

              {/* Estado */}
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${status.chip}`}>
                <span
                  className={`material-symbols-outlined shrink-0 ${status.iconTint}`}
                  style={{ fontSize: "26px" }}
                >
                  {status.icon}
                </span>
                <p className="text-left text-sm font-semibold leading-tight">{status.text}</p>
              </div>

              {/* Beneficiarios */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                    Beneficiarios
                  </h3>
                  <span className="rounded-full bg-[#f8faff] px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
                    {beneficiaries.length}
                  </span>
                </div>
                {beneficiaries.length > 0 ? (
                  <ul className="divide-y divide-[#e5eeff] overflow-hidden rounded-xl border border-[#e5eeff]">
                    {beneficiaries.map((b, i) => (
                      <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f8faff]">
                          <span
                            className="material-symbols-outlined text-[#1DBFCE]"
                            style={{ fontSize: "16px" }}
                          >
                            person
                          </span>
                        </span>
                        <span className="text-sm text-[#1A1A2E]">{b.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#e5eeff] px-4 py-3">
                    <span
                      className="material-symbols-outlined text-[#64748B]"
                      style={{ fontSize: "20px" }}
                    >
                      group_off
                    </span>
                    <p className="text-sm text-[#64748B]">Sin beneficiarios registrados.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <span
                  className="material-symbols-outlined text-red-600"
                  style={{ fontSize: "26px" }}
                >
                  error
                </span>
              </span>
              <p className="text-sm font-medium text-[#1A1A2E]">{result.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[#1DBFCE] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
