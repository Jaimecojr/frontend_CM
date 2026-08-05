"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logo from "@/assets/logos/logo.png";

const NAV_LINKS = [
  { href: "/web", label: "Inicio" },
  { href: "/web/guia-medica", label: "Guía Médica" },
  { href: "/web/servicios", label: "Servicios" },
  { href: "/web/contactenos", label: "Contáctenos" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={pathname === link.href ? "text-[#E8192C] border-b-2 border-[#E8192C] pb-0.5" : "text-[#64748B] hover:text-[#1A1A2E] border-b-2 border-transparent hover:border-[#1DBFCE] pb-0.5 transition-all duration-200"}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Acciones */}
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="lg:hidden p-2 text-[#1A1A2E]"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              <span className="material-symbols-outlined">
                {mobileOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </nav>

        {/* Panel de navegación móvil */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-100 px-6 py-5">
            <ul className="flex flex-col gap-1 text-[14px] font-semibold">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={
                      pathname === link.href
                        ? "block py-3 text-[#E8192C]"
                        : "block py-3 text-[#64748B] hover:text-[#1A1A2E] transition-colors duration-200"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
