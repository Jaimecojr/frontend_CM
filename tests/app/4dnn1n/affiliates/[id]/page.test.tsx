import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ViewAffiliatePage from "@/app/4dnn1n/affiliates/[id]/page";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { alert } from "@/lib/alert";
import { getAffiliate } from "@/app/4dnn1n/affiliates/fetch";
import type { ApiAffiliate } from "@/app/4dnn1n/affiliates/types";

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
vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({
  getAffiliate: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// surfaces `mode`/`initial` as data attributes for assertions.
vi.mock("@/app/4dnn1n/affiliates/_components/AffiliateForm", () => ({
  default: (props: any) => (
    <div
      data-testid="affiliate-form"
      data-mode={props.mode}
      data-initial={props.initial ? JSON.stringify(props.initial) : undefined}
    />
  ),
}));

vi.mock("@/app/4dnn1n/affiliates/_components/AffiliateNotes", () => ({
  AffiliateNotes: (props: any) => (
    <div
      data-testid="affiliate-notes"
      data-affiliate-id={props.affiliateId}
      data-affiliate-name={props.affiliateName}
    />
  ),
}));

function createMockAffiliate(overrides: Partial<ApiAffiliate> = {}): ApiAffiliate {
  return {
    id: 5,
    counselor_id: 1,
    contract_code: "CNT005",
    name: "Juan",
    lastname: "Pérez",
    id_card: "1234567890",
    phone: null,
    movil: "3001234567",
    address: "Calle 1",
    city_id: 1,
    email: "juan@example.com",
    validity: "2025-01-01",
    agreement_id: 1,
    company: "Company",
    photo: null,
    photo_rename: null,
    validity_end: "2026-01-01",
    payment_date: "2025-01-01",
    value: 100000,
    balance: 0,
    commission: 5000,
    payment_commission: "si",
    stade: 1,
    carnet: "no",
    state: 1,
    user_id: 1,
    ...overrides,
  };
}

function mockAuth(type: number, loading = false) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading, isLoggingOut: false });
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("ViewAffiliatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el FormPageSkeleton mientras authLoading es true, sin renderizar el formulario", async () => {
    // Arrange
    mockAuth(1, true);
    mockParams("5");
    (getAffiliate as any).mockResolvedValue(createMockAffiliate());

    // Act
    const { container } = render(<ViewAffiliatePage />);

    // Assert: the skeleton renders its pulsing placeholders and the real form
    // never mounts while auth is still resolving.
    await waitFor(() => expect(getAffiliate).toHaveBeenCalled());
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("affiliate-form")).not.toBeInTheDocument();
  });

  it("muestra el mensaje de permisos insuficientes para user.type: 3", async () => {
    // Arrange
    mockAuth(3);
    mockParams("5");
    (getAffiliate as any).mockResolvedValue(createMockAffiliate());

    // Act
    render(<ViewAffiliatePage />);

    // Assert
    expect(
      await screen.findByText(/no tienes permisos suficientes para acceder a esta vista/i),
    ).toBeInTheDocument();
  });

  it("cuando getAffiliate resuelve, renderiza AffiliateForm en mode='view' y AffiliateNotes con el id/nombre correctos", async () => {
    // Arrange
    mockAuth(1);
    mockParams("5");
    const affiliate = createMockAffiliate({ id: 5, name: "Juan", lastname: "Pérez" });
    (getAffiliate as any).mockResolvedValue(affiliate);

    // Act
    render(<ViewAffiliatePage />);

    // Assert
    const form = await screen.findByTestId("affiliate-form");
    expect(form).toHaveAttribute("data-mode", "view");
    expect(JSON.parse(form.getAttribute("data-initial") as string)).toEqual(affiliate);

    const notes = screen.getByTestId("affiliate-notes");
    expect(notes).toHaveAttribute("data-affiliate-id", "5");
    expect(notes).toHaveAttribute("data-affiliate-name", "Juan Pérez");
  });

  it("cuando getAffiliate rechaza, llama alert.error y muestra el mensaje de carga fallida", async () => {
    // Arrange
    mockAuth(1);
    mockParams("5");
    const apiError = { data: { message: "No se pudo cargar el afiliado" } };
    (getAffiliate as any).mockRejectedValue(apiError);

    // Act
    render(<ViewAffiliatePage />);

    // Assert
    await waitFor(() =>
      expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo cargar el afiliado"),
    );
    expect(
      await screen.findByText(/no se pudo cargar el afiliado o no existe/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("affiliate-form")).not.toBeInTheDocument();
  });
});
