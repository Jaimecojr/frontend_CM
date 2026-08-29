import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AffiliateForm from "@/app/4dnn1n/affiliates/_components/AffiliateForm";
import { useAffiliateFormState } from "@/app/4dnn1n/affiliates/_hooks/useAffiliateFormState";

// Only the hook is mocked; `onlyDigits` (a pure helper re-exported from the same
// module) is kept real because the component still imports it directly and uses
// it inside a few input handlers. This is a pure-rendering/wiring test for
// AffiliateForm — the hook's own logic already has full coverage in
// useAffiliateFormState.test.ts.
vi.mock(
  "@/app/4dnn1n/affiliates/_hooks/useAffiliateFormState",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("@/app/4dnn1n/affiliates/_hooks/useAffiliateFormState")
    >();
    return {
      ...actual,
      useAffiliateFormState: vi.fn(),
    };
  },
);

type HookReturn = ReturnType<typeof useAffiliateFormState>;

function createMockFormState(overrides: Partial<HookReturn> = {}): HookReturn {
  return {
    isView: false,
    isEdit: false,
    isCreate: true,
    departments: [],
    cities: [],
    departmentId: "",
    setDepartmentId: vi.fn(),
    franchises: [],
    counselors: [],
    agreements: [],
    saving: false,
    idCardError: null,
    checkingIdCard: false,
    searchCounselor: "",
    setSearchCounselor: vi.fn(),
    showCounselors: false,
    setShowCounselors: vi.fn(),
    wantsRenovation: "no",
    setWantsRenovation: vi.fn(),
    renovationType: "vencimiento",
    setRenovationType: vi.fn(),
    renovationDateIni: "",
    setRenovationDateIni: vi.fn(),
    renovationValue: "",
    setRenovationValue: vi.fn(),
    renovationDatePayment: "",
    setRenovationDatePayment: vi.fn(),
    form: {
      name: "",
      lastname: "",
      id_card: "",
      address: "",
      bithdate: "",
      phone: "",
      movil: "",
      email: "",
      city_id: "",
      user_id: "",
      agreement_id: "",
      counselor_id: "",
      validity: "",
      validity_end: "",
      payment_date: "",
      balance: 0,
      value: 0,
      commission: 0,
      payment_commission: "no",
      company: "",
      carnet: "no",
      state: 1,
      stade: 1,
      contract_code: "",
      beneficiaries: [{ name: "" }],
    },
    setForm: vi.fn(),
    validateIdCard: vi.fn(),
    addBeneficiary: vi.fn(),
    removeBeneficiary: vi.fn(),
    updateBeneficiaryName: vi.fn(),
    filteredCounselors: [],
    canSubmit: true,
    submit: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  };
}

function renderForm(overrides: Partial<HookReturn> = {}) {
  const mockState = createMockFormState(overrides);
  vi.mocked(useAffiliateFormState).mockReturnValue(mockState);
  const view = render(<AffiliateForm mode="create" />);
  return { ...view, mockState };
}

