import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ViewDoctorPage from "@/app/4dnn1n/doctors/[id]/page";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { getDoctor } from "@/app/4dnn1n/doctors/fetch";
import { alert } from "@/lib/alert";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";

// Check order: authLoading → permission → data loading → data-fail. Permission
// is resolved before any data fetch is trusted, so an unauthorized user never
// sees a data skeleton or error, only the permission message.

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

  describe("orden de checks (authLoading → permiso → loading → dato)", () => {
    it("authLoading: true → no renderiza nada (retorna null), sin llamar getDoctor", () => {
      // Arrange
      mockAuth(1, true);
      mockParams("5");

      // Act
      const { container } = render(<ViewDoctorPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });

    it("user.type: 3 → muestra el mensaje de permisos insuficientes sin esperar a getDoctor", () => {
      // Arrange
      mockAuth(3);
      mockParams("5");
      (getDoctor as any).mockReturnValue(new Promise(() => {}));

      // Act
      render(<ViewDoctorPage />);

      // Assert
      expect(
        screen.getByText("No tienes permisos suficientes para acceder a esta vista."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
    });

    it("con permiso, loading: true → muestra FormPageSkeleton, sin renderizar el formulario", () => {
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

    it("con permiso, getDoctor rechaza → tras terminar loading, muestra 'No se pudo cargar el médico.'", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getDoctor as any).mockRejectedValue({ data: { message: "No encontrado" } });

      // Act
      render(<ViewDoctorPage />);

      // Assert
      await waitFor(() =>
        expect(screen.getByText("No se pudo cargar el médico.")).toBeInTheDocument(),
      );
      expect(alert.error).toHaveBeenCalled();
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
