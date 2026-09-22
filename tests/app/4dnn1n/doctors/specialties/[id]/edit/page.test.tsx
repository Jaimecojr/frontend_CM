import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditSpecialtyPage from "@/app/4dnn1n/doctors/specialties/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getSpecialty, updateSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";
import type { ApiSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

// NOTE (finding, verified against the real page): unlike `doctors/[id]/edit`,
// `hasAccess` here is computed directly from `useAuth()` with NO `authLoading`
// wait at all. The check order is: `loading` → `FormPageSkeleton(fields=2)`
// (note: 2, not the 10 used by `doctors`); `!initialData` → error div;
// `!hasAccess` → error div.

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/doctors/specialties/fetch", () => ({
  getSpecialty: vi.fn(),
  updateSpecialty: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload.
vi.mock("@/app/4dnn1n/doctors/specialties/_components/SpecialtyForm", () => ({
  default: (props: any) => (
    <div data-testid="specialty-form">
      <button
        data-testid="submit-stub"
        onClick={() => props.onSubmit?.({ name: "Cardiología Editada", state: 0 })}
      >
        submit-stub
      </button>
    </div>
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

describe("EditSpecialtyPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
    // Default resolved value: the data-fetch effect fires unconditionally,
    // so give it something to resolve even in tests where the rendered
    // result is discarded due to the gate.
    (getSpecialty as any).mockResolvedValue(createMockSpecialty());
  });

  // ──── Step 4: check ordering (loading → data → permission, no authLoading) ────
  describe("orden de checks (loading → dato → permiso, sin authLoading)", () => {
    it("loading: true → muestra FormPageSkeleton con fields=2, sin renderizar el formulario", () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      // Left pending on purpose: assertions run before it ever resolves.
      (getSpecialty as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<EditSpecialtyPage />);

      // Assert: FormPageSkeleton renders one FieldSkeleton block per `fields`,
      // each contributing 2 `.animate-pulse` elements (label + input), plus 3
      // more in the header — fields=2 means 4 + 3 = 7 total.
      expect(container.querySelectorAll(".animate-pulse").length).toBe(7);
      expect(screen.queryByTestId("specialty-form")).not.toBeInTheDocument();
    });

    it("getSpecialty rechaza → muestra 'No se pudo cargar la especialidad.'", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getSpecialty as any).mockRejectedValue({ data: { message: "No encontrada" } });

      // Act
      render(<EditSpecialtyPage />);

      // Assert
      await waitFor(() =>
        expect(screen.getByText("No se pudo cargar la especialidad.")).toBeInTheDocument(),
      );
      expect(alert.error).toHaveBeenCalled();
      expect(screen.queryByTestId("specialty-form")).not.toBeInTheDocument();
    });

    it("dato cargado, hasAccess: false (type 3) → muestra el mensaje de permisos", async () => {
      // Arrange
      mockAuth(3);
      mockParams("5");
      (getSpecialty as any).mockResolvedValue(createMockSpecialty());

      // Act
      render(<EditSpecialtyPage />);

      // Assert
      await waitFor(() =>
        expect(
          screen.getByText("No tienes permisos para acceder a esta página."),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("specialty-form")).not.toBeInTheDocument();
    });

    it("dato cargado, hasAccess: true (type 1) → renderiza el formulario con el nombre en el título", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getSpecialty as any).mockResolvedValue(createMockSpecialty({ name: "Cardiología" }));

      // Act
      render(<EditSpecialtyPage />);

      // Assert
      await waitFor(() => expect(screen.getByTestId("specialty-form")).toBeInTheDocument());
      expect(screen.getByText("Editar Especialidad: Cardiología")).toBeInTheDocument();
    });

    it("dato cargado, hasAccess: false (type 2) → ya no tiene acceso (solo super admin)", async () => {
      // Arrange
      mockAuth(2);
      mockParams("5");
      (getSpecialty as any).mockResolvedValue(createMockSpecialty());

      // Act
      render(<EditSpecialtyPage />);

      // Assert
      await waitFor(() =>
        expect(
          screen.getByText("No tienes permisos para acceder a esta página."),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("specialty-form")).not.toBeInTheDocument();
    });
  });

  // ──── Step 4 (cont.): handleSubmit with local `saving` state ────
  describe("handleSubmit (saving state try/finally)", () => {
    it("actualiza la especialidad, muestra alert.success y redirige a /4dnn1n/doctors/specialties", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getSpecialty as any).mockResolvedValue(createMockSpecialty({ id: 5 }));
      (updateSpecialty as any).mockResolvedValue({ id: 5, name: "Cardiología Editada", state: 0 });

      render(<EditSpecialtyPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(updateSpecialty).toHaveBeenCalledWith(5, { name: "Cardiología Editada", state: 0 }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/doctors/specialties");
    });

    it("si updateSpecialty rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getSpecialty as any).mockResolvedValue(createMockSpecialty({ id: 5 }));
      const apiError = { data: { message: "No se pudo actualizar la especialidad" } };
      (updateSpecialty as any).mockRejectedValue(apiError);

      render(<EditSpecialtyPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar la especialidad"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
