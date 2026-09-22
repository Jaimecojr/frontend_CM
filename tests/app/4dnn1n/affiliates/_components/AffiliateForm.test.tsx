import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AffiliateForm from "@/app/4dnn1n/affiliates/_components/AffiliateForm";
import { useAffiliateFormState } from "@/app/4dnn1n/affiliates/_hooks/useAffiliateFormState";
import { addOneYear } from "@/lib/dates";

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

// The real component wraps flatpickr (a DOM-manipulating third-party calendar
// lib) which isn't part of AffiliateForm's own logic — stubbed with a plain
// input so tests can drive each date field through a standard change event
// instead of flatpickr's imperative API (same pattern as the appointments
// module's form tests).
vi.mock("@/components/FormElements/DatePicker/DatePickerWithToday", () => ({
  default: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
  }) => (
    <input
      data-testid="date-input-stub"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

type HookReturn = ReturnType<typeof useAffiliateFormState>;

function createMockFormState(overrides: Partial<HookReturn> = {}): HookReturn {
  return {
    isView: false,
    isEdit: false,
    isCreate: true,
    departments: [],
    cities: [],
    citiesLoading: false,
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

// Each field's <label> is a sibling of its <input>, not wrapping/linked to it
// (no htmlFor/id), so `getByLabelText` can't find them — look up the label
// text and use its parent container instead, matching the pattern already
// established in the appointments module's form tests.
function getFieldContainer(labelText: RegExp): HTMLElement {
  const label = screen.getByText(labelText, { selector: "label" });
  return label.parentElement as HTMLElement;
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
      expect(updateBeneficiaryName).toHaveBeenCalledWith(1, "NUEVO NOMBRE");
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

  describe("campos de texto y numéricos", () => {
    it("documento: aplica onlyDigits y actualiza id_card; onBlur invoca validateIdCard", () => {
      // Arrange
      const setForm = vi.fn();
      const validateIdCard = vi.fn();
      renderForm({
        setForm,
        validateIdCard,
        form: { ...createMockFormState().form, id_card: "" },
      });
      const input = screen.getByPlaceholderText("Solo números");

      // Act
      fireEvent.change(input, { target: { value: "12a3b45" } });
      fireEvent.blur(input);

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ id_card: "12345" }),
      );
      expect(validateIdCard).toHaveBeenCalledWith("");
    });

    it("documento en modo view: onBlur NO invoca validateIdCard", () => {
      // Arrange
      const validateIdCard = vi.fn();
      renderForm({ isView: true, isEdit: false, isCreate: false, validateIdCard });
      const input = screen.getByPlaceholderText("Solo números");

      // Act
      fireEvent.blur(input);

      // Assert
      expect(validateIdCard).not.toHaveBeenCalled();
    });

    it("nombre y apellido: actualizan los campos correspondientes", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm });

      // Act
      fireEvent.change(
        getFieldContainer(/^nombre\(s\)/i).querySelector("input")!,
        { target: { value: "Juan" } },
      );
      fireEvent.change(
        getFieldContainer(/^apellido\(s\)/i).querySelector("input")!,
        { target: { value: "Pérez" } },
      );

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ name: "JUAN" }));
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ lastname: "PÉREZ" }),
      );
    });

    it("teléfono: conserva solo dígitos, comas, guiones y espacios", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm });

      // Act
      fireEvent.change(
        getFieldContainer(/^teléfono/i).querySelector("input")!,
        { target: { value: "abc300-123,456 xyz" } },
      );

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "300-123,456 " }),
      );
    });

    it("celular: aplica onlyDigits y recorta a 10 dígitos", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm });

      // Act
      fireEvent.change(
        getFieldContainer(/celular/i).querySelector("input")!,
        { target: { value: "30a0123456789" } },
      );

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ movil: "3001234567" }),
      );
    });

    it("email, dirección y empresa: actualizan los campos correspondientes", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm });

      // Act
      fireEvent.change(getFieldContainer(/^email/i).querySelector("input")!, {
        target: { value: "juan@test.com" },
      });
      fireEvent.change(
        getFieldContainer(/^dirección/i).querySelector("input")!,
        { target: { value: "Calle 1 # 2-3" } },
      );
      fireEvent.change(getFieldContainer(/^empresa/i).querySelector("input")!, {
        target: { value: "ACME" },
      });

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ email: "juan@test.com" }),
      );
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ address: "CALLE 1 # 2-3" }),
      );
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ company: "ACME" }),
      );
    });

    it("saldo y comisión: convierten el valor a número", () => {
      // Arrange: the commission amount is only shown when "¿Pago de Comisión?" is "si"
      const setForm = vi.fn();
      renderForm({
        setForm,
        form: { ...createMockFormState().form, payment_commission: "si" },
      });

      // Act
      fireEvent.change(getFieldContainer(/^saldo/i).querySelector("input")!, {
        target: { value: "50000" },
      });
      fireEvent.change(
        getFieldContainer(/^comisión/i).querySelector("input")!,
        { target: { value: "7500" } },
      );

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ balance: 50000 }));
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ commission: 7500 }),
      );
    });

    it("saldo y comisión: muestran el valor con punto de miles", () => {
      // Arrange & Act
      renderForm({
        form: {
          ...createMockFormState().form,
          balance: 52383,
          commission: 1234567,
          payment_commission: "si",
        },
      });

      // Assert
      expect(getFieldContainer(/^saldo/i).querySelector("input")).toHaveValue("52.383");
      expect(getFieldContainer(/^comisión/i).querySelector("input")).toHaveValue("1.234.567");
    });

    it("saldo: se puede vaciar por completo (queda en 0 sin que reaparezca un '0' imborrable)", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm, form: { ...createMockFormState().form, balance: 5 } });

      // Act
      fireEvent.change(getFieldContainer(/^saldo/i).querySelector("input")!, {
        target: { value: "" },
      });

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ balance: 0 }));
    });

    it("saldo y comisión en 0 se ven como campo vacío con placeholder '0'", () => {
      // Arrange & Act
      renderForm({ form: { ...createMockFormState().form, payment_commission: "si" } });

      // Assert
      for (const label of [/^saldo/i, /^comisión/i]) {
        const input = getFieldContainer(label).querySelector("input")!;
        expect(input).toHaveValue("");
        expect(input).toHaveAttribute("placeholder", "0");
      }
    });

    it("la comisión NO se muestra cuando '¿Pago de Comisión?' es 'no'", () => {
      // Arrange & Act
      renderForm({
        form: { ...createMockFormState().form, payment_commission: "no", commission: 5000 },
      });

      // Assert
      expect(screen.queryByText(/^comisión/i, { selector: "label" })).not.toBeInTheDocument();
    });

    it("la comisión SÍ se muestra cuando '¿Pago de Comisión?' es 'si'", () => {
      // Arrange & Act
      renderForm({ form: { ...createMockFormState().form, payment_commission: "si" } });

      // Assert
      expect(screen.getByText(/^comisión/i, { selector: "label" })).toBeInTheDocument();
    });

    it("orden del bloque: Saldo, luego '¿Pago de Comisión?' y al final el valor de la Comisión", () => {
      // Arrange & Act
      renderForm({ form: { ...createMockFormState().form, payment_commission: "si" } });
      const saldo = screen.getByText(/^saldo/i, { selector: "label" });
      const pago = screen.getByText(/pago de comisión/i, { selector: "label" });
      const comision = screen.getByText(/^comisión/i, { selector: "label" });

      // Assert
      expect(saldo.compareDocumentPosition(pago) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(pago.compareDocumentPosition(comision) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("cambiar '¿Pago de Comisión?' a 'no' oculta el campo pero conserva el valor ya guardado", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({
        setForm,
        form: { ...createMockFormState().form, payment_commission: "si", commission: 5000 },
      });
      const radios = screen
        .getAllByRole("radio", { name: /^(sí|no)$/i })
        .filter((r) => (r as HTMLInputElement).name === "payment_commission");

      // Act
      fireEvent.click(radios[1]);

      // Assert: only the flag changes; the amount is not silently zeroed
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ payment_commission: "no", commission: 5000 }),
      );
    });

    it("fecha de nacimiento: onChange del DatePicker actualiza bithdate", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm });
      // Order in the DOM for mode="create": bithdate, validity, payment_date.
      const [bithdateInput] = screen.getAllByTestId("date-input-stub");

      // Act
      fireEvent.change(bithdateInput, { target: { value: "1990-05-20" } });

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ bithdate: "1990-05-20" }),
      );
    });

    it("¿Pago de Comisión?: click en 'Sí' (partiendo de 'no') invoca setForm con payment_commission 'si'", () => {
      // Arrange — a radio that's already checked doesn't fire a native change
      // event on click, so each direction needs the opposite starting value.
      const setForm = vi.fn();
      renderForm({
        setForm,
        form: { ...createMockFormState().form, payment_commission: "no" },
      });
      const radios = screen
        .getAllByRole("radio", { name: /^(sí|no)$/i })
        .filter((r) => (r as HTMLInputElement).name === "payment_commission");

      // Act
      fireEvent.click(radios[0]);

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ payment_commission: "si" }),
      );
    });

    it("¿Pago de Comisión?: click en 'No' (partiendo de 'si') invoca setForm con payment_commission 'no'", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({
        setForm,
        form: { ...createMockFormState().form, payment_commission: "si" },
      });
      const radios = screen
        .getAllByRole("radio", { name: /^(sí|no)$/i })
        .filter((r) => (r as HTMLInputElement).name === "payment_commission");

      // Act
      fireEvent.click(radios[1]);

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ payment_commission: "no" }),
      );
    });

    it("¿Carnet Entregado? (solo en modo edit): click en 'Sí' (partiendo de 'no') invoca setForm con carnet 'si'", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({
        isEdit: true,
        isCreate: false,
        setForm,
        form: { ...createMockFormState().form, carnet: "no" },
      });
      const radios = screen
        .getAllByRole("radio", { name: /^(sí|no)$/i })
        .filter((r) => (r as HTMLInputElement).name === "carnet_assigned");

      // Act
      fireEvent.click(radios[0]);

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ carnet: "si" }));
    });

    it("¿Carnet Entregado? (solo en modo edit): click en 'No' (partiendo de 'si') invoca setForm con carnet 'no'", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({
        isEdit: true,
        isCreate: false,
        setForm,
        form: { ...createMockFormState().form, carnet: "si" },
      });
      const radios = screen
        .getAllByRole("radio", { name: /^(sí|no)$/i })
        .filter((r) => (r as HTMLInputElement).name === "carnet_assigned");

      // Act
      fireEvent.click(radios[1]);

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ carnet: "no" }));
    });
  });

  describe("vigencia y fecha de venta (modo create)", () => {
    it("fecha inicial de vigencia: onChange calcula validity_end con addOneYear", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm });
      // Order in the DOM for mode="create": bithdate, validity, payment_date.
      const [, validityInput] = screen.getAllByTestId("date-input-stub");

      // Act
      fireEvent.change(validityInput, { target: { value: "2026-03-01" } });

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({
          validity: "2026-03-01",
          validity_end: addOneYear("2026-03-01"),
        }),
      );
    });

    it("fecha de venta: onChange actualiza payment_date", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({ setForm });
      const datePickers = screen.getAllByTestId("date-input-stub");
      // Order in the DOM for mode="create": bithdate, validity, payment_date.
      const paymentDateInput = datePickers[2];

      // Act
      fireEvent.change(paymentDateInput, { target: { value: "2026-04-15" } });

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ payment_date: "2026-04-15" }),
      );
    });
  });

  describe("sección de renovación: interacciones (modo edit)", () => {
    it("radios 'Renovar': click en 'Sí' (partiendo de 'no') invoca setWantsRenovation('si')", () => {
      // Arrange — a radio that's already checked doesn't fire a native change
      // event on click, so each direction needs the opposite starting value.
      const setWantsRenovation = vi.fn();
      renderForm({
        isEdit: true,
        isCreate: false,
        wantsRenovation: "no",
        setWantsRenovation,
      });
      const radios = screen
        .getAllByRole("radio", { name: /^(sí|no)$/i })
        .filter((r) => !(r as HTMLInputElement).name); // "Renovar" radios have no `name` attribute

      // Act
      fireEvent.click(radios[0]);

      // Assert
      expect(setWantsRenovation).toHaveBeenCalledWith("si");
    });

    it("radios 'Renovar': click en 'No' (partiendo de 'si') invoca setWantsRenovation('no')", () => {
      // Arrange
      const setWantsRenovation = vi.fn();
      renderForm({
        isEdit: true,
        isCreate: false,
        wantsRenovation: "si",
        setWantsRenovation,
      });
      const radios = screen
        .getAllByRole("radio", { name: /^(sí|no)$/i })
        .filter((r) => !(r as HTMLInputElement).name); // "Renovar" radios have no `name` attribute

      // Act
      fireEvent.click(radios[1]);

      // Assert
      expect(setWantsRenovation).toHaveBeenCalledWith("no");
    });

    it("radios 'Inicio desde': click en 'Hoy' (partiendo de 'vencimiento') invoca setRenovationType('hoy')", () => {
      // Arrange
      const setRenovationType = vi.fn();
      renderForm({
        isEdit: true,
        isCreate: false,
        wantsRenovation: "si",
        renovationType: "vencimiento",
        setRenovationType,
      });

      // Act
      fireEvent.click(screen.getByRole("radio", { name: /^hoy$/i }));

      // Assert
      expect(setRenovationType).toHaveBeenCalledWith("hoy");
    });

    it("radios 'Inicio desde': click en 'Fecha de vencimiento' (partiendo de 'hoy') invoca setRenovationType('vencimiento')", () => {
      // Arrange
      const setRenovationType = vi.fn();
      renderForm({
        isEdit: true,
        isCreate: false,
        wantsRenovation: "si",
        renovationType: "hoy",
        setRenovationType,
      });

      // Act
      fireEvent.click(screen.getByRole("radio", { name: /fecha de vencimiento/i }));

      // Assert
      expect(setRenovationType).toHaveBeenCalledWith("vencimiento");
    });

    it("fechas de la nueva vigencia: onChange invoca setRenovationDateIni/setRenovationDatePayment", () => {
      // Arrange
      const setRenovationDateIni = vi.fn();
      const setRenovationDatePayment = vi.fn();
      renderForm({
        isEdit: true,
        isCreate: false,
        wantsRenovation: "si",
        setRenovationDateIni,
        setRenovationDatePayment,
      });
      // Order in the DOM when wantsRenovation="si": bithdate, renovationDateIni,
      // renovationDatePayment (no `validity`/`payment_date` pickers in edit mode).
      const [, dateIniInput, datePaymentInput] = screen.getAllByTestId(
        "date-input-stub",
      );

      // Act
      fireEvent.change(dateIniInput, { target: { value: "2026-06-01" } });
      fireEvent.change(datePaymentInput, { target: { value: "2026-06-02" } });

      // Assert
      expect(setRenovationDateIni).toHaveBeenCalledWith("2026-06-01");
      expect(setRenovationDatePayment).toHaveBeenCalledWith("2026-06-02");
    });
  });

  describe("selects de ubicación y catálogos", () => {
    it("departamento: seleccionar una opción invoca setDepartmentId con un número", () => {
      // Arrange
      const setDepartmentId = vi.fn();
      renderForm({
        setDepartmentId,
        departments: [{ id: 7, name: "Antioquia" }],
      });

      // Act
      fireEvent.click(
        getFieldContainer(/^departamento/i).querySelector("input")!,
      );
      fireEvent.click(screen.getByRole("button", { name: "Antioquia" }));

      // Assert
      expect(setDepartmentId).toHaveBeenCalledWith(7);
    });

    it("ciudad (con departamento ya elegido): seleccionar una opción actualiza city_id", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({
        setForm,
        departmentId: 7,
        cities: [{ id: 3, name: "Medellín", department_id: 7 }],
      });

      // Act
      fireEvent.click(getFieldContainer(/^ciudad/i).querySelector("input")!);
      fireEvent.click(screen.getByRole("button", { name: "Medellín" }));

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ city_id: "3" }));
    });

    it("franquicia: seleccionar una opción actualiza user_id", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({
        setForm,
        franchises: [{ id: 4, name: "Franquicia Centro" }],
      });

      // Act
      fireEvent.click(
        getFieldContainer(/^franquicia/i).querySelector("input")!,
      );
      fireEvent.click(screen.getByRole("button", { name: "Franquicia Centro" }));

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ user_id: "4" }));
    });

    it("convenio: seleccionar una opción actualiza agreement_id", () => {
      // Arrange
      const setForm = vi.fn();
      renderForm({
        setForm,
        agreements: [{ id: 9, name: "Convenio X" }],
      });

      // Act
      fireEvent.click(getFieldContainer(/^convenio/i).querySelector("input")!);
      fireEvent.click(screen.getByRole("button", { name: "Convenio X" }));

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ agreement_id: "9" }),
      );
    });
  });

  describe("búsqueda de asesor", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("escribir en el buscador invoca setSearchCounselor, limpia counselor_id y abre la lista", () => {
      // Arrange
      const setSearchCounselor = vi.fn();
      const setForm = vi.fn();
      const setShowCounselors = vi.fn();
      renderForm({ setSearchCounselor, setForm, setShowCounselors });

      // Act
      fireEvent.change(screen.getByPlaceholderText("Buscar asesor..."), {
        target: { value: "Ana" },
      });

      // Assert
      expect(setSearchCounselor).toHaveBeenCalledWith("Ana");
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ counselor_id: "" }),
      );
      expect(setShowCounselors).toHaveBeenCalledWith(true);
    });

    it("onFocus abre la lista de sugerencias; onBlur la cierra tras el timeout", () => {
      // Arrange
      vi.useFakeTimers();
      const setShowCounselors = vi.fn();
      renderForm({ setShowCounselors });
      const input = screen.getByPlaceholderText("Buscar asesor...");

      // Act
      fireEvent.focus(input);
      fireEvent.blur(input);
      vi.advanceTimersByTime(200);

      // Assert
      expect(setShowCounselors).toHaveBeenCalledWith(true);
      expect(setShowCounselors).toHaveBeenCalledWith(false);
    });

    it("seleccionar un asesor de la lista actualiza counselor_id y cierra la lista", () => {
      // Arrange
      const setForm = vi.fn();
      const setSearchCounselor = vi.fn();
      const setShowCounselors = vi.fn();
      renderForm({
        setForm,
        setSearchCounselor,
        setShowCounselors,
        showCounselors: true,
        filteredCounselors: [{ id: 5, name: "Ana", lastname: "Ruiz" }],
      });

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Ana Ruiz" }));

      // Assert
      expect(setForm).toHaveBeenCalledWith(
        expect.objectContaining({ counselor_id: "5" }),
      );
      expect(setSearchCounselor).toHaveBeenCalledWith("Ana Ruiz");
      expect(setShowCounselors).toHaveBeenCalledWith(false);
    });

    it("sin asesor seleccionado y con texto de búsqueda: muestra el aviso de selección obligatoria", () => {
      // Arrange & Act
      renderForm({
        searchCounselor: "Ana",
        showCounselors: false,
        form: { ...createMockFormState().form, counselor_id: "" },
      });

      // Assert
      expect(
        screen.getByText(/debes seleccionar un asesor de la lista/i),
      ).toBeInTheDocument();
    });
  });

  describe("navegación con teclado en el campo asesor", () => {
    const counselors = [
      { id: 1, name: "Ana", lastname: "Ruiz" },
      { id: 2, name: "Luis", lastname: "Mora" },
      { id: 3, name: "Eva", lastname: "Paz" },
    ];

    function renderOpenCounselorList(overrides: Partial<HookReturn> = {}) {
      const setForm = vi.fn();
      const setSearchCounselor = vi.fn();
      const setShowCounselors = vi.fn();
      renderForm({
        setForm,
        setSearchCounselor,
        setShowCounselors,
        showCounselors: true,
        filteredCounselors: counselors,
        ...overrides,
      });
      const input = screen.getByPlaceholderText("Buscar asesor...");
      return { input, setForm, setSearchCounselor, setShowCounselors };
    }

    it("ArrowDown resalta la primera opción y cada pulsación baja una; Enter elige la resaltada", () => {
      // Arrange
      const { input, setForm, setSearchCounselor, setShowCounselors } =
        renderOpenCounselorList();

      // Act
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(screen.getByRole("button", { name: "Ana Ruiz" })).toHaveClass("bg-gray-100");
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      // Assert: dos ArrowDown -> segunda opción
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ counselor_id: "2" }));
      expect(setSearchCounselor).toHaveBeenCalledWith("Luis Mora");
      expect(setShowCounselors).toHaveBeenCalledWith(false);
    });

    it("ArrowUp sin opción resaltada salta a la última", () => {
      // Arrange
      const { input, setForm } = renderOpenCounselorList();

      // Act
      fireEvent.keyDown(input, { key: "ArrowUp" });
      fireEvent.keyDown(input, { key: "Enter" });

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ counselor_id: "3" }));
    });

    it("la navegación es circular: ArrowDown en la última opción vuelve a la primera", () => {
      // Arrange
      const { input, setForm } = renderOpenCounselorList();

      // Act: 3 pulsaciones llegan a la última, la 4ª da la vuelta
      for (let i = 0; i < 4; i++) fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ counselor_id: "1" }));
    });

    it("al escribir queda resaltada la primera coincidencia, así Enter la elige sin usar flechas", () => {
      // Arrange
      const { input, setForm } = renderOpenCounselorList();

      // Act
      fireEvent.change(input, { target: { value: "a" } });
      setForm.mockClear(); // ignora la llamada de limpieza de counselor_id del onChange
      fireEvent.keyDown(input, { key: "Enter" });

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ counselor_id: "1" }));
    });

    it("Enter sin ninguna opción resaltada no selecciona nada (pero no envía el formulario)", () => {
      // Arrange
      const { input, setForm } = renderOpenCounselorList();

      // Act
      const notPrevented = fireEvent.keyDown(input, { key: "Enter" });

      // Assert
      expect(setForm).not.toHaveBeenCalled();
      expect(notPrevented).toBe(false); // fireEvent devuelve false si se llamó preventDefault
    });

    it("Escape cierra la lista", () => {
      // Arrange
      const { input, setShowCounselors } = renderOpenCounselorList();

      // Act
      fireEvent.keyDown(input, { key: "Escape" });

      // Assert
      expect(setShowCounselors).toHaveBeenCalledWith(false);
    });

    it("con la lista cerrada, ArrowDown la vuelve a abrir en lugar de mover el resaltado", () => {
      // Arrange
      const { input, setShowCounselors, setForm } = renderOpenCounselorList({
        showCounselors: false,
      });

      // Act
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      // Assert
      expect(setShowCounselors).toHaveBeenCalledWith(true);
      expect(setForm).not.toHaveBeenCalled();
    });

    it("mover el mouse sobre una opción la resalta, para que Enter elija la que se ve marcada", () => {
      // Arrange
      const { input, setForm } = renderOpenCounselorList();

      // Act
      fireEvent.mouseMove(screen.getByRole("button", { name: "Eva Paz" }));
      fireEvent.keyDown(input, { key: "Enter" });

      // Assert
      expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ counselor_id: "3" }));
    });

    it("las opciones no son paradas de Tab, para que Tab pase directo al siguiente campo", () => {
      // Arrange
      renderOpenCounselorList();

      // Assert
      screen
        .getAllByRole("button", { name: /Ana Ruiz|Luis Mora|Eva Paz/ })
        .forEach((option) => expect(option).toHaveAttribute("tabindex", "-1"));
    });
  });
});

