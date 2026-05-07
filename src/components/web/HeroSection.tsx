import Image from "next/image";
import { AffiliateConsultWidget } from "./AffiliateConsultWidget";

export function HeroSection() {
  return (
    <section className="relative min-h-[640px] flex items-center overflow-hidden bg-white">
      {/* Imagen de fondo */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Clínica médica moderna"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcj8Du4UVQyRK4MRimdeZtb-ZhwtVWtsyTEFkwDu7csCZHujl_DLtX3lv_hdMHQJEpeVjY9jdoOak5SZ6FumgC5kwK4VuCe49gVUIT_VqJX2k1hPDLMc_cnYmiXcuCHQF-09iNEX96_ewv96Pl7S6Z0ejmfqRTTlgtwWOkD_9SfqK3kLWeg4VxoLi-wjBTY2idb8mOAaAie0OuzGOocF4nMxnkPDTw-ZsvAor35QoSnqWQjqCMq3sec435Sr_NEbM__nIcH6GFwrNp"
          fill
          className="object-cover object-right-top"
          unoptimized
          priority
        />
        {/* Gradiente más sofisticado */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent" />
      </div>

      {/* Acento geométrico rojo */}
      <div
        className="absolute right-0 top-0 h-full w-[45%] pointer-events-none hidden lg:block"
        style={{
          background:
            "linear-gradient(135deg, transparent 40%, rgba(232,25,44,0.04) 100%)",
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 py-20">
        {/* Contenido izquierdo */}
        <div className="lg:col-span-7 flex flex-col items-start gap-6">
          {/* Etiqueta */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffdad7] text-[#930014] text-xs uppercase tracking-widest font-bold">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#E8192C] animate-pulse"
            />
            Atención Inmediata
          </span>

          {/* Titular principal */}
          <h1
            className="text-[52px] md:text-[58px] font-bold leading-[1.1] tracking-[-0.02em] text-[#1A1A2E] max-w-xl"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Los Mejores{" "}
            <span className="text-[#E8192C] italic">Especialistas</span>{" "}
            a tu Alcance
          </h1>

          <p className="text-[17px] leading-[1.7] text-[#64748B] max-w-lg">
            Brindamos servicios médicos integrales con calidez humana. Accede a
            la mejor red de especialistas, convenios con IPS y laboratorios
            clínicos con tarifas preferenciales.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-2">
            <button className="flex items-center gap-2 px-7 py-3.5 bg-[#E8192C] text-white rounded-lg font-semibold text-[15px] shadow-lg shadow-red-200 hover:bg-[#c41422] active:scale-95 transition-all duration-200">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                person_add
              </span>
              Afíliate ahora
            </button>
            <button className="flex items-center gap-2 px-7 py-3.5 border-2 border-[#1DBFCE] text-[#1DBFCE] rounded-lg font-semibold text-[15px] hover:bg-[#1DBFCE]/8 transition-all duration-200">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                chat
              </span>
              WhatsApp
            </button>
          </div>

          {/* Señales de confianza */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 mt-2 w-full">
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <span className="text-[#22AD5C] font-bold text-base">✓</span>
              <span>+500 médicos activos</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <span className="text-[#22AD5C] font-bold text-base">✓</span>
              <span>5+ ciudades</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <span className="text-[#22AD5C] font-bold text-base">✓</span>
              <span>15 años de experiencia</span>
            </div>
          </div>
        </div>

        {/* Widget derecho */}
        <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
          <AffiliateConsultWidget />
        </div>
      </div>
    </section>
  );
}
