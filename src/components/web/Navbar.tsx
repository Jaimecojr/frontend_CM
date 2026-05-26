"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logo from "@/assets/logos/logo.png";

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 w-full z-50">
      {/* Barra de acento de marca */}
      <div
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(to right, #E8192C 55%, #1DBFCE)" }}
      />

      <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <nav className="flex justify-between items-center px-6 md:px-12 h-[72px] max-w-[1280px] mx-auto">
          {/* Logo */}
          <Link href="/web" className="flex items-center shrink-0">
            <Image
              src={logo}
              alt="Contacto Médico"
              height={44}
              className="h-11 w-auto"
              priority
            />
          </Link>

          {/* Links de navegación */}
          <ul className="hidden lg:flex items-center gap-8 text-[13.5px] font-semibold tracking-tight">
            <li>
              <Link
                href="/web"
                className={pathname === "/web" ? "text-[#E8192C] border-b-2 border-[#E8192C] pb-0.5" : "text-[#64748B] hover:text-[#1A1A2E] border-b-2 border-transparent hover:border-[#1DBFCE] pb-0.5 transition-all duration-200"}
              >
                Inicio
              </Link>
            </li>
            <li>
              <Link
                href="/web/guia-medica"
                className={pathname === "/web/guia-medica" ? "text-[#E8192C] border-b-2 border-[#E8192C] pb-0.5" : "text-[#64748B] hover:text-[#1A1A2E] border-b-2 border-transparent hover:border-[#1DBFCE] pb-0.5 transition-all duration-200"}
              >
                Guía Médica
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="text-[#64748B] hover:text-[#1A1A2E] border-b-2 border-transparent hover:border-[#1DBFCE] pb-0.5 transition-all duration-200"
              >
                Servicios
              </Link>
            </li>
            <li>
              <Link
                href="/web/contactenos"
                className={pathname === "/web/contactenos" ? "text-[#E8192C] border-b-2 border-[#E8192C] pb-0.5" : "text-[#64748B] hover:text-[#1A1A2E] border-b-2 border-transparent hover:border-[#1DBFCE] pb-0.5 transition-all duration-200"}
              >
                Contáctenos
              </Link>
            </li>
          </ul>

          {/* Acciones */}
          <div className="flex items-center gap-3">
            <Link
              href="/4dnn1n"
              className="hidden md:flex items-center gap-1.5 px-5 py-2.5 border border-[#1DBFCE] text-[#1DBFCE] rounded-lg font-semibold text-[13.5px] hover:bg-[#1DBFCE] hover:text-white transition-all duration-200"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "15px" }}
              >
                person
              </span>
              Portal Pacientes
            </Link>
            <Link
              href="/web/afiliarse"
              className={`flex items-center gap-1.5 px-5 py-2.5 bg-[#E8192C] text-white rounded-lg font-semibold text-[13.5px] shadow hover:bg-[#c41422] active:scale-95 transition-all duration-200 ${pathname === "/web/afiliarse" ? "opacity-90" : ""}`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "15px" }}
              >
                person_add
              </span>
              Afíliate
            </Link>
            <button className="lg:hidden p-2 text-[#1A1A2E]">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
