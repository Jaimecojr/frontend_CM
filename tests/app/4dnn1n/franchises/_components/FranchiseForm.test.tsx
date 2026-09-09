import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import FranchiseForm from "@/app/4dnn1n/franchises/_components/FranchiseForm";
import {
  getDepartments,
  getCitiesByDepartment,
  type ApiFranchise,
  type Department,
  type City,
} from "@/app/4dnn1n/franchises/fetch";
import { alert } from "@/lib/alert";

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// the department/city catalog loading effects. This form also calls
// `@/lib/alert` directly (unlike AgreementForm), so that module is mocked too.
vi.mock("@/app/4dnn1n/franchises/fetch", () => ({
  getDepartments: vi.fn(),
  getCitiesByDepartment: vi.fn(),
}));

vi.mock("@/lib/alert", () => ({
  alert: { warn: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn() },
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
 * is the shared field container (same pattern as AgreementForm's tests).
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
async function renderForm(
  props: {
    mode?: "create" | "edit" | "view";
    initial?: Partial<ApiFranchise>;
    onSubmit?: (payload: any) => Promise<void>;
  } = {},
) {
  const { mode = "create", initial, onSubmit } = props;
  const view = render(<FranchiseForm mode={mode} initial={initial} onSubmit={onSubmit} />);
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
 * "Medellín"), and fills every other field required by `canSubmit` (nit,
 * name, email, user) — leaving the form ready for a valid password to be
 * added by the caller before submitting.
 */
async function fillRequiredFields(onSubmit = vi.fn().mockResolvedValue(undefined)) {
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

  fireEvent.change(getFieldContainer(/^nit/i).querySelector("input")!, {
    target: { value: "900123456" },
  });
  fireEvent.change(getFieldContainer(/^nombre de franquicia/i).querySelector("input")!, {
    target: { value: "Franquicia Medellín" },
  });
  fireEvent.change(getFieldContainer(/^email/i).querySelector("input")!, {
    target: { value: "franquicia@example.com" },
  });
  fireEvent.change(getFieldContainer(/^usuario/i).querySelector("input")!, {
    target: { value: "franquicia_user" },
  });

  return { onSubmit };
}

/** Same as `fillRequiredFields`, plus a valid matching password pair. */
async function fillValidCreateForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const result = await fillRequiredFields(onSubmit);

  fireEvent.change(getFieldContainer(/^contraseña/i).querySelector("input")!, {
    target: { value: "secret1" },
  });
  fireEvent.change(getFieldContainer(/^repetir contraseña/i).querySelector("input")!, {
    target: { value: "secret1" },
  });

  return result;
}

describe("FranchiseForm", () => {
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
      // `form.city_id` itself was updated by the reload.
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
      // resolves the field shows Valle's own auto-selected city ("Cali").
      await waitFor(() => {
        expect(getCitiesByDepartment).toHaveBeenCalledWith(8);
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Cali");
      });
    });
  });

  describe("canSubmit: reglas de contraseña por modo", () => {
    it("es false si falta nit, name, email, user, departmentId o city_id", async () => {
      // Arrange
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ]);
      await renderForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });

      // Assert: nothing filled yet
      expect(saveButton).toBeDisabled();

      // Act: only nit
      fireEvent.change(getFieldContainer(/^nit/i).querySelector("input")!, {
        target: { value: "900123456" },
      });
      expect(saveButton).toBeDisabled();

      // Act: + name
      fireEvent.change(getFieldContainer(/^nombre de franquicia/i).querySelector("input")!, {
        target: { value: "Franquicia Medellín" },
      });
      expect(saveButton).toBeDisabled();

      // Act: + email
      fireEvent.change(getFieldContainer(/^email/i).querySelector("input")!, {
        target: { value: "franquicia@example.com" },
      });
      expect(saveButton).toBeDisabled();

      // Act: + user (department/city still missing)
      fireEvent.change(getFieldContainer(/^usuario/i).querySelector("input")!, {
        target: { value: "franquicia_user" },
      });
      expect(saveButton).toBeDisabled();

      // Act: + department -> auto-selects its only city (password still missing in create)
      await openAndSelect(/^departamento/i, "Antioquia");
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });
      expect(saveButton).toBeDisabled();
    });

    it("es false si movil está presente y su longitud no es 10", async () => {
      // Arrange
      await fillValidCreateForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });
      expect(saveButton).not.toBeDisabled();

      // Act: invalid-length movil
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "12345" },
      });

      // Assert
      expect(saveButton).toBeDisabled();

      // Act: exactly 10 digits re-enables it
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "3001234567" },
      });
      expect(saveButton).not.toBeDisabled();

      // Act: empty movil is also valid
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "" },
      });
      expect(saveButton).not.toBeDisabled();
    });

    describe("modo create", () => {
      it("es false si password está vacío, tiene menos de 6 caracteres, o no coincide con password2; true solo con ambos iguales y de 6+ caracteres", async () => {
        // Arrange
        await fillRequiredFields();
        const saveButton = screen.getByRole("button", { name: /guardar/i });
        const passwordInput = getFieldContainer(/^contraseña/i).querySelector(
          "input",
        ) as HTMLInputElement;
        const password2Input = getFieldContainer(/^repetir contraseña/i).querySelector(
          "input",
        ) as HTMLInputElement;

        // Assert: password empty
        expect(saveButton).toBeDisabled();

        // Act & Assert: too short
        fireEvent.change(passwordInput, { target: { value: "abc" } });
        fireEvent.change(password2Input, { target: { value: "abc" } });
        expect(saveButton).toBeDisabled();

        // Act & Assert: long enough but mismatched
        fireEvent.change(passwordInput, { target: { value: "secret1" } });
        fireEvent.change(password2Input, { target: { value: "secret2" } });
        expect(saveButton).toBeDisabled();

        // Act & Assert: matching and 6+ chars -> enabled
        fireEvent.change(password2Input, { target: { value: "secret1" } });
        expect(saveButton).not.toBeDisabled();
      });
    });

    describe("modo edit", () => {
      it("con password vacío la regla de contraseña no aplica (canSubmit puede ser true sin tocar la contraseña)", async () => {
        // Arrange
        (getDepartments as any).mockResolvedValue(makeDepartments());
        (getCitiesByDepartment as any).mockResolvedValue([
          { id: 3, name: "Medellín", department_id: 7 },
        ]);
        await renderForm({
          mode: "edit",
          initial: {
            id: 5,
            nit: "900123456",
            name: "Franquicia Medellín",
            email: "franquicia@example.com",
            user: "franquicia_user",
            city: { id: 3, name: "Medellín", department_id: 7 },
          },
        });
        await waitFor(() => {
          expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
        });

        // Assert: password never touched, all other required fields present
        expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
      });

      it("si se llena password, aplican las mismas reglas de longitud e igualdad que en create", async () => {
        // Arrange
        (getDepartments as any).mockResolvedValue(makeDepartments());
        (getCitiesByDepartment as any).mockResolvedValue([
          { id: 3, name: "Medellín", department_id: 7 },
        ]);
        await renderForm({
          mode: "edit",
          initial: {
            id: 5,
            nit: "900123456",
            name: "Franquicia Medellín",
            email: "franquicia@example.com",
            user: "franquicia_user",
            city: { id: 3, name: "Medellín", department_id: 7 },
          },
        });
        await waitFor(() => {
          expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
        });
        const saveButton = screen.getByRole("button", { name: /guardar/i });
        const passwordInput = getFieldContainer(/^contraseña/i).querySelector(
          "input",
        ) as HTMLInputElement;
        const password2Input = getFieldContainer(/^repetir contraseña/i).querySelector(
          "input",
        ) as HTMLInputElement;

        // Act & Assert: too short
        fireEvent.change(passwordInput, { target: { value: "abc" } });
        expect(saveButton).toBeDisabled();

        // Act & Assert: long enough but mismatched
        fireEvent.change(passwordInput, { target: { value: "secret1" } });
        fireEvent.change(password2Input, { target: { value: "secret2" } });
        expect(saveButton).toBeDisabled();

        // Act & Assert: matching and 6+ chars -> enabled again
        fireEvent.change(password2Input, { target: { value: "secret1" } });
        expect(saveButton).not.toBeDisabled();
      });
    });

    it("modo view: siempre es false", async () => {
      // Arrange & Act
      await renderForm({
        mode: "view",
        initial: {
          id: 5,
          nit: "900123456",
          name: "Franquicia Medellín",
          email: "franquicia@example.com",
          user: "franquicia_user",
          city: { id: 3, name: "Medellín", department_id: 7 },
        },
      });

      // Assert: view mode renders no action buttons at all (isView -> no Guardar button)
      expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();
    });
  });

  describe("submit: el payload de contraseña es condicional", () => {
    it("modo create con datos válidos: onSubmit recibe password siempre y state:1 fijo, ignorando form.state", async () => {
      // Arrange
      const { onSubmit } = await fillValidCreateForm();

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        nit: "900123456",
        name: "Franquicia Medellín",
        contact: null,
        phone: null,
        movil: null,
        address: null,
        date_afi: null,
        email: "franquicia@example.com",
        user: "franquicia_user",
        city_id: 3,
        state: 1,
        password: "secret1",
      });
    });

    it("modo edit con password vacío: el payload no incluye la clave password", async () => {
      // Arrange
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ]);
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      await renderForm({
        mode: "edit",
        onSubmit,
        initial: {
          id: 5,
          nit: "900123456",
          name: "Franquicia Medellín",
          email: "franquicia@example.com",
          user: "franquicia_user",
          state: 2,
          city: { id: 3, name: "Medellín", department_id: 7 },
        },
      });
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert: no `password` key at all, and `state` respects form.state (2)
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const payload = onSubmit.mock.calls[0][0];
      expect(payload).not.toHaveProperty("password");
      expect(payload.state).toBe(2);
    });

    it("modo edit con password válido: el payload incluye password y state usa Number(form.state)", async () => {
      // Arrange
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ]);
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      await renderForm({
        mode: "edit",
        onSubmit,
        initial: {
          id: 5,
          nit: "900123456",
          name: "Franquicia Medellín",
          email: "franquicia@example.com",
          user: "franquicia_user",
          state: 2,
          city: { id: 3, name: "Medellín", department_id: 7 },
        },
      });
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });
      fireEvent.change(getFieldContainer(/^contraseña/i).querySelector("input")!, {
        target: { value: "newpass1" },
      });
      fireEvent.change(getFieldContainer(/^repetir contraseña/i).querySelector("input")!, {
        target: { value: "newpass1" },
      });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const payload = onSubmit.mock.calls[0][0];
      expect(payload.password).toBe("newpass1");
      expect(payload.state).toBe(2);
    });

    it("con el formulario incompleto, 'Guardar' queda deshabilitado y ni onSubmit ni alert.warn se disparan", async () => {
      // Arrange: render with an onSubmit wired up, but leave required fields
      // empty so `canSubmit` stays false.
      //
      // Note on coverage: `submit()`'s own `if (!canSubmit) { alert.warn(...); return; }`
      // guard is the same condition that already disables the "Guardar" button
      // (`disabled={!canSubmit || saving}`), and that button's onClick is the
      // component's only call site for `submit()`. React's DOM event dispatcher
      // reads the fiber's own cached `disabled` prop before invoking a click
      // listener (see `getListener` in react-dom's event-plugin code) — not the
      // live DOM attribute — so even removing the `disabled` attribute directly
      // on the node before `fireEvent.click` still does not reach the handler.
      // That makes the `alert.warn` branch itself unreachable through genuine
      // rendering/interaction in this component as written; what *is*
      // observably testable is that the guard's outer condition (the disabled
      // button) reliably blocks any submission.
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
      expect(alert.warn).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("visibilidad: campos de contraseña ocultos en view", () => {
    it("mode='view': los inputs de Contraseña y Repetir contraseña no se renderizan", async () => {
      // Arrange & Act
      await renderForm({
        mode: "view",
        initial: {
          id: 5,
          nit: "900123456",
          name: "Franquicia Medellín",
          email: "franquicia@example.com",
          user: "franquicia_user",
        },
      });

      // Assert: labels are absent entirely (not just disabled inputs)
      expect(screen.queryByText(/^contraseña/i, { selector: "label" })).not.toBeInTheDocument();
      expect(
        screen.queryByText(/^repetir contraseña/i, { selector: "label" }),
      ).not.toBeInTheDocument();
    });

    it("mode='create': los inputs de Contraseña y Repetir contraseña sí se renderizan", async () => {
      // Arrange & Act
      await renderForm({ mode: "create" });

      // Assert
      expect(screen.getByText(/^contraseña/i, { selector: "label" })).toBeInTheDocument();
      expect(screen.getByText(/^repetir contraseña/i, { selector: "label" })).toBeInTheDocument();
    });
  });
});
