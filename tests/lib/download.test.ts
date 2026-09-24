import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadFile } from "@/lib/download";
import { ApiError } from "@/lib/api";

describe("downloadFile", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("descarga el archivo usando el filename del header Content-Disposition", async () => {
    // Arrange
    const headers = new Headers({
      "Content-Disposition": 'attachment; filename="Reporte_Ventas_23-09-2026.xlsx"',
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers,
      blob: vi.fn().mockResolvedValue(new Blob(["data"])),
    });
    const clickSpy = vi.fn();
    const anchor = { click: clickSpy, href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    // Act
    await downloadFile("/api/reports/sales/export", "fallback.xlsx");

    // Assert
    expect(anchor.download).toBe("Reporte_Ventas_23-09-2026.xlsx");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("usa fallbackFilename cuando no hay header Content-Disposition", async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      blob: vi.fn().mockResolvedValue(new Blob(["data"])),
    });
    const anchor = { click: vi.fn(), href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    // Act
    await downloadFile("/api/reports/sales/export", "fallback.xlsx");

    // Assert
    expect(anchor.download).toBe("fallback.xlsx");
  });

  it("lanza ApiError con el mensaje del backend cuando la respuesta no es ok", async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ message: "No tiene permisos para exportar este reporte" }),
    });

    // Act & Assert
    await expect(downloadFile("/api/reports/unsent-carnets/export", "f.xlsx")).rejects.toThrow(
      "No tiene permisos para exportar este reporte",
    );
    await expect(downloadFile("/api/reports/unsent-carnets/export", "f.xlsx")).rejects.toBeInstanceOf(ApiError);
  });

  it("envía credentials: include y Accept: application/json, sin token CSRF (es un GET)", async () => {
    // Arrange — a GET is never subject to Laravel's CSRF middleware, so this
    // request must carry neither an X-XSRF-TOKEN header nor a CSRF round-trip;
    // Accept: application/json is what makes an expired-session response come
    // back as a parseable JSON 401 instead of an HTML error page.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      blob: vi.fn().mockResolvedValue(new Blob(["data"])),
    });
    const anchor = { click: vi.fn(), href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    // Act
    await downloadFile("/api/reports/sales/export", "f.xlsx");

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/reports/sales/export"),
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("difiere URL.revokeObjectURL con setTimeout en vez de revocarlo de inmediato", async () => {
    // Arrange — Safari can abort an in-flight save if the blob URL is
    // revoked synchronously right after click(), so the revoke must be
    // scheduled for the next macrotask instead of running inline.
    vi.useFakeTimers();
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        blob: vi.fn().mockResolvedValue(new Blob(["data"])),
      });
      const anchor = { click: vi.fn(), href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
      vi.spyOn(document, "createElement").mockReturnValue(anchor);
      vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

      // Act
      await downloadFile("/api/reports/sales/export", "f.xlsx");

      // Assert — not revoked yet, only after the deferred timer fires
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    } finally {
      vi.useRealTimers();
    }
  });
});