describe("AffiliateForm: texto en mayúsculas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nombre, apellido, dirección y empresa guardan en el estado lo escrito en mayúsculas", () => {
    // Arrange
    const setForm = vi.fn();
    renderForm({ setForm });
    const cases: [RegExp, string, Record<string, string>][] = [
      [/^nombre\(s\)/i, "juan carlos", { name: "JUAN CARLOS" }],
      [/^apellido\(s\)/i, "pérez muñoz", { lastname: "PÉREZ MUÑOZ" }],
      [/^dirección/i, "cra 5 # 1-2", { address: "CRA 5 # 1-2" }],
      [/^empresa/i, "acme sas", { company: "ACME SAS" }],
    ];

    // Act & Assert
    for (const [label, typed, expected] of cases) {
      fireEvent.change(getFieldContainer(label).querySelector("input")!, {
        target: { value: typed },
      });
      expect(setForm).toHaveBeenLastCalledWith(expect.objectContaining(expected));
    }
  });

  it("el email no se convierte: conserva las mayúsculas y minúsculas escritas", () => {
    // Arrange
    const setForm = vi.fn();
    renderForm({ setForm });

    // Act
    fireEvent.change(getFieldContainer(/^email/i).querySelector("input")!, {
      target: { value: "Juan@Test.com" },
    });

    // Assert
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ email: "Juan@Test.com" }));
  });

  it("el nombre del beneficiario se envía en mayúsculas a updateBeneficiaryName", () => {
    // Arrange
    const updateBeneficiaryName = vi.fn();
    renderForm({ updateBeneficiaryName });

    // Act
    fireEvent.change(screen.getByPlaceholderText("Nombre completo"), {
      target: { value: "ana ruiz" },
    });

    // Assert
    expect(updateBeneficiaryName).toHaveBeenCalledWith(0, "ANA RUIZ");
  });

  it("el buscador de asesor y sus sugerencias se muestran en mayúsculas", () => {
    // Arrange & Act
    renderForm({
      showCounselors: true,
      filteredCounselors: [{ id: 5, name: "Ana", lastname: "Ruiz" }],
    });

    // Assert
    expect(screen.getByPlaceholderText("Buscar asesor...")).toHaveClass("uppercase");
    expect(screen.getByRole("button", { name: "Ana Ruiz" })).toHaveClass("uppercase");
  });
});
