import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DoctorForm from "@/app/4dnn1n/doctors/_components/DoctorForm";
import { getDepartments, getCitiesByDepartment } from "@/app/4dnn1n/counselors/fetch";
import { getSpecialties } from "@/app/4dnn1n/doctors/specialties/fetch";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";
import type { Department } from "@/types/geo";

// This component reuses `counselors/fetch` for geography (it has no `getDepartments`
// of its own) and `specialties/fetch` for the specialty catalog. Both modules are
// mocked so no real `apiFetch` call ever fires from the mount-time loading effects.
vi.mock("@/app/4dnn1n/counselors/fetch", () => ({
  getDepartments: vi.fn(),
  getCitiesByDepartment: vi.fn(),
}));

vi.mock("@/app/4dnn1n/doctors/specialties/fetch", () => ({
  getSpecialties: vi.fn(),
}));

function makeDepartments(): Department[] {
  return [{ id: 7, name: "Antioquia" }];
}

/**
 * Locates a field by its `<Label>` text: the label sits in a sibling `<label>`
 * right before the field's root node, so its parent element is the shared
 * field container (same pattern used by CounselorForm's and FranchiseForm's tests).
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

/** Renders the form and waits for the mount-time catalog loads to settle. */
async function renderForm(
  props: {
    mode?: "create" | "edit" | "view";
    initial?: Partial<ApiDoctor>;
    onSubmit?: (payload: any) => Promise<void>;
  } = {},
) {
  const { mode = "create", initial, onSubmit } = props;
  const view = render(<DoctorForm mode={mode} initial={initial} onSubmit={onSubmit} />);
  await waitFor(() => {
    expect(getSpecialties).toHaveBeenCalledTimes(1);
    expect(getDepartments).toHaveBeenCalledTimes(1);
  });
  // Flush the pending `.then(setState)` microtasks from both mount effects
  // inside an act() boundary so later interactions don't trigger act warnings.
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

/**
 * Renders in create mode and fills every field required by `canSubmit`: name,
 * lastname, specialty, department -> city (auto-selected, only option), phone,
 * movil, address, secretary_name and value_agreement.
 */
async function fillValidForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  (getSpecialties as any).mockResolvedValue([{ id: 1, name: "Cardiología", state: 1 }]);
  (getDepartments as any).mockResolvedValue(makeDepartments());
  (getCitiesByDepartment as any).mockResolvedValue([
    { id: 3, name: "Medellín", department_id: 7 },
  ]);

  await renderForm({ onSubmit });

  fireEvent.change(getFieldContainer(/^nombres/i).querySelector("input")!, {
    target: { value: "Juan" },
  });
  fireEvent.change(getFieldContainer(/^apellidos/i).querySelector("input")!, {
    target: { value: "Pérez" },
  });

  await openAndSelect(/^especialidad/i, "Cardiología");
  await openAndSelect(/^departamento/i, "Antioquia");
  await waitFor(() => {
    expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
  });

  fireEvent.change(getFieldContainer(/^tel[ée]fono/i).querySelector("input")!, {
    target: { value: "6014567890" },
  });
  fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
    target: { value: "3001234567" },
  });
  fireEvent.change(getFieldContainer(/^dirección/i).querySelector("input")!, {
    target: { value: "Carrera 5 #123" },
  });
  fireEvent.change(getFieldContainer(/^nombre secretaria/i).querySelector("input")!, {
    target: { value: "Patricia" },
  });
  fireEvent.change(getFieldContainer(/^valor convenio/i).querySelector("input")!, {
    target: { value: "150000" },
  });

  return { onSubmit };
}

