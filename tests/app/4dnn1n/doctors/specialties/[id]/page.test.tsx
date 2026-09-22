import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SpecialtyViewPage from "@/app/4dnn1n/doctors/specialties/[id]/page";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { useServerTable } from "@/hooks/useServerTable";
import { getSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";
import { getDoctors } from "@/app/4dnn1n/doctors/fetch";
import { buildSpecialtyDoctorColumns } from "@/app/4dnn1n/doctors/_components/columns";
import type { ApiSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

// NOTE (finding, verified against the real page): unlike every other
// `[id]/page.tsx` in this phase, the check order here is `!specialty` (its
// own inline skeleton, not `FormPageSkeleton`) THEN `!hasAccess` — there is
// no `authLoading` wait at all. It also mounts its own nested
// `useServerTable(getDoctors, ...)` to list the specialty's doctors via
// `buildSpecialtyDoctorColumns()` (already tested in a previous task, mocked
// here to isolate the page) with `enableStateFilter={false}`.

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/hooks/useServerTable", () => ({ useServerTable: vi.fn() }));

// Full `fetch.ts` modules are mocked so no real `apiFetch` call ever fires
// from this page-level test.
vi.mock("@/app/4dnn1n/doctors/specialties/fetch", () => ({
  getSpecialty: vi.fn(),
}));

vi.mock("@/app/4dnn1n/doctors/fetch", () => ({
  getDoctors: vi.fn(),
}));

// Already tested in a previous task — mocked here to isolate the page.
vi.mock("@/app/4dnn1n/doctors/_components/columns", () => ({
  buildSpecialtyDoctorColumns: vi.fn(() => []),
}));

// `DataTable` renders no real columns; the stub surfaces the props this page
// controls directly (`enableStateFilter`, `searchPlaceholder`) for assertions.
vi.mock("@/components/data-table/DataTable", () => ({
  DataTable: (props: any) => (
    <div
      data-testid="data-table"
      data-enable-state-filter={String(props.enableStateFilter)}
      data-search-placeholder={props.searchPlaceholder}
    />
  ),
}));

function createMockSpecialty(overrides: Partial<ApiSpecialty> = {}): ApiSpecialty {
  return {
    id: 5,
    name: "Cardiología",
    state: 1,
    ...overrides,
  };
}

function mockAuth(type: number | null) {
  (useAuth as any).mockReturnValue({ user: type === null ? null : { id: 1, type } });
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

function mockServerTable() {
  const setData = vi.fn();
  const setMeta = vi.fn();
  (useServerTable as any).mockReturnValue({
    data: [],
    setData,
    setMeta,
    stadeFilter: "1",
    tableProps: { data: [], loading: false, enableStateFilter: true },
  });
  return { setData, setMeta };
}

describe("SpecialtyViewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 3: check ordering — data (own skeleton) BEFORE permission ────
  describe("orden de checks (!specialty → skeleton propio; !hasAccess → permiso)", () => {
    it("getSpecialty sin resolver → muestra el skeleton propio (clases animate-pulse), sin DataTable", () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      mockServerTable();
      // Left pending on purpose: assertions run before it ever resolves.
      (getSpecialty as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<SpecialtyViewPage />);

      // Assert
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
      expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
      expect(screen.queryByText("DATOS DE LA ESPECIALIZACIÓN")).not.toBeInTheDocument();
    });

    it("resuelto, hasAccess: false (type 3) → muestra 'No tienes permisos para acceder a esta página.'", async () => {
      // Arrange
      mockAuth(3);
      mockParams("5");
      mockServerTable();
      (getSpecialty as any).mockResolvedValue(createMockSpecialty());

      // Act
      render(<SpecialtyViewPage />);

      // Assert
      await waitFor(() =>
        expect(
          screen.getByText("No tienes permisos para acceder a esta página."),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
    });

    it("resuelto, hasAccess: true (type 1) → título, descripción con el nombre y tabla con enableStateFilter=false", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      mockServerTable();
      (getSpecialty as any).mockResolvedValue(createMockSpecialty({ name: "Cardiología" }));

      // Act
      render(<SpecialtyViewPage />);

      // Assert
      await waitFor(() =>
        expect(screen.getByText("DATOS DE LA ESPECIALIZACIÓN")).toBeInTheDocument(),
      );
      expect(screen.getByText("Especialidad: Cardiología")).toBeInTheDocument();
      const table = screen.getByTestId("data-table");
      expect(table).toHaveAttribute("data-enable-state-filter", "false");
      expect(table).toHaveAttribute("data-search-placeholder", "Buscar médico...");
    });

    it("resuelto, hasAccess: false (type 2) → ya no tiene acceso (solo super admin)", async () => {
      // Arrange
      mockAuth(2);
      mockParams("5");
      mockServerTable();
      (getSpecialty as any).mockResolvedValue(createMockSpecialty());

      // Act
      render(<SpecialtyViewPage />);

      // Assert
      await waitFor(() =>
        expect(
          screen.getByText("No tienes permisos para acceder a esta página."),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
    });
  });

  // ──── Step 3 (cont.): nested useServerTable(getDoctors, ...) wiring ────
  describe("useServerTable anidado para los médicos de la especialidad", () => {
    it("invoca useServerTable(getDoctors, { defaultStade: '1', extraParams: { specialty_id } })", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      mockServerTable();
      (getSpecialty as any).mockResolvedValue(createMockSpecialty());

      // Act
      render(<SpecialtyViewPage />);
      await waitFor(() => expect(getSpecialty).toHaveBeenCalledWith(5));

      // Assert
      const calls = (useServerTable as any).mock.calls;
      const [fetchFnArg, optionsArg] = calls[calls.length - 1];
      expect(fetchFnArg).toBe(getDoctors);
      expect(optionsArg).toEqual({ defaultStade: "1", extraParams: { specialty_id: 5 } });
    });

    it("las columnas provienen de buildSpecialtyDoctorColumns()", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      mockServerTable();
      (getSpecialty as any).mockResolvedValue(createMockSpecialty());

      // Act
      render(<SpecialtyViewPage />);

      // Assert
      await waitFor(() => expect(buildSpecialtyDoctorColumns).toHaveBeenCalled());
    });
  });
});
