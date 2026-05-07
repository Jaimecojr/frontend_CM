import Image from "next/image";

const doctors = [
  {
    name: "Dra. Magdalena Barrios",
    specialty: "Dermatología",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD6dLVNwnFNF1Ga6ceBnNh5A79YZUiy1WnJ-gaXhogpjCnG2ckj2wnMxBOfJk8tzqcWgJtz9PcKKkcJvgMXmsZPVcCIliT6gd-LkKf1H369ggdQ09eT1qJaiOI_dwX89IkI73Cy1PIqdXxJXFXKcGjgCfpvwKX4wSvnx6EQXZfZuP2Fm3_FurNmeCELY8SsefWJd23-aGf8s4EoG1YjDkf9A1aTYZdswGqCj4MvbZAwX013CHswAk1O-RaFuLpOuXmrDezLY3m8bISh",
  },
  {
    name: "Dr. Gustavo Romero Díaz",
    specialty: "Neurología",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuADHX_ctwRWqXLY7kkCO9ckO5xHe2Bq4VtKVP9ejU0w1FBI0Ex-wDFAHQZmLssbL1im5CsaWwSlvqk84qt4gFxN8l_ITHomEF4wIZvRtH6Rr2N2yvFonzKenWRO2C16NlQdhiqf4T6Z9fYNTcvBh9-UMtA-WmHP5isY4Q9JBLYUmuu1L3LmHbUegguy26RHXWaNAEQET9DwVf2GjcLNp8fMx6zkf85tSCnA5z-JceJkiJLzam8fBMflgr6nWeF8RSTNMeFVSCL1KaBd",
  },
  {
    name: "Dra. Ana María Castaño",
    specialty: "Bacteriología",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD1RlnWiFlgiWEahzHkJ0qqDqZCkOtN6j2UWk6EwBYvKLc0MgfYd_0_HeFzLezCuHY8y3Fs5ObFit7hAOdSMXGB3eCm1FQdYRPPJbIWu8Qi0UcZ7uKmrjo9bKrLHyi_BjpPbBLxtY6nv7ZIU1oKG5SZQyxw3lZurom81U_-XV5J8oYTHWO6VY0F6uK-bAo6fjOmKrQ2AlXeq_UI0qqw1cCLUL20YB0wX1SE4bMkrPtuThL2OEnW7tljIJ4iydwsklJRsfM9XEi2OgDA",
  },
  {
    name: "Dr. Juan Manuel Arango",
    specialty: "Médico General",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDLWd11RfD70sswWM_9eisin9qhm1FlCaHdOw9kihrT5xClrAdVkyrnPy1akyFoe88bmJHtbQAyk-G79N8GTqScBfUnwou5pXg602nmEvziBLPQ9doKFOT7udSf41aT5QXTFHDOC37tN93aWaJPaaMjNvanPcNnWgNuACqOYL85m3yh5i11uKvDlmRohwu7XYrXIwRbYANDljNqfZ06dG5YDJ1nWAPndCAmt1Y2po_u8HPnzz9DiiK6TM_A-1PsS1la-4GLwEJoZAZB",
  },
];

export function DoctorsSection() {
  return (
    <section className="py-24 bg-[#f8f9ff]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#E8192C]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E8192C]">
                Nuestro Equipo
              </span>
            </div>
            <h2
              className="text-4xl font-bold text-[#1A1A2E] leading-tight"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Cuadro Médico
            </h2>
            <p className="text-[#64748B] max-w-lg mt-3 text-[16px] leading-relaxed">
              Profesionales certificados con amplia trayectoria y el mejor trato
              humano para tu bienestar.
            </p>
          </div>
          <button className="shrink-0 flex items-center gap-1.5 text-[#1DBFCE] font-bold text-sm hover:gap-3 transition-all duration-200">
            Ver todos los especialistas
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
            >
              arrow_forward
            </span>
          </button>
        </div>

        {/* Grid de médicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {doctors.map((doctor, i) => (
            <div
              key={i}
              className="group bg-white rounded-xl p-6 text-center shadow-sm border border-slate-100 hover:shadow-lg hover:border-transparent hover:border-t-4 hover:border-t-[#E8192C] transition-all duration-300"
            >
              <div className="w-28 h-28 mx-auto mb-5 rounded-full overflow-hidden border-4 border-[#f0f4ff] group-hover:border-[#1DBFCE] transition-colors duration-300 relative">
                <Image
                  src={doctor.image}
                  alt={doctor.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <h5 className="font-bold text-[16px] text-[#1A1A2E] leading-snug">
                {doctor.name}
              </h5>
              <p className="text-[#1DBFCE] font-bold text-xs uppercase tracking-widest mt-1 mb-5">
                {doctor.specialty}
              </p>
              <button className="w-full py-2.5 bg-[#f0f4ff] text-[#1A1A2E] font-semibold text-sm rounded-lg group-hover:bg-[#E8192C] group-hover:text-white transition-all duration-300">
                Solicitar Cita
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
