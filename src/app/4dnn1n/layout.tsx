import "@/css/satoshi.css";
import "@/css/style.css";
import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import type { Metadata } from "next";
import AuthLayoutClient from "./auth-layout";

export const metadata: Metadata = {
  title: {
    template: "%s | Contacto Médico Admin",
    default: "Panel Administrativo - Contacto Médico",
  },
  description: "Panel de administración para Contacto Médico.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
