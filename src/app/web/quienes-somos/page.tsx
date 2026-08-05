import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quiénes Somos | Contacto Médico",
  description:
    "Conoce la historia, misión y visión de Contacto Médico: más de 15 años facilitando el acceso a especialistas de salud con tarifas preferenciales en Colombia.",
};

const CHECKLIST_ITEMS = [
  "Red de especialistas de alto nivel",
  "Atención prioritaria sin esperas",
  "Convenios de diagnóstico avanzado",
  "Seguimiento humano personalizado",
];

const STATS = [
  { value: "15+", label: "Años", color: "#E8192C" },
  { value: "+5", label: "Ciudades", color: "#1DBFCE" },
  { value: "500+", label: "Médicos", color: "#1A1A2E" },
];

export default function QuienesSomosPage() {
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
              Quiénes Somos
            </span>
            <div className="h-px w-8 bg-[#E8192C]" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Expertos en{" "}
            <span className="text-[#1DBFCE] italic">Intermediación</span> Médica
          </h1>
          <p className="text-slate-400 text-[16px] max-w-xl mx-auto leading-relaxed">
            Llevamos más de 15 años conectando familias colombianas con soluciones
            médicas ágiles, humanas y de calidad.
          </p>
        </div>
      </section>

      {/* Trayectoria */}
      <section className="py-14 bg-[#f8f9ff]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center"
            >
              <p
                className="font-bold text-4xl leading-none"
                style={{ fontFamily: "'Lora', Georgia, serif", color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="pl-5 border-l-[3px] border-[#1DBFCE]">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE] block mb-3">
              Misión
            </span>
            <p className="text-[16px] italic text-[#64748B] leading-relaxed">
              &quot;Nuestra misión es transformar la experiencia de salud en
              Colombia, conectando personas con soluciones médicas ágiles y
              humanas.&quot;
            </p>
          </div>
          <div className="pl-5 border-l-[3px] border-[#E8192C]">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E8192C] block mb-3">
              Visión
            </span>
            <p className="text-[16px] italic text-[#64748B] leading-relaxed">
              &quot;Ser en el año 2030 la empresa líder en Colombia en
              intermediación y servicios complementarios de salud, reconocida
              por la calidad de nuestra red de especialistas y la cercanía con
              nuestros afiliados.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-20 bg-[#f8f9ff]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-[#1A1A2E]"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Lo que nos distingue
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {CHECKLIST_ITEMS.map((item) => (
              <div
                key={item}
                className="flex gap-3 items-start bg-white rounded-xl border border-slate-100 p-5"
              >
                <div className="w-5 h-5 rounded-full bg-[#1DBFCE]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-[#1DBFCE]"
                    style={{ fontSize: "13px" }}
                  >
                    check
                  </span>
                </div>
                <p className="text-[15px] text-[#1A1A2E] leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-white">
        <div className="max-w-[640px] mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold text-[#1A1A2E] mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            ¿Listo para afiliarte?
          </h2>
          <p className="text-[#64748B] leading-relaxed mb-8">
            Únete hoy y accede a nuestra red de especialistas con tarifas
            preferenciales para ti y tu familia.
          </p>
          <Link
            href="/web/afiliarse"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#E8192C] text-white rounded-xl font-bold text-[15px] shadow-md hover:bg-[#c41422] active:scale-[0.98] transition-all duration-200 uppercase tracking-wide"
          >
            Afíliate ahora
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              arrow_forward
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
