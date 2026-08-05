import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Servicios | Contacto Médico",
  description:
    "Conoce los servicios a domicilio y la red de especialidades médicas disponibles con tarifas preferenciales a través de Contacto Médico.",
};

const HOME_SERVICES = [
  { icon: "biotech", title: "Laboratorio Clínico", description: "Toma de muestras y exámenes de laboratorio en la comodidad de tu hogar." },
  { icon: "medical_information", title: "Imágenes Diagnósticas", description: "Coordinación de estudios de imagen con nuestra red de convenios." },
  { icon: "emergency", title: "Ambulancia", description: "Servicio de traslado médico cuando lo necesitas." },
  { icon: "home_health", title: "Médico a Domicilio", description: "Atención médica general en tu casa, sin desplazamientos." },
  { icon: "vaccines", title: "Enfermería a Domicilio", description: "Curaciones, aplicación de medicamentos y cuidados de enfermería en casa." },
  { icon: "self_improvement", title: "Fisioterapia y Terapia Respiratoria", description: "Sesiones de rehabilitación y terapia respiratoria a domicilio." },
];

const SPECIALTIES = [
  "Medicina General", "Ginecología", "Pediatría", "Medicina Interna",
  "Gastroenterología", "Dermatología", "Neurocirugía", "Cardiología",
  "Ortopedia", "Odontología General y Especializada", "Optometría",
  "Cirugía Plástica", "Cirugía Vascular", "Urología", "Nefrología",
  "Otorrinolaringología", "Reumatología", "Endocrinología",
  "Oftalmología", "Neuropediatría",
];

export default function ServiciosPage() {
  return (
    <main>
      {/* Hero */}
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
              Servicios
            </span>
            <div className="h-px w-8 bg-[#E8192C]" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Acceso a una red{" "}
            <span className="text-[#1DBFCE] italic">completa</span> de salud
          </h1>
          <p className="text-slate-400 text-[16px] max-w-xl mx-auto leading-relaxed">
            Con una mínima cuota anual, accede a servicios de apoyo a domicilio y
            a nuestra amplia red de especialistas con tarifas preferenciales.
          </p>
        </div>
      </section>

      {/* Servicios a domicilio */}
      <section className="py-20 bg-[#f8f9ff]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE] mb-3 block">
              Servicios a Domicilio
            </span>
            <h2
              className="text-3xl font-bold text-[#1A1A2E]"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Cuidado médico sin salir de casa
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOME_SERVICES.map((service) => (
              <div
                key={service.title}
                className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-[#1DBFCE]/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-[#eff4ff] flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-[#1DBFCE]">
                    {service.icon}
                  </span>
                </div>
                <h4 className="font-bold text-xl text-[#1A1A2E] mb-2">
                  {service.title}
                </h4>
                <p className="text-[#64748B] text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Especialidades */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE] mb-3 block">
              Especialidades
            </span>
            <h2
              className="text-3xl font-bold text-[#1A1A2E]"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Nuestra red de especialistas
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {SPECIALTIES.map((specialty) => (
              <div
                key={specialty}
                className="flex items-center gap-3 bg-[#f8f9ff] border border-slate-100 rounded-lg px-5 py-3.5"
              >
                <span
                  className="material-symbols-outlined text-[#1DBFCE] shrink-0"
                  style={{ fontSize: "18px" }}
                >
                  check_circle
                </span>
                <span className="text-[14px] text-[#1A1A2E] font-medium">
                  {specialty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-[#f8f9ff]">
        <div className="max-w-[640px] mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold text-[#1A1A2E] mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Encuentra tu especialista
          </h2>
          <p className="text-[#64748B] leading-relaxed mb-8">
            Busca en nuestra guía médica por ciudad y especialidad, o afíliate
            para acceder a tarifas preferenciales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/web/guia-medica"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-[#1DBFCE] text-[#1DBFCE] rounded-xl font-bold text-[15px] hover:bg-[#1DBFCE] hover:text-white transition-all duration-200 uppercase tracking-wide"
            >
              Ver Guía Médica
            </Link>
            <Link
              href="/web/afiliarse"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E8192C] text-white rounded-xl font-bold text-[15px] shadow-md hover:bg-[#c41422] active:scale-[0.98] transition-all duration-200 uppercase tracking-wide"
            >
              Afíliate ahora
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
