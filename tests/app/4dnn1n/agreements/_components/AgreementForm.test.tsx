import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AgreementForm from "@/app/4dnn1n/agreements/_components/AgreementForm";
import {
  getDepartments,
  getCitiesByDepartment,
  type ApiAgreement,
  type Department,
  type City,
} from "@/app/4dnn1n/agreements/fetch";

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// the department/city catalog loading effects. This component doesn't use
// any other export from `fetch.ts` (create/update live in the parent page).
vi.mock("@/app/4dnn1n/agreements/fetch", () => ({
  getDepartments: vi.fn(),
  getCitiesByDepartment: vi.fn(),
}));

function makeDepartments(): Department[] {
  return [
    { id: 7, name: "Antioquia" },
    { id: 8, name: "Valle" },
  ];
}

/**
 * Locates a field by its `<Label>` text rather than by placeholder: several
 * fields (name, department, city) render no placeholder at all, or reuse the
 * selected option's label as the placeholder once chosen. The label sits in a
 * sibling `<label>` right before the field's root node, so its parent element
 * is the shared field container (same pattern as the appointments/affiliates
 * module's form tests).
 */
function getFieldContainer(labelText: RegExp): HTMLElement {
  const label = screen.getByText(labelText, { selector: "label" });
  return label.parentElement as HTMLElement;
}

/** Opens a SearchableSelect (found via its field label) and clicks one option. */
async function openAndSelect(labelText: RegExp, optionLabel: string) {
  const input = getFieldContainer(labelText).querySelector("input") as HTMLInputElement;
  fireEvent.click(input);
  const option = await screen.findByRole("button", { name: optionLabel });
  fireEvent.click(option);
}

/** Renders the form and waits for the mount-time departments load to settle. */
async function renderForm(props: {
  mode?: "create" | "edit" | "view";
  initial?: Partial<ApiAgreement>;
  onSubmit?: (payload: any) => Promise<void>;
} = {}) {
  const { mode = "create", initial, onSubmit } = props;
  const view = render(<AgreementForm mode={mode} initial={initial} onSubmit={onSubmit} />);
  await waitFor(() => expect(getDepartments).toHaveBeenCalledTimes(1));
  // The mount effect calls `getDepartments().then(setDepartments)` — the
  // assertion above only proves the call happened, not that the resulting
  // state update has flushed yet. Flush that pending microtask inside an
  // act() boundary so later interactions in the test don't trigger act warnings.
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

/**
 * Renders in create mode, picks "Antioquia" (auto-selecting its only city,
 * "Medellín"), and fills in a valid name/amount — leaving the form in a
 * fully submittable state for canSubmit/submit/clear assertions.
 */
async function fillValidForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  (getDepartments as any).mockResolvedValue(makeDepartments());
  (getCitiesByDepartment as any).mockResolvedValue([
    { id: 3, name: "Medellín", department_id: 7 },
  ]);

  await renderForm({ onSubmit });
  await openAndSelect(/^departamento/i, "Antioquia");
  await waitFor(() => {
    expect(getCitiesByDepartment).toHaveBeenCalledWith(7);
    expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
  });

  fireEvent.change(getFieldContainer(/^nombre del convenio/i).querySelector("input")!, {
    target: { value: "Convenio Salud Total" },
  });
  fireEvent.change(screen.getByPlaceholderText("Ej: 150000"), {
    target: { value: "50000" },
  });

  return { onSubmit };
}

