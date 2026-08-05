'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logos/logo.png";
import LegalModal from "@/components/web/LegalModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Franchise = {
  id: number;
  name: string;
  address: string | null;
  city: { id: number; name: string } | null;
};

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

async function getActiveFranchises(): Promise<Franchise[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/franchises`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export function Footer() {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);

  useEffect(() => {
    getActiveFranchises().then(setFranchises);
  }, []);

  return (
    <footer className="bg-[#1A1A2E] text-white">
      {/* Barra de acento superior */}
      <div
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(to right, #E8192C 55%, #1DBFCE)" }}
      />

      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-14">
          {/* Columna de marca */}
          <div className="space-y-5">
            {/* Logo con inversión de color para fondo oscuro */}
            <Link href="/web">
              <Image
                src={logo}
                alt="Contacto Médico"
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Llevamos salud de calidad con un trato digno y cercano. Expertos en
              intermediación y servicios a domicilio en Colombia.
            </p>
            <div className="flex gap-3">
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#E8192C] transition-all duration-200"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  social_leaderboard
                </span>
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#E8192C] transition-all duration-200"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  share_reviews
                </span>
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#E8192C] transition-all duration-200"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  mail
                </span>
              </Link>
            </div>
          </div>

          {/* Nuestras Sedes */}
          <div className="space-y-5">
            <h6 className="text-[#E8192C] font-bold uppercase tracking-widest text-xs">
              Nuestras Sedes
            </h6>
            <ul className="space-y-2.5 text-slate-400 text-xs">
              {franchises
                .filter((franchise) => !!franchise.address?.trim())
                .map((franchise) => (
                <li
                  key={franchise.id}
                  className="flex gap-2 hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1"
                >
                  <span
                    className="material-symbols-outlined text-[#1DBFCE] shrink-0"
                    style={{ fontSize: "14px", marginTop: "1px" }}
                  >
                    location_on
                  </span>
                  <span>
                    <span className="text-white font-medium">
                      {toTitleCase(franchise.city?.name ?? franchise.name)}:{" "}
                    </span>
                    {toTitleCase(franchise.address as string)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Enlaces y otras sedes */}
          <div className="space-y-5">
            <h6 className="text-[#E8192C] font-bold uppercase tracking-widest text-xs">
              Enlaces
            </h6>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setLegalModal('privacy')}
                  className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1 text-left"
                >
                  Aviso de Privacidad
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLegalModal('terms')}
                  className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1 text-left"
                >
                  Términos y Condiciones
                </button>
              </li>
              <li className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1">
                Preguntas Frecuentes
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-xs">
          <p>© {new Date().getFullYear()} Contacto Médico. Salud con sentido humano.</p>
        </div>
      </div>
      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </footer>
  );
}
