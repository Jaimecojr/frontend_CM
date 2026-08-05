const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Ally = {
  id: number;
  image: string;
  url: string;
  position: number;
};

async function getAllies(): Promise<Ally[]> {
  try {
    const res = await fetch(`${API_URL}/api/public/content-allies`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function AlliesSection() {
  const allies = await getAllies();

  if (allies.length === 0) return null;

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <p className="text-center text-sm font-medium text-[#64748B] uppercase tracking-widest mb-10">
          NUESTROS ALIADOS ESTRATÉGICOS
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {allies.map((ally) => (
            <a
              key={ally.id}
              href={ally.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white border border-slate-100"
            >
              <img
                src={`${API_URL}/storage/${ally.image}`}
                alt={`Aliado ${ally.position}`}
                className="w-full h-auto object-contain p-2"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
