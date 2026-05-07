"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type ExpiringAffiliate, getExpiringToday } from "../../affiliates/fetch";

export function ExpiringTodayCard() {
  const [affiliates, setAffiliates] = useState<ExpiringAffiliate[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExpiringToday()
      .then(({ data, date }) => {
        setAffiliates(data);
        setDate(date);
      })
      .finally(() => setLoading(false));
  }, []);

  const fechaFormateada = date
    ? new Date(date + "T00:00:00").toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="col-span-12 rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card mb-4">
      <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
        <h3 className="text-base font-semibold text-dark dark:text-white">
          Contratos que vencen el día de hoy:{" "}
          {fechaFormateada && (
            <span className="text-primary">{fechaFormateada}</span>
          )}
        </h3>
      </div>

      {loading ? (
        <div className="px-6 py-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
          ))}
        </div>
      ) : affiliates.length === 0 ? (
        <p className="px-6 py-5 text-sm text-gray-500 dark:text-gray-400">
          No hay contratos que venzan hoy.
        </p>
      ) : (
        <div className="divide-y divide-stroke dark:divide-dark-3">
          {affiliates.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between px-6 py-3 hover:bg-gray-1 dark:hover:bg-dark-2"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-dark dark:text-white">
                  {a.lastname} {a.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  CC: {a.id_card}
                  {a.agreement && (
                    <span className="ml-3 text-gray-400">· {a.agreement.name}</span>
                  )}
                  {a.counselor && (
                    <span className="ml-3 text-gray-400">
                      · Asesor: {a.counselor.name} {a.counselor.lastname}
                    </span>
                  )}
                </span>
              </div>
              <Link
                href={`/4dnn1n/affiliates/${a.id}`}
                className="text-xs text-primary hover:underline"
              >
                Ver
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
