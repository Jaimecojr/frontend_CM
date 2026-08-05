import Image from "next/image";
import Link from "next/link";

export function AboutSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        {/* Lado imagen */}
        <div className="relative">
          {/* Marco decorativo */}
          <div className="absolute -top-4 -left-4 w-3/4 h-3/4 border-2 border-[#E8192C]/15 rounded-xl pointer-events-none" />
          <div className="rounded-xl overflow-hidden shadow-xl relative aspect-[4/3]">
            <Image
              alt="Sobre Contacto Médico"
              src="/images/slide3.jpg"
              fill
              className="object-cover object-left-top"
            />
          </div>
          {/* Badges de experiencia */}
          <div className="absolute -bottom-6 -right-4 bg-white p-5 rounded-xl shadow-xl flex gap-6 border border-slate-100">
            <div className="text-center">
              <p
                className="text-[#E8192C] font-bold text-4xl leading-none"
                style={{ fontFamily: "'Lora', Georgia, serif" }}
              >
                15+
              </p>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mt-1">
                Años
              </p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <p
                className="text-[#1DBFCE] font-bold text-4xl leading-none"
                style={{ fontFamily: "'Lora', Georgia, serif" }}
              >
                +5
              </p>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mt-1">
                Ciudades
              </p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <p
                className="text-[#1A1A2E] font-bold text-4xl leading-none"
                style={{ fontFamily: "'Lora', Georgia, serif" }}
              >
                500+
              </p>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mt-1">
                Médicos
              </p>
            </div>
          </div>
        </div>

        {/* Lado texto */}
        <div className="space-y-7">
          {/* Etiqueta de sección */}
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-[#1DBFCE]" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE]">
              Quiénes Somos
            </span>
          </div>

          <h2
            className="text-4xl font-bold text-[#1A1A2E] leading-tight"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Expertos en{" "}
            <span className="text-[#E8192C]">Intermediación</span>{" "}
            Médica
          </h2>

          <div className="pl-5 border-l-[3px] border-[#1DBFCE]">
            <p className="text-[16px] italic text-[#64748B] leading-relaxed">
              &quot;Nuestra misión es transformar la experiencia de salud en
              Colombia, conectando personas con soluciones médicas ágiles y
              humanas.&quot;
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Red de especialistas de alto nivel",
              "Atención prioritaria sin esperas",
              "Convenios de diagnóstico avanzado",
              "Seguimiento humano personalizado",
            ].map((item) => (
              <div key={item} className="flex gap-3 items-start">
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

          <Link
            href="/web/quienes-somos"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#1DBFCE] text-white rounded-lg font-semibold text-[15px] hover:bg-[#17a8b5] active:scale-95 transition-all duration-200 shadow-md shadow-cyan-100"
          >
            Conoce más sobre nosotros
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
