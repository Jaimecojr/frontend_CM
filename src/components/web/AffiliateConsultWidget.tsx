"use client";

import React, { useState } from "react";
import { checkAffiliateStatus } from "@/services/affiliateService";

export function AffiliateConsultWidget() {
  const [docType, setDocType] = useState("CC");
  const [docNum, setDocNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await checkAffiliateStatus(docType, docNum);
      if (response.success && response.data) {
        setResult({
          success: true,
          message: `Hola ${response.data.name}, tu estado es: ${
            response.data.stade === 1 ? "Activo" : "Inactivo"
          }.`,
        });
      } else {
        setResult({
          success: false,
          message: response.message || "No se encontró el afiliado.",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Ocurrió un error al consultar. Intente nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-[#e5eeff]">
      <h3 className="font-semibold text-2xl mb-6 text-[#1A1A2E]">
        Consulta de Afiliado
      </h3>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-[#64748B] mb-2">
            Tipo de Documento
          </label>
          <select
            className="w-full bg-[#ffffff] border border-[#e5eeff] rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#1DBFCE] transition-all outline-none"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="CC">Cédula de Ciudadanía</option>
            <option value="CE">Cédula de Extranjería</option>
            <option value="TI">Tarjeta de Identidad</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#64748B] mb-2">
            Número de Documento
          </label>
          <input
            className="w-full bg-[#ffffff] border border-[#e5eeff] rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#1DBFCE] transition-all outline-none"
            placeholder="Ej. 1094..."
            type="text"
            value={docNum}
            onChange={(e) => setDocNum(e.target.value)}
            required
          />
        </div>
        
        {result && (
          <div
            className={`p-4 rounded-xl text-sm font-medium ${
              result.success
                ? "bg-[#eff4ff] text-[#1DBFCE] border border-[#dce9ff]"
                : "bg-[#ffdad6] text-[#93000a] border border-[#ffb3ae]"
            }`}
          >
            {result.message}
          </div>
        )}

        <button
          className="w-full py-4 bg-[#1DBFCE] text-white rounded-xl font-semibold text-base shadow-md hover:bg-[#1DBFCE]/90 transition-all uppercase tracking-wide disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "Consultando..." : "Consultar Estado"}
        </button>
      </form>
    </div>
  );
}
