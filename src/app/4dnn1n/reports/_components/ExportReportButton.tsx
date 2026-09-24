"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui-elements/button";
import { downloadFile } from "@/lib/download";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

/**
 * Export trigger shared by every report page. Builds the query string from
 * the same filter object the on-screen table fetched with, so the exported
 * file always matches what the user is looking at — never a stale or
 * partial filter set from a second, independent read of the form.
 */
export function ExportReportButton({
  path,
  params,
  fallbackFilename,
  label = "Generar reporte",
}: {
  path: string;
  params: Record<string, string | undefined>;
  fallbackFilename: string;
  label?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, v);
      }
      const query = qs.toString();
      await downloadFile(`${path}${query ? `?${query}` : ""}`, fallbackFilename);
    } catch (err) {
      await alert.error("No se pudo exportar", getApiErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outlinePrimary"
      size="small"
      shape="rounded"
      className="h-9 shrink-0"
      onClick={handleExport}
      disabled={isExporting}
      title={label}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">{isExporting ? "Generando..." : label}</span>
    </Button>
  );
}
