import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewAffiliatePage from "@/app/4dnn1n/affiliates/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { alert } from "@/lib/alert";
import { apiFetch } from "@/lib/api";
import {
  createAffiliate,
  markMembershipFormConverted,
} from "@/app/4dnn1n/affiliates/fetch";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

// Full `fetch.ts` module is mocked so no real `apiFetch` (from the affiliates
// module, distinct from the `@/lib/api` one used for prefill) ever fires.
vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({
  createAffiliate: vi.fn(),
  markMembershipFormConverted: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and surfaces `mode`/`initial` as data attributes for assertions.
vi.mock("@/app/4dnn1n/affiliates/_components/AffiliateForm", () => ({
  default: (props: any) => (
    <div
      data-testid="affiliate-form"
      data-mode={props.mode}
      data-initial={props.initial ? JSON.stringify(props.initial) : undefined}
    >
      <button
        data-testid="submit-stub"
        onClick={() => props.onSubmit?.({ name: "Nuevo Afiliado", movil: "3000000000" })}
      >
        submit-stub
      </button>
    </div>
  ),
}));

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({
    user: { id: 1, type },
    loading: false,
    isLoggingOut: false,
  });
}

function mockSearchParams(from: string | null) {
  (useSearchParams as any).mockReturnValue({ get: vi.fn(() => from) });
}

describe("NewAffiliatePage", () => {
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ push: pushMock });
  });

  // ──── Step 1: permisos y prefill ────
  describe("permisos y prefill", () => {
    it("muestra el mensaje de permisos insuficientes para user.type: 3", () => {
      // Arrange
      mockAuth(3);
      mockSearchParams(null);

      // Act
      render(<NewAffiliatePage />);

      // Assert
      expect(
        screen.getByText(/no tienes permisos suficientes para acceder a esta vista/i),
      ).toBeInTheDocument();
    });

    it("sin ?from= renderiza AffiliateForm con mode='create' e initial=undefined", async () => {
      // Arrange
      mockAuth(1);
      mockSearchParams(null);

      // Act
      render(<NewAffiliatePage />);

      // Assert
      const form = await screen.findByTestId("affiliate-form");
      expect(form).toHaveAttribute("data-mode", "create");
      expect(form).not.toHaveAttribute("data-initial");
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("con ?from=42 llama apiFetch y mapea initial con los campos esperados", async () => {
      // Arrange
      mockAuth(1);
      mockSearchParams("42");
      (apiFetch as any).mockResolvedValue({
        data: {
          id: 42,
          name: "Carlos",
          lastname: "Ruiz",
          id_card: "1111111111",
          phone: "3001112222",
          email: "carlos@test.com",
          bithdate: "1990-01-01",
          address: "Cra 1",
          city_id: 5,
          city: { id: 5, name: "Cali" },
          membership_form_beneficiaries: [{ name: "Ben1" }, { name: "Ben2" }],
        },
      });

      // Act
      render(<NewAffiliatePage />);

      // Assert
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith("/api/membership-forms/42"),
      );
      const form = await screen.findByTestId("affiliate-form");
      await waitFor(() => expect(form).toHaveAttribute("data-initial"));
      const initial = JSON.parse(form.getAttribute("data-initial") as string);
      expect(initial).toEqual({
        name: "Carlos",
        lastname: "Ruiz",
        id_card: "1111111111",
        movil: "3001112222",
        email: "carlos@test.com",
        bithdate: "1990-01-01",
        address: "Cra 1",
        city_id: 5,
        city: { id: 5, name: "Cali" },
        beneficiaries: [{ name: "Ben1" }, { name: "Ben2" }],
      });
    });

    it("con ?from= mapea bithdate ausente y sin beneficiarios usando los defaults (undefined / [])", async () => {
      // Arrange
      mockAuth(1);
      mockSearchParams("43");
      (apiFetch as any).mockResolvedValue({
        data: {
          id: 43,
          name: "Ana",
          lastname: "Gómez",
          id_card: "2222222222",
          phone: "3002223333",
          email: "ana@test.com",
          bithdate: null,
          address: "Cra 2",
          city_id: 6,
          city: null,
        },
      });

      // Act
      render(<NewAffiliatePage />);

      // Assert
      const form = await screen.findByTestId("affiliate-form");
      await waitFor(() => expect(form).toHaveAttribute("data-initial"));
      const initial = JSON.parse(form.getAttribute("data-initial") as string);
      expect(initial.bithdate).toBeUndefined();
      expect(initial.city).toBeUndefined();
      expect(initial.beneficiaries).toEqual([]);
    });

    it("si el fetch de prefill rechaza, continúa con el formulario vacío sin lanzar error visible", async () => {
      // Arrange
      mockAuth(1);
      mockSearchParams("42");
      (apiFetch as any).mockRejectedValue(new Error("network error"));

      // Act
      render(<NewAffiliatePage />);

      // Assert
      const form = await screen.findByTestId("affiliate-form");
      expect(form).not.toHaveAttribute("data-initial");
      expect(form).toHaveAttribute("data-mode", "create");
    });
  });

  // ──── Step 1 (cont.): handleCreate ────
  describe("handleCreate", () => {
    it("sin from: confirma, crea el afiliado, no marca conversión, y redirige a /4dnn1n/affiliates", async () => {
      // Arrange
      mockAuth(1);
      mockSearchParams(null);
      (createAffiliate as any).mockResolvedValue({ message: "ok" });
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        if (onConfirm) await onConfirm();
        return true;
      });

      render(<NewAffiliatePage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(createAffiliate).toHaveBeenCalledWith({
          name: "Nuevo Afiliado",
          movil: "3000000000",
        }),
      );
      expect(markMembershipFormConverted).not.toHaveBeenCalled();
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/affiliates");
    });

    it("con from=42: crea el afiliado, marca la solicitud como convertida y redirige a /4dnn1n/membership-forms", async () => {
      // Arrange
      mockAuth(1);
      mockSearchParams("42");
      (apiFetch as any).mockResolvedValue({
        data: {
          id: 42,
          name: "Carlos",
          lastname: "Ruiz",
          id_card: "1111111111",
          phone: "3001112222",
          email: "carlos@test.com",
          address: "Cra 1",
          city_id: 5,
        },
      });
      (createAffiliate as any).mockResolvedValue({ message: "ok" });
      (markMembershipFormConverted as any).mockResolvedValue(undefined);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        if (onConfirm) await onConfirm();
        return true;
      });

      render(<NewAffiliatePage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(createAffiliate).toHaveBeenCalled());
      await waitFor(() => expect(markMembershipFormConverted).toHaveBeenCalledWith(42));
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/membership-forms");
    });

    it("un rechazo de markMembershipFormConverted no rompe el flujo de creación", async () => {
      // Arrange
      mockAuth(1);
      mockSearchParams("42");
      (apiFetch as any).mockResolvedValue({
        data: {
          id: 42,
          name: "Carlos",
          lastname: "Ruiz",
          id_card: "1111111111",
          phone: "3001112222",
          email: "carlos@test.com",
          address: "Cra 1",
          city_id: 5,
        },
      });
      (createAffiliate as any).mockResolvedValue({ message: "ok" });
      (markMembershipFormConverted as any).mockRejectedValue(new Error("convert failed"));
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        if (onConfirm) await onConfirm();
        return true;
      });

      render(<NewAffiliatePage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert: the flow still succeeds despite the rejected conversion call
      await waitFor(() => expect(markMembershipFormConverted).toHaveBeenCalledWith(42));
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(alert.error).not.toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/membership-forms");
    });
  });
});
