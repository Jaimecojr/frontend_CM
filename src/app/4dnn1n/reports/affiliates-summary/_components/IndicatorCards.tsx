import type { AffiliatesSummaryIndicators } from "../types";

const CARDS: { key: keyof AffiliatesSummaryIndicators; label: string }[] = [
  { key: "titulares", label: "Titulares" },
  { key: "titulares_activos", label: "Titulares Activos" },
  { key: "titulares_inactivos", label: "Titulares Inactivos" },
  { key: "beneficiarios", label: "Beneficiarios" },
  { key: "beneficiarios_activos", label: "Beneficiarios Activos" },
  { key: "beneficiarios_inactivos", label: "Beneficiarios Inactivos" },
];

/**
 * Renders the report's six indicator cards. A stable `data-testid` per card
 * lets a test target one exact count without colliding with flatpickr's
 * day-grid cells — appended to `document.body` by the filter bar's date
 * pickers — which render the same plain digits (e.g. "20").
 */
export function IndicatorCards({ indicators }: { indicators: AffiliatesSummaryIndicators }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {CARDS.map((c) => (
        <div
          key={c.key}
          className="rounded-lg border border-neutral-200/60 bg-white p-5 text-center dark:border-dark-3 dark:bg-gray-dark"
        >
          <p
            data-testid={`indicator-${c.key}`}
            className="text-3xl font-bold text-dark dark:text-white"
          >
            {indicators[c.key]}
          </p>
          <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
