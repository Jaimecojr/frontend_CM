import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logos/logo.png";

export function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-white">
      {/* Barra de acento superior */}
      <div
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(to right, #E8192C 55%, #1DBFCE)" }}
      />

      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-14">
          {/* Columna de marca */}
          <div className="space-y-5">
            {/* Logo con inversión de color para fondo oscuro */}
            <Link href="/web">
              <Image
                src={logo}
                alt="Contacto Médico"
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Llevamos salud de calidad con un trato digno y cercano. Expertos en
              intermediación y servicios a domicilio en Colombia.
            </p>
            <div className="flex gap-3">
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#E8192C] transition-all duration-200"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  social_leaderboard
                </span>
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#E8192C] transition-all duration-200"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  share_reviews
                </span>
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#E8192C] transition-all duration-200"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  mail
                </span>
              </Link>
            </div>
          </div>

          {/* Sedes Eje Cafetero */}
          <div className="space-y-5">
            <h6 className="text-[#E8192C] font-bold uppercase tracking-widest text-xs">
              Sedes Eje Cafetero
            </h6>
            <ul className="space-y-3 text-slate-400 text-sm">
              {[
                { city: "Armenia", address: "Av. Bolívar No. 12-45" },
                { city: "Pereira", address: "Calle 14 No. 23-11" },
                { city: "Manizales", address: "Carrera 23 No. 45-67" },
              ].map(({ city, address }) => (
                <li
                  key={city}
                  className="flex gap-3 hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1"
                >
                  <span
                    className="material-symbols-outlined text-[#1DBFCE] shrink-0"
                    style={{ fontSize: "16px", marginTop: "1px" }}
                  >
                    location_on
                  </span>
                  <span>
                    <span className="text-white font-medium">{city}: </span>
                    {address}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Enlaces y otras sedes */}
          <div className="space-y-5">
            <h6 className="text-[#E8192C] font-bold uppercase tracking-widest text-xs">
              Enlaces & Otras Sedes
            </h6>
            <ul className="space-y-3 text-slate-400 text-sm">
              {[
                "Cali y Valle del Cauca",
                "Aviso de Privacidad",
                "Términos y Condiciones",
                "Preguntas Frecuentes",
              ].map((item) => (
                <li
                  key={item}
                  className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
          <p>© 2024 Contacto Médico. Salud con sentido humano.</p>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#1DBFCE]"
              style={{ fontSize: "16px" }}
            >
              health_and_safety
            </span>
            <span>Vigilado Supersalud</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
