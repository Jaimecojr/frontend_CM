import React from "react";

export function AlliesSection() {
  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <p className="text-center text-sm font-medium text-[#64748B] uppercase tracking-widest mb-10">
          NUESTROS ALIADOS ESTRATÉGICOS
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="h-12 flex items-center justify-center font-bold text-xl text-[#64748B]">
            Fundación Alejandro Londoño
          </div>
          <div className="h-12 flex items-center justify-center font-bold text-xl text-[#64748B]">
            Neuroimágenes
          </div>
          <div className="h-12 flex items-center justify-center font-bold text-xl text-[#64748B]">
            Quindimag
          </div>
          <div className="h-12 flex items-center justify-center font-bold text-xl text-[#64748B]">
            Laboratorio Clínico MLH
          </div>
          <div className="h-12 flex items-center justify-center font-bold text-xl text-[#64748B]">
            CDC IPS
          </div>
        </div>
      </div>
    </section>
  );
}