describe("AffiliateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("visibilidad según mode", () => {
    it("modo 'view': todos los inputs están deshabilitados y no hay botones de acción", () => {
      // Arrange & Act
      const { container } = renderForm({ isView: true, isEdit: false, isCreate: false });

      // Assert
      const inputs = container.querySelectorAll("input");
      expect(inputs.length).toBeGreaterThan(0);
      inputs.forEach((input) => expect(input).toBeDisabled());
      expect(
        screen.queryByRole("button", { name: /guardar/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /limpiar/i }),
      ).not.toBeInTheDocument();
    });

    it("modo 'create': muestra 'Fecha de Venta', no muestra sección de renovación ni radios de carnet", () => {
      // Arrange & Act
      renderForm({ isView: false, isEdit: false });

      // Assert
      expect(screen.getByText(/fecha de venta/i)).toBeInTheDocument();
      expect(screen.queryByText(/renovar:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/carnet entregado/i)).not.toBeInTheDocument();
    });

    it("modo 'edit': oculta 'Fecha de Venta' standalone, muestra radios 'Renovar' y 'Carnet Entregado'", () => {
      // Arrange & Act
      renderForm({ isView: false, isEdit: true, isCreate: false });

      // Assert
      expect(screen.queryByText(/fecha de venta/i)).not.toBeInTheDocument();
      expect(screen.getByText(/renovar:/i)).toBeInTheDocument();
      expect(screen.getByText(/carnet entregado/i)).toBeInTheDocument();
    });
  });

  describe("sección de renovación (solo en isEdit)", () => {
    it("wantsRenovation 'no': no muestra el bloque 'Nueva vigencia'", () => {
      // Arrange & Act
      renderForm({ isEdit: true, isCreate: false, wantsRenovation: "no" });

      // Assert
      expect(screen.queryByText(/nueva vigencia/i)).not.toBeInTheDocument();
    });

    it("wantsRenovation 'si': muestra el bloque 'Nueva vigencia' con sus campos", () => {
      // Arrange & Act
      renderForm({
        isEdit: true,
        isCreate: false,
        wantsRenovation: "si",
        renovationDateIni: "2026-01-01",
        renovationValue: "150000",
        renovationDatePayment: "2026-01-02",
      });

      // Assert
      expect(screen.getByText(/nueva vigencia/i)).toBeInTheDocument();
      expect(screen.getByText(/inicio desde:/i)).toBeInTheDocument();
      expect(screen.getByText(/valor:/i)).toBeInTheDocument();
      expect(screen.getByText(/fecha de venta:/i)).toBeInTheDocument();
    });
  });

  describe("beneficiarios", () => {
    it("con 7 beneficiarios: no muestra 'Añadir beneficiario' y muestra el mensaje de límite alcanzado", () => {
      // Arrange
      const beneficiaries = Array.from({ length: 7 }, (_, i) => ({
        name: `Beneficiario ${i + 1}`,
      }));

      // Act
      renderForm({
        isView: false,
        form: { ...createMockFormState().form, beneficiaries },
      });

      // Assert
      expect(
        screen.queryByRole("button", { name: /añadir beneficiario/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/haz alcanzado el límite máximo de 7 beneficiarios\./i),
      ).toBeInTheDocument();
    });

    it("con 1 beneficiario: no muestra el botón de eliminar", () => {
      // Arrange & Act
      renderForm({
        form: {
          ...createMockFormState().form,
          beneficiaries: [{ name: "Único" }],
        },
      });

      // Assert
      expect(screen.queryByTitle("Eliminar")).not.toBeInTheDocument();
    });

    it("con 2 beneficiarios: muestra el botón de eliminar en ambos y el click invoca removeBeneficiary con el índice correcto", () => {
      // Arrange
      const removeBeneficiary = vi.fn();

      // Act
      renderForm({
        form: {
          ...createMockFormState().form,
          beneficiaries: [{ name: "Uno" }, { name: "Dos" }],
        },
        removeBeneficiary,
      });
      const deleteButtons = screen.getAllByTitle("Eliminar");

      // Assert
      expect(deleteButtons).toHaveLength(2);
      fireEvent.click(deleteButtons[0]);
      expect(removeBeneficiary).toHaveBeenCalledWith(0);
      fireEvent.click(deleteButtons[1]);
      expect(removeBeneficiary).toHaveBeenCalledWith(1);
    });

    it("escribir en el input de un beneficiario invoca updateBeneficiaryName con el índice y el valor", () => {
      // Arrange
      const updateBeneficiaryName = vi.fn();
      renderForm({
        form: {
          ...createMockFormState().form,
          beneficiaries: [{ name: "Uno" }, { name: "" }],
        },
        updateBeneficiaryName,
      });
      const inputs = screen.getAllByPlaceholderText("Nombre completo");

      // Act
      fireEvent.change(inputs[1], { target: { value: "Nuevo Nombre" } });

      // Assert
      expect(updateBeneficiaryName).toHaveBeenCalledWith(1, "Nuevo Nombre");
    });
  });

  describe("botones de acción", () => {
    it("canSubmit false: el botón 'Guardar' está deshabilitado", () => {
      // Arrange & Act
      renderForm({ canSubmit: false });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("canSubmit true y saving false: el botón está habilitado, dice 'Guardar' y el click invoca submit()", () => {
      // Arrange
      const submit = vi.fn();

      // Act
      renderForm({ canSubmit: true, saving: false, submit });
      const button = screen.getByRole("button", { name: /guardar/i });

      // Assert
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent("Guardar");
      fireEvent.click(button);
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it("saving true: el botón está deshabilitado y dice 'Guardando...'", () => {
      // Arrange & Act
      renderForm({ saving: true });

      // Assert
      const button = screen.getByRole("button", { name: /guardando/i });
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("Guardando...");
    });

    it("click en 'Limpiar' invoca clear()", () => {
      // Arrange
      const clear = vi.fn();
      renderForm({ clear });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

      // Assert
      expect(clear).toHaveBeenCalledTimes(1);
    });
  });
});
