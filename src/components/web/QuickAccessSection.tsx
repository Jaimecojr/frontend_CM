import Link from "next/link";

export function QuickAccessSection() {
  return (
    <section className="py-20 bg-[#f8f9ff]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Encabezado de sección */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE] mb-3 block">
            Acceso Rápido
          </span>
          <h2
            className="text-3xl font-bold text-[#1A1A2E]"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            ¿Qué necesitas hoy?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 — Directorio */}
          <Link href="/web/guia-medica" className="group bg-white p-8 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-[#1DBFCE]/30 transition-all duration-300 cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-[#eff4ff] flex items-center justify-center mb-5 group-hover:bg-[#1DBFCE]/10 transition-colors">
              <span className="material-symbols-outlined text-[#1DBFCE]">
                medical_services
              </span>
            </div>
            <h4 className="font-bold text-xl text-[#1A1A2E] mb-2">
              Guía Médica
            </h4>
            <p className="text-[#64748B] text-sm leading-relaxed">
              Encuentra especialistas cerca de ti en toda nuestra red nacional.
            </p>
            <div className="mt-5 flex items-center gap-1 text-[#1DBFCE] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Explorar
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                arrow_forward
              </span>
            </div>
          </Link>

          {/* Card 2 — Afíliate (destacada) */}
          <Link href="/web/afiliarse" className="group bg-[#E8192C] p-8 rounded-xl shadow-lg shadow-red-200 transform lg:scale-105 z-10 text-white cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-white">
                person_add
              </span>
            </div>
            <h4 className="font-bold text-xl mb-2">Afíliate</h4>
            <p className="text-white/85 text-sm leading-relaxed">
              Únete hoy y recibe todos los beneficios de nuestra cobertura
              médica exclusiva.
            </p>
            <div className="mt-5 flex items-center gap-1 font-bold text-sm group-hover:translate-x-1.5 transition-transform duration-200">
              Comenzar ahora
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                arrow_forward
              </span>
            </div>
          </Link>

          {/* Card 3 — Laboratorios */}
          <div className="group bg-white p-8 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-[#1DBFCE]/30 transition-all duration-300 cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-[#eff4ff] flex items-center justify-center mb-5 group-hover:bg-[#1DBFCE]/10 transition-colors">
              <span className="material-symbols-outlined text-[#1DBFCE]">
                biotech
              </span>
            </div>
            <h4 className="font-bold text-xl text-[#1A1A2E] mb-2">
              Laboratorios
            </h4>
            <p className="text-[#64748B] text-sm leading-relaxed">
              Accede a convenios con los mejores laboratorios clínicos del país.
            </p>
            <div className="mt-5 flex items-center gap-1 text-[#1DBFCE] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Explorar
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                arrow_forward
              </span>
            </div>
          </div>

          {/* Card 4 — Urgencias */}
          <div className="group bg-white p-8 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-[#1DBFCE]/30 transition-all duration-300 cursor-pointer">
            <div className="w-12 h-12 rounded-lg bg-[#eff4ff] flex items-center justify-center mb-5 group-hover:bg-[#1DBFCE]/10 transition-colors">
              <span className="material-symbols-outlined text-[#1DBFCE]">
                health_and_safety
              </span>
            </div>
            <h4 className="font-bold text-xl text-[#1A1A2E] mb-2">
              Urgencias
            </h4>
            <p className="text-[#64748B] text-sm leading-relaxed">
              Conoce los puntos de atención inmediata habilitados en tu ciudad.
            </p>
            <div className="mt-5 flex items-center gap-1 text-[#1DBFCE] text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Explorar
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                arrow_forward
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
