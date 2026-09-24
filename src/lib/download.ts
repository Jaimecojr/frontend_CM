import { ApiError, type ApiErrorData } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Downloads a file from an authenticated backend endpoint and triggers the
 * browser's save dialog. Deliberately separate from apiFetch — that helper
 * always calls res.json(), which breaks on a binary .xlsx response body.
 *
 * No CSRF token/retry here: Laravel's CSRF middleware only checks
 * state-changing verbs, and this is always a GET. `Accept: application/json`
 * is still sent so an expired session comes back as a JSON 401 (readable via
 * `ApiErrorData.message`) instead of an HTML error page.
 *
 * @param path Backend path including any query string, e.g.
 *   "/api/reports/sales/export?from=2026-01-01".
 * @param fallbackFilename Used only if the server's Content-Disposition
 *   header can't be read (e.g. CORS exposed_headers misconfigured — the
 *   backend already sets this correctly).
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
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
  // Deferred: revoking the object URL synchronously can abort the download
  // in Safari, which starts saving from the blob URL asynchronously after
  // the click. A macrotask gives the browser time to pick it up first.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}
