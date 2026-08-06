"use client";

import React, { useState } from "react";
import { checkAffiliateStatus, AffiliateStatusResponse } from "@/services/affiliateService";
import { AffiliateStatusModal } from "@/components/web/AffiliateStatusModal";

export function AffiliateConsultWidget() {
  const [docNum, setDocNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AffiliateStatusResponse | null>(null);

  const handleDocNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocNum(e.target.value.replace(/\D/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await checkAffiliateStatus(docNum);
      setResult(response);
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
            className="w-full bg-[#f8faff] border border-[#e5eeff] rounded-xl py-3 px-4 text-[#64748B] outline-none disabled:cursor-not-allowed"
            value="CC"
            disabled
          >
            <option value="CC">Cédula de Ciudadanía</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#64748B] mb-2">
            Número de Documento
          </label>
          <input
            className="w-full bg-[#ffffff] border border-[#e5eeff] rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#1DBFCE] transition-all outline-none"
            placeholder="Ej. 1094947820"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={20}
            value={docNum}
            onChange={handleDocNumChange}
            required
          />
        </div>

        <button
          className="w-full py-4 bg-[#1DBFCE] text-white rounded-xl font-semibold text-base shadow-md hover:bg-[#1DBFCE]/90 transition-all uppercase tracking-wide disabled:opacity-50"
          type="submit"
          disabled={loading || docNum.length === 0}
        >
          {loading ? "Consultando..." : "Consultar Estado"}
        </button>
      </form>

      {result && (
        <AffiliateStatusModal result={result} onClose={() => setResult(null)} />
      )}
    </div>
  );
}