describe("DoctorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSpecialties as any).mockResolvedValue([]);
    (getDepartments as any).mockResolvedValue([]);
    (getCitiesByDepartment as any).mockResolvedValue([]);
  });

  describe("carga y filtrado de especialidades", () => {
    it("sin specialty_id inicial, sólo quedan en las opciones las especialidades con state: 1", async () => {
      // Arrange
      (getSpecialties as any).mockResolvedValue([
        { id: 1, name: "Cardiología", state: 1 },
        { id: 2, name: "Dermatología", state: 0 },
      ]);

      // Act
      await renderForm();
      await openAndSelect(/^especialidad/i, "Cardiología");

      // Assert: the active specialty was selectable, the inactive one never appears
      expect(getFieldContainer(/^especialidad/i).querySelector("input")).toHaveValue(
        "Cardiología",
      );
      fireEvent.click(getFieldContainer(/^especialidad/i).querySelector("input")!);
      expect(screen.queryByRole("button", { name: "Dermatología" })).not.toBeInTheDocument();
    });

    it("con initial.specialty_id apuntando a la especialidad inactiva, AMBAS quedan en las opciones", async () => {
      // Arrange
      (getSpecialties as any).mockResolvedValue([
        { id: 1, name: "Cardiología", state: 1 },
        { id: 2, name: "Dermatología", state: 0 },
      ]);

      // Act: initial.specialty_id (2) matches the inactive specialty, so the
      // filter's `currentSpecId && s.id === currentSpecId` clause keeps it too.
      await renderForm({ mode: "edit", initial: { id: 9, specialty_id: 2 } });
      fireEvent.click(getFieldContainer(/^especialidad/i).querySelector("input")!);

      // Assert: both options are present in the dropdown
      expect(await screen.findByRole("button", { name: "Cardiología" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Dermatología" })).toBeInTheDocument();
    });
  });

  describe("canSubmit: todos los campos son obligatorios", () => {
    it("es false mientras falte cualquiera de los 9 campos requeridos, y true sólo con todos completos", async () => {
      // Arrange
      (getSpecialties as any).mockResolvedValue([{ id: 1, name: "Cardiología", state: 1 }]);
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ]);
      await renderForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });

      // Assert: nothing filled yet
      expect(saveButton).toBeDisabled();

      // Act & Assert: name only
      fireEvent.change(getFieldContainer(/^nombres/i).querySelector("input")!, {
        target: { value: "Juan" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + lastname
      fireEvent.change(getFieldContainer(/^apellidos/i).querySelector("input")!, {
        target: { value: "Pérez" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + specialty
      await openAndSelect(/^especialidad/i, "Cardiología");
      expect(saveButton).toBeDisabled();

      // Act & Assert: + department -> auto-selects its only city
      await openAndSelect(/^departamento/i, "Antioquia");
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + phone
      fireEvent.change(getFieldContainer(/^tel[ée]fono/i).querySelector("input")!, {
        target: { value: "6014567890" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + movil
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "3001234567" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + address
      fireEvent.change(getFieldContainer(/^dirección/i).querySelector("input")!, {
        target: { value: "Carrera 5 #123" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + secretary_name
      fireEvent.change(getFieldContainer(/^nombre secretaria/i).querySelector("input")!, {
        target: { value: "Patricia" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + value_agreement -> all 9 fields complete
      fireEvent.change(getFieldContainer(/^valor convenio/i).querySelector("input")!, {
        target: { value: "150000" },
      });
      expect(saveButton).not.toBeDisabled();
    });

    it("es false si value_agreement < 10000, y vuelve a true al ser >= 10000", async () => {
      // Arrange
      await fillValidForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });
      expect(saveButton).not.toBeDisabled();

      // Act: below the minimum
      fireEvent.change(getFieldContainer(/^valor convenio/i).querySelector("input")!, {
        target: { value: "5000" },
      });

      // Assert
      expect(saveButton).toBeDisabled();

      // Act: back to a valid value
      fireEvent.change(getFieldContainer(/^valor convenio/i).querySelector("input")!, {
        target: { value: "150000" },
      });
      expect(saveButton).not.toBeDisabled();
    });

    it("es false si movil.length !== 10, y vuelve a true con exactamente 10 dígitos", async () => {
      // Arrange
      await fillValidForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });
      expect(saveButton).not.toBeDisabled();

      // Act: invalid-length movil
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "30012" },
      });

      // Assert
      expect(saveButton).toBeDisabled();

      // Act: exactly 10 digits re-enables it
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "3001234567" },
      });
      expect(saveButton).not.toBeDisabled();
    });

    it("modo 'view': el botón 'Guardar' no se renderiza", async () => {
      // Arrange & Act
      await renderForm({ mode: "view", initial: { id: 9 } });

      // Assert: `!isView && (...)` wraps the Guardar button in JSX, so in view
      // mode it never mounts regardless of what `canSubmit` computes.
      expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();
    });
  });

  describe("mensajes de error (valueAgreementError, movilError)", () => {
    it("value_agreement: '5000' muestra 'El valor debe ser mayor o igual a 10.000'", async () => {
      // Arrange
      await renderForm();

      // Act
      fireEvent.change(getFieldContainer(/^valor convenio/i).querySelector("input")!, {
        target: { value: "5000" },
      });

      // Assert
      expect(
        screen.getByText("El valor debe ser mayor o igual a 10.000"),
      ).toBeInTheDocument();
    });

    it("movil: '30012' muestra 'El celular debe tener exactamente 10 dígitos'", async () => {
      // Arrange
      await renderForm();

      // Act
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "30012" },
      });

      // Assert
      expect(
        screen.getByText("El celular debe tener exactamente 10 dígitos"),
      ).toBeInTheDocument();
    });

    it("con campos vacíos no se muestra ningún error (valueAgreementError y movilError sólo aplican con valor presente)", async () => {
      // Arrange & Act
      await renderForm();

      // Assert
      expect(
        screen.queryByText("El valor debe ser mayor o igual a 10.000"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("El celular debe tener exactamente 10 dígitos"),
      ).not.toBeInTheDocument();
    });
  });

  describe("submit", () => {
    it("con todos los datos válidos, click en 'Guardar' llama a onSubmit con el payload exacto", async () => {
      // Arrange
      const { onSubmit } = await fillValidForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });

      // Act
      fireEvent.click(saveButton);

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Juan",
        lastname: "Pérez",
        email: null,
        phone: "6014567890",
        movil: "3001234567",
        address: "Carrera 5 #123",
        secretary_name: "Patricia",
        value_agreement: 150000,
        specialty_id: 1,
        city_id: 3,
        state: 1,
      });
    });

    it("con email lleno, el payload lo incluye tal cual; con email vacío, envía null", async () => {
      // Arrange
      const { onSubmit } = await fillValidForm();
      fireEvent.change(getFieldContainer(/^correo/i).querySelector("input")!, {
        target: { value: "doctor@example.com" },
      });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const payload = onSubmit.mock.calls[0][0];
      expect(payload.email).toBe("doctor@example.com");
    });

    it("initial.state: 2 hace que el payload envíe state: 2; cualquier otro valor envía state: 1", async () => {
      // Arrange
      (getSpecialties as any).mockResolvedValue([{ id: 1, name: "Cardiología", state: 1 }]);
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ]);
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      await renderForm({
        mode: "edit",
        onSubmit,
        initial: {
          id: 9,
          name: "Juan",
          lastname: "Pérez",
          specialty_id: 1,
          phone: "6014567890",
          movil: "3001234567",
          address: "Carrera 5 #123",
          secretary_name: "Patricia",
          value_agreement: 150000,
          state: 2,
          city: { id: 3, name: "Medellín", department_id: 7 },
        },
      });
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].state).toBe(2);
    });

    it("con el formulario incompleto, 'Guardar' queda deshabilitado y onSubmit no se dispara", async () => {
      // Arrange: render with an onSubmit wired up, but leave required fields
      // empty so `canSubmit` stays false.
      //
      // Note on coverage: `submit()`'s own `if (!onSubmit || !canSubmit) return;`
      // guard is the same condition that already disables the "Guardar" button
      // (`disabled={!canSubmit || saving}`), and that button's onClick is the
      // component's only call site for `submit()`. React's DOM event dispatcher
      // reads the fiber's cached `disabled` prop before invoking a click
      // listener, not the live DOM attribute, so even removing the `disabled`
      // attribute directly on the node before `fireEvent.click` still does not
      // reach the handler. That makes the guard itself unreachable through
      // genuine rendering/interaction in this component as written — the same
      // dead-code situation documented in FranchiseForm's tests (Task 11).
      // What *is* observably testable is that the disabled button reliably
      // blocks any submission.
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      await renderForm({ onSubmit });
      const saveButton = screen.getByRole("button", { name: /guardar/i });
      expect(saveButton).toBeDisabled();

      // Act
      fireEvent.click(saveButton);
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("click en 'Limpiar' resetea todos los campos del form, departmentId y cities, y no invoca onSubmit", async () => {
      // Arrange
      const { onSubmit } = await fillValidForm();

      // Act
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

      // Assert
      expect(getFieldContainer(/^nombres/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^apellidos/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^especialidad/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^departamento/i).querySelector("input")).toHaveValue("");
      // With `departmentId` cleared, the city field becomes disabled again
      // (`disabled={isView || !departmentId}`) and shows no selection.
      expect(getFieldContainer(/^ciudad/i).querySelector("input")).toBeDisabled();
      expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^tel[ée]fono/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^celular/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^dirección/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^nombre secretaria/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^valor convenio/i).querySelector("input")).toHaveValue("");
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
