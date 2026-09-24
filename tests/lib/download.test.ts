import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadFile } from "@/lib/download";
import { ApiError } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    csrf: vi.fn().mockResolvedValue(undefined),
    getXsrfToken: vi.fn(() => "test-token"),
  };
});

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

  it("llama csrf antes de hacer fetch", async () => {
    // Arrange
    const { csrf } = await import("@/lib/api");
    const callOrder: string[] = [];
    (csrf as any).mockImplementation(async () => {
      callOrder.push("csrf");
    });
    global.fetch = vi.fn().mockImplementation(async () => {
      callOrder.push("fetch");
      return { ok: true, headers: new Headers(), blob: vi.fn().mockResolvedValue(new Blob()) };
    });
    const anchor = { click: vi.fn(), href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    // Act
    await downloadFile("/api/reports/sales/export", "f.xlsx");

    // Assert
    expect(callOrder).toEqual(["csrf", "fetch"]);
  });
});