describe("AgreementForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDepartments as any).mockResolvedValue([]);
    (getCitiesByDepartment as any).mockResolvedValue([]);
  });

  describe("carga de catálogos y preselección de departamento", () => {
    it("al montar llama a getDepartments una vez", async () => {
      // Arrange & Act
      await renderForm();

      // Assert
      expect(getDepartments).toHaveBeenCalledTimes(1);
    });

    it("initial.city.department_id preselecciona el departamento y dispara la carga de ciudades", async () => {
      // Arrange
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ] as City[]);

      // Act
      await renderForm({
        mode: "edit",
        initial: { id: 5, city: { id: 3, name: "Medellín", department_id: 7 } },
      });

      // Assert: the department effect picks up `department_id: 7` from `initial.city`
      // (departmentId starts empty) and that in turn triggers the city load for 7.
      await waitFor(() => {
        expect(getCitiesByDepartment).toHaveBeenCalledWith(7);
        expect(getFieldContainer(/^departamento/i).querySelector("input")).toHaveValue(
          "Antioquia",
        );
      });
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });
    });

    it("cambiar de departamento manualmente recarga getCitiesByDepartment con el nuevo id y reemplaza la ciudad seleccionada", async () => {
      // Arrange: "Antioquia" and "Valle" have disjoint city lists (no shared
      // ids), so switching between them can only show the right city if
      // `form.city_id` itself was updated by the reload — not merely because
      // the old id doesn't happen to match anything in the new options.
      // (Asserting an empty display value here would pass even if the
      // `setForm` call inside the reload effect were dropped by a regression:
      // SearchableSelect renders "" for a `value` that isn't in `options`
      // regardless of what that stale value actually is — see
      // SearchableSelect.tsx:38,102-106. A second, non-empty, disjoint list
      // makes the assertion depend on the real value the reload wrote.)
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any)
        .mockResolvedValueOnce([{ id: 3, name: "Medellín", department_id: 7 }] as City[])
        .mockResolvedValueOnce([{ id: 9, name: "Cali", department_id: 8 }] as City[]);
      await renderForm();

      // Act: pick "Antioquia" -> its only city gets auto-selected
      await openAndSelect(/^departamento/i, "Antioquia");
      await waitFor(() => {
        expect(getCitiesByDepartment).toHaveBeenCalledWith(7);
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });

      // Act: switch to "Valle"
      await openAndSelect(/^departamento/i, "Valle");

      // Assert: the new department's city list is requested, and once it
      // resolves the field shows Valle's own auto-selected city ("Cali") —
      // a positive value that could only render if `form.city_id` was
      // actually updated to `9`, not just "cleared away from 3".
      await waitFor(() => {
        expect(getCitiesByDepartment).toHaveBeenCalledWith(8);
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Cali");
      });
    });
  });

  describe("visibilidad según mode", () => {
    it("modo 'view': todos los inputs están deshabilitados, sin botones de acción, y muestra 'Código' con el id", async () => {
      // Arrange & Act
      const { container } = await renderForm({
        mode: "view",
        initial: { id: 42, name: "Convenio X" },
      });

      // Assert
      const inputs = container.querySelectorAll("input");
      expect(inputs.length).toBeGreaterThan(0);
      inputs.forEach((input) => expect(input).toBeDisabled());
      expect(getFieldContainer(/^código/i).querySelector("input")).toHaveValue("42");
      expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /limpiar/i })).not.toBeInTheDocument();
    });

    it("modo 'create': no muestra el input de 'Código'; los inputs están habilitados y los botones visibles", async () => {
      // Arrange & Act
      await renderForm({ mode: "create" });

      // Assert
      expect(screen.queryByText(/^código/i, { selector: "label" })).not.toBeInTheDocument();
      expect(
        getFieldContainer(/^nombre del convenio/i).querySelector("input"),
      ).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /limpiar/i })).toBeInTheDocument();
    });

    it("modo 'edit': muestra 'Código' deshabilitado y los inputs de datos habilitados", async () => {
      // Arrange & Act
      await renderForm({ mode: "edit", initial: { id: 5, name: "Convenio X" } });

      // Assert
      expect(getFieldContainer(/^código/i).querySelector("input")).toBeDisabled();
      expect(getFieldContainer(/^código/i).querySelector("input")).toHaveValue("5");
      expect(
        getFieldContainer(/^nombre del convenio/i).querySelector("input"),
      ).not.toBeDisabled();
    });
  });

  describe("validación de amount", () => {
    it("amount '5000' muestra el mensaje de mínimo; '10000' no muestra ningún mensaje", async () => {
      // Arrange
      await renderForm();
      const amountInput = screen.getByPlaceholderText("Ej: 150000");

      // Act & Assert: below minimum
      fireEvent.change(amountInput, { target: { value: "5000" } });
      expect(
        screen.getByText("El valor debe ser mayor o igual a 10.000"),
      ).toBeInTheDocument();

      // Act & Assert: exactly at minimum
      fireEvent.change(amountInput, { target: { value: "10000" } });
      expect(
        screen.queryByText("El valor debe ser mayor o igual a 10.000"),
      ).not.toBeInTheDocument();
    });

    it("'Valor ($)' muestra punto de miles mientras se escribe", async () => {
      // Arrange
      await renderForm();
      const amountInput = screen.getByPlaceholderText("Ej: 150000");

      // Act
      fireEvent.change(amountInput, { target: { value: "150000" } });

      // Assert
      expect(amountInput).toHaveValue("150.000");
    });

    it("escribir letras en 'Valor ($)' se filtra a solo dígitos", async () => {
      // Arrange
      await renderForm();
      const amountInput = screen.getByPlaceholderText("Ej: 150000");

      // Act
      fireEvent.change(amountInput, { target: { value: "1a2b3c" } });

      // Assert
      expect(amountInput).toHaveValue("123");
    });
  });

  describe("canSubmit y submit", () => {
    it("canSubmit es false si falta name, amount, departmentId o city_id, o si amount < 10000", async () => {
      // Arrange
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ]);
      await renderForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });
      const nameInput = getFieldContainer(/^nombre del convenio/i).querySelector(
        "input",
      ) as HTMLInputElement;
      const amountInput = screen.getByPlaceholderText("Ej: 150000");

      // Assert: nothing filled yet
      expect(saveButton).toBeDisabled();

      // Act: only name filled
      fireEvent.change(nameInput, { target: { value: "Convenio X" } });
      expect(saveButton).toBeDisabled();

      // Act: amount below the minimum
      fireEvent.change(amountInput, { target: { value: "5000" } });
      expect(saveButton).toBeDisabled();

      // Act: amount now valid, but department/city still missing
      fireEvent.change(amountInput, { target: { value: "50000" } });
      expect(saveButton).toBeDisabled();

      // Act: pick department (auto-selects its only city) -> everything complete
      await openAndSelect(/^departamento/i, "Antioquia");
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });

      // Assert
      expect(saveButton).not.toBeDisabled();
    });

    it("con datos válidos, click en 'Guardar' invoca onSubmit con el payload exacto", async () => {
      // Arrange
      const { onSubmit } = await fillValidForm();

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        name: "CONVENIO SALUD TOTAL",
        amount: 50000,
        city_id: 3,
        state: 1,
      });
    });

    it("mientras se resuelve onSubmit, el botón muestra 'Guardando...' y queda deshabilitado", async () => {
      // Arrange
      let resolveSubmit!: () => void;
      const onSubmit = vi.fn(
        () => new Promise<void>((res) => { resolveSubmit = res; }),
      );
      await fillValidForm(onSubmit);
      const saveButton = screen.getByRole("button", { name: /guardar/i });

      // Act
      fireEvent.click(saveButton);

      // Assert: pending state
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
      });

      // Act: resolve the pending submit
      await act(async () => {
        resolveSubmit();
        await Promise.resolve();
      });

      // Assert: back to normal
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^guardar$/i })).not.toBeDisabled();
      });
    });
  });

  describe("clear", () => {
    it("click en 'Limpiar' resetea name/amount/city_id/departmentId y no invoca onSubmit", async () => {
      // Arrange
      const { onSubmit } = await fillValidForm();

      // Act
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

      // Assert
      expect(getFieldContainer(/^nombre del convenio/i).querySelector("input")).toHaveValue("");
      expect(screen.getByPlaceholderText("Ej: 150000")).toHaveValue("");
      // Department cleared back to its unselected placeholder state.
      expect(getFieldContainer(/^departamento/i).querySelector("input")).toHaveValue("");
      // With `departmentId` cleared, the city field becomes disabled again
      // (`disabled={isView || !departmentId}`) and shows no selection.
      expect(getFieldContainer(/^ciudad/i).querySelector("input")).toBeDisabled();
      expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});

describe("AgreementForm: texto en mayúsculas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Nombre del Convenio se escribe en mayúsculas", async () => {
    await renderForm();
    const input = getFieldContainer(/^nombre del convenio/i).querySelector("input")!;

    fireEvent.change(input, { target: { value: "convenio salud ñandú" } });

    expect(input).toHaveValue("CONVENIO SALUD ÑANDÚ");
  });
});
