import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditAffiliatePage from "@/app/4dnn1n/affiliates/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import {
  getAffiliate,
  updateAffiliate,
  createRenovation,
} from "@/app/4dnn1n/affiliates/fetch";
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

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires. This
// also covers the page's dynamic `await import("../../fetch")` call inside
// `handleUpdate` — vi.mock intercepts by resolved module id, not by the
// literal specifier, so the dynamic import resolves to this same mock too.
vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({
  getAffiliate: vi.fn(),
  updateAffiliate: vi.fn(),
  createRenovation: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes two submit buttons invoking `onSubmit` with fixed test payloads —
// one without `renovation`, one with it — to exercise handleUpdate's special
// payload transformation.
vi.mock("@/app/4dnn1n/affiliates/_components/AffiliateForm", () => ({
  default: (props: any) => (
    <div data-testid="affiliate-form" data-mode={props.mode}>
      <button
        data-testid="submit-no-renovation"
        onClick={() =>
          props.onSubmit?.({
            name: "Actualizado",
            validity: "2025-01-01",
          })
        }
      >
        submit-no-renovation
      </button>
      <button
        data-testid="submit-with-renovation"
        onClick={() =>
          props.onSubmit?.({
            name: "Actualizado",
            validity: "2025-01-01",
            renovation: {
              date_ini: "2026-01-01",
              date_end: "2027-01-01",
              date_payment: "2026-01-02",
              value: 500000,
            },
          })
        }
      >
        submit-with-renovation
      </button>
    </div>
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

function mockConfirm() {
  (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
    if (onConfirm) await onConfirm();
    return true;
  });
}

describe("EditAffiliatePage", () => {
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ push: pushMock });
  });

  // ──── Step 3.1: estados de carga/permisos ────
  describe("Step 3.1: carga y permisos", () => {
    it("muestra el FormPageSkeleton mientras authLoading es true, sin renderizar el formulario", async () => {
      // Arrange
      mockAuth(1, true);
      mockParams("5");
      (getAffiliate as any).mockResolvedValue(createMockAffiliate());

      // Act
      const { container } = render(<EditAffiliatePage />);

      // Assert
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
      render(<EditAffiliatePage />);

      // Assert
      expect(
        await screen.findByText(/no tienes permisos suficientes para acceder a esta vista/i),
      ).toBeInTheDocument();
    });
  });

  // ──── Step 3.2/3.3: caso especial de handleUpdate ────
  describe("Step 3.2/3.3: handleUpdate y el payload de renovación", () => {
    it("SIN payload.renovation: llama updateAffiliate con 'validity' eliminado y NO llama createRenovation", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAffiliate as any).mockResolvedValue(createMockAffiliate());
      (updateAffiliate as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<EditAffiliatePage />);
      const submitButton = await screen.findByTestId("submit-no-renovation");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(updateAffiliate).toHaveBeenCalledWith(5, { name: "Actualizado" }),
      );
      expect(createRenovation).not.toHaveBeenCalled();
    });

    it("CON payload.renovation: transforma el payload (validity_end/stade) y llama createRenovation tras updateAffiliate", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAffiliate as any).mockResolvedValue(createMockAffiliate());
      (updateAffiliate as any).mockResolvedValue({ message: "ok" });
      (createRenovation as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<EditAffiliatePage />);
      const submitButton = await screen.findByTestId("submit-with-renovation");

      // Act
      await userEvent.click(submitButton);

      // Assert: no `renovation` nor `validity` keys, `validity_end` set from
      // `renovationData.date_end`, and `stade` forced to 1.
      await waitFor(() =>
        expect(updateAffiliate).toHaveBeenCalledWith(5, {
          name: "Actualizado",
          validity_end: "2027-01-01",
          stade: 1,
        }),
      );
      await waitFor(() =>
        expect(createRenovation).toHaveBeenCalledWith({
          date_ini: "2026-01-01",
          date_end: "2027-01-01",
          date_payment: "2026-01-02",
          value: 500000,
          affiliate_id: 5,
        }),
      );
    });

    it("tras el éxito, muestra alert.success y redirige a /4dnn1n/affiliates", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAffiliate as any).mockResolvedValue(createMockAffiliate());
      (updateAffiliate as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<EditAffiliatePage />);
      const submitButton = await screen.findByTestId("submit-no-renovation");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/affiliates");
    });

    it("si updateAffiliate rechaza, llama alert.error y NO redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAffiliate as any).mockResolvedValue(createMockAffiliate());
      const apiError = { data: { message: "No se pudo actualizar" } };
      (updateAffiliate as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<EditAffiliatePage />);
      const submitButton = await screen.findByTestId("submit-no-renovation");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar"),
      );
      expect(createRenovation).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
