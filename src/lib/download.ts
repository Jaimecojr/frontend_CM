import { ApiError, type ApiErrorData, csrf, getXsrfToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Downloads a file from an authenticated backend endpoint and triggers the
 * browser's save dialog. Deliberately separate from apiFetch — that helper
 * always calls res.json(), which breaks on a binary .xlsx response body.
 *
 * @param path Backend path including any query string, e.g.
 *   "/api/reports/sales/export?from=2026-01-01".
 * @param fallbackFilename Used only if the server's Content-Disposition
 *   header can't be read (e.g. CORS exposed_headers misconfigured — the
 *   backend already sets this correctly).
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  await csrf();

  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { "X-XSRF-TOKEN": getXsrfToken() ?? "" },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ApiErrorData;
    throw new ApiError(data?.message || `Error ${res.status} al exportar`, res.status, data);
  }

  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] || fallbackFilename;

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
