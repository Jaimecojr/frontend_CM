import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ViewDoctorPage from "@/app/4dnn1n/doctors/[id]/page";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { getDoctor } from "@/app/4dnn1n/doctors/fetch";
import { alert } from "@/lib/alert";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";

// NOTE (finding, verified against the real page): unlike `franchises/[id]/page.tsx`,
// this view page DOES check permission — but only AFTER the data fetch settles.
// The real check order is: loading → skeleton; !initialData → error div (evaluated
// BEFORE authLoading/permission are even looked at); authLoading → null; permission
// → error div. Tests below exercise that exact ordering.

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
vi.mock("@/app/4dnn1n/doctors/fetch", () => ({
  getDoctor: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// surfaces `mode`/`initial` as data attributes for assertions.
vi.mock("@/app/4dnn1n/doctors/_components/DoctorForm", () => ({
  default: (props: any) => (
    <div
      data-testid="doctor-form"
      data-mode={props.mode}
      data-initial={props.initial ? JSON.stringify(props.initial) : undefined}
    />
  ),
}));

function createMockDoctor(overrides: Partial<ApiDoctor> = {}): ApiDoctor {
  return {
    id: 5,
    name: "Carlos",
    lastname: "Pérez",
    specialty_id: 1,
    city_id: 1,
    phone: "6011234567",
    movil: "3001234567",
    email: "carlos@test.com",
    address: "Calle 1",
    secretary_name: "Ana",
    value_agreement: 100000,
    state: 1,
    ...overrides,
  };
}

function mockAuth(type: number | null, loading = false) {
  (useAuth as any).mockReturnValue({
    user: type === null ? null : { id: 1, type },
    loading,
    isLoggingOut: false,
  });
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("ViewDoctorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 3: check ordering — data BEFORE permission ────
  describe("orden de checks (loading → dato → authLoading → permiso)", () => {
    it("loading: true → muestra FormPageSkeleton, sin renderizar el formulario", () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      // Left pending on purpose: assertions run before it ever resolves.
      (getDoctor as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<ViewDoctorPage />);

      // Assert
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
    });

    it("getDoctor rechaza → tras terminar loading, muestra 'No se pudo cargar el médico.' incluso con authLoading: true", async () => {
      // Arrange
      mockAuth(1, true);
      mockParams("5");
      (getDoctor as any).mockRejectedValue({ data: { message: "No encontrado" } });

      // Act
      render(<ViewDoctorPage />);

      // Assert: the null-data error appears even though authLoading is still true —
      // proof that the data check runs BEFORE the auth/permission checks.
      await waitFor(() =>
        expect(screen.getByText("No se pudo cargar el médico.")).toBeInTheDocument(),
      );
      expect(alert.error).toHaveBeenCalled();
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
    });

    it("dato cargado, authLoading: true → no renderiza nada (retorna null)", async () => {
      // Arrange
      mockAuth(1, true);
      mockParams("5");
      (getDoctor as any).mockResolvedValue(createMockDoctor());

      // Act
      const { container } = render(<ViewDoctorPage />);

      // Assert
      await waitFor(() => expect(getDoctor).toHaveBeenCalledWith(5));
      expect(container).toBeEmptyDOMElement();
    });

    it("dato cargado, user.type: 3 → muestra el mensaje de permisos insuficientes", async () => {
      // Arrange
      mockAuth(3);
      mockParams("5");
      (getDoctor as any).mockResolvedValue(createMockDoctor());

      // Act
      render(<ViewDoctorPage />);

      // Assert
      await waitFor(() =>
        expect(
          screen.getByText("No tienes permisos suficientes para acceder a esta vista."),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
    });

    it("dato cargado, user.type: 1 → renderiza DoctorForm con mode='view' e initial=data", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      const doctor = createMockDoctor({ id: 5 });
      (getDoctor as any).mockResolvedValue(doctor);

      // Act
      render(<ViewDoctorPage />);

      // Assert
      const form = await screen.findByTestId("doctor-form");
      expect(form).toHaveAttribute("data-mode", "view");
      expect(JSON.parse(form.getAttribute("data-initial") as string)).toEqual(doctor);
    });

    it("dato cargado, user.type: 2 → también tiene acceso: renderiza DoctorForm", async () => {
      // Arrange
      mockAuth(2);
      mockParams("5");
      (getDoctor as any).mockResolvedValue(createMockDoctor({ id: 5 }));

      // Act
      render(<ViewDoctorPage />);

      // Assert
      const form = await screen.findByTestId("doctor-form");
      expect(form).toHaveAttribute("data-mode", "view");
    });
  });
});
