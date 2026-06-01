
type Specialist = {
  id: number;
  name: string;
  specialty: string;
  photo: string;
  position: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getSpecialists(): Promise<Specialist[]> {
  const apiUrl = API_URL;
  try {
    const res = await fetch(`${apiUrl}/api/public/content-specialists`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function DoctorsSection() {
  const doctors = await getSpecialists();

  if (doctors.length === 0) return null;

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
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="group bg-white rounded-xl p-6 text-center shadow-sm border border-slate-100 hover:shadow-lg hover:border-transparent hover:border-t-4 hover:border-t-[#E8192C] transition-all duration-300"
            >
              <div className="w-28 h-28 mx-auto mb-5 rounded-full overflow-hidden border-4 border-[#f0f4ff] group-hover:border-[#1DBFCE] transition-colors duration-300">
                <img
                  src={`${API_URL}/storage/${doctor.photo}`}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h5 className="font-bold text-[16px] text-[#1A1A2E] leading-snug">
                {doctor.name}
              </h5>
              <p className="text-[#1DBFCE] font-bold text-xs uppercase tracking-widest mt-1">
                {doctor.specialty}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
