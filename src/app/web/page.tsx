import type { Metadata } from "next";
import { HeroSection } from "@/components/web/HeroSection";
import { QuickAccessSection } from "@/components/web/QuickAccessSection";
import { AboutSection } from "@/components/web/AboutSection";
import { AlliesSection } from "@/components/web/AlliesSection";
import { DoctorsSection } from "@/components/web/DoctorsSection";

export const metadata: Metadata = {
  title: "Contacto Médico | Especialistas en Salud para Ti y Tu Familia",
  description:
    "Accede a especialistas, IPS y laboratorios con tarifas preferenciales en Colombia. Más de 15 años facilitando servicios de salud en Armenia, Pereira, Manizales, Cali, Ibagué y Neiva. ¡Afíliate hoy!",
  keywords:
    "especialistas médicos, servicio médico especializado, intermediación médica, guía médica, médico en casa, convenios IPS, medicina interna, médico Armenia, especialistas Pereira, salud Manizales, servicio médico Cali, servicio médico Ibagué, servicio médico Neiva, Colombia",
  openGraph: {
    title: "Contacto Médico | Los Mejores Especialistas a tu Alcance",
    description:
      "Facilitamos el acceso a especialistas, IPS y laboratorios con tarifas preferenciales. Más de 15 años brindando salud con sentido humano en Colombia.",
    url: "https://contactomedico.net",
    siteName: "Contacto Médico",
    images: [
      {
        url: "https://contactomedico.net/logo.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "es_CO",
    type: "website",
  },
};

export default function WebPage() {
  return (
    <main>
      <HeroSection />
      <QuickAccessSection />
      <AboutSection />
      <AlliesSection />
      <DoctorsSection />
    </main>
  );
}
