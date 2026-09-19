import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CounselorForm from "@/app/4dnn1n/counselors/_components/CounselorForm";
import {
  getDepartments,
  getCitiesByDepartment,
  checkCounselorIdCard,
  getActiveFranchises,
  type ApiCounselor,
  type Department,
} from "@/app/4dnn1n/counselors/fetch";
import { alert } from "@/lib/alert";

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// the catalog-loading effects or the id-card check. This form also calls
// `@/lib/alert` directly (unlike AgreementForm), so that module is mocked too.
vi.mock("@/app/4dnn1n/counselors/fetch", () => ({
  getDepartments: vi.fn(),
  getCitiesByDepartment: vi.fn(),
  checkCounselorIdCard: vi.fn(),
  getActiveFranchises: vi.fn(),
}));

vi.mock("@/lib/alert", () => ({
  alert: { warn: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn() },
}));

function makeDepartments(): Department[] {
  return [{ id: 7, name: "Antioquia" }];
}

/**
 * Locates a field by its `<Label>` text: the label sits in a sibling `<label>`
 * right before the field's root node, so its parent element is the shared
 * field container (same pattern used by AgreementForm's tests).
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
    initial?: Partial<ApiCounselor>;
    onSubmit?: (payload: any) => Promise<void>;
  } = {},
) {
  const { mode = "create", initial, onSubmit } = props;
  const view = render(<CounselorForm mode={mode} initial={initial} onSubmit={onSubmit} />);
  await waitFor(() => {
    expect(getActiveFranchises).toHaveBeenCalledTimes(1);
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
 * Renders in create mode and fills every field required by `canSubmit`:
 * name, lastname, a brand-new (never blurred) id_card, department -> city
 * (auto-selected, only option), and franchise. `type_contra` is already
 * valid from its default value. The id_card is deliberately never blurred
 * here so `idCardError` stays at its initial `null` and `checkCounselorIdCard`
 * is never called as a side effect of filling the form — this is what makes
 * `submit()`'s forced revalidation ("always calls validateIdCard again, even
 * if canSubmit was already true") observable and distinct from the onBlur path.
 */
async function fillValidForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  (getDepartments as any).mockResolvedValue(makeDepartments());
  (getCitiesByDepartment as any).mockResolvedValue([
    { id: 3, name: "Medellín", department_id: 7 },
  ]);
  (getActiveFranchises as any).mockResolvedValue([{ id: 1, name: "Franquicia A" }]);

  await renderForm({ onSubmit });

  fireEvent.change(getFieldContainer(/^nombres/i).querySelector("input")!, {
    target: { value: "Juan" },
  });
  fireEvent.change(getFieldContainer(/^apellidos/i).querySelector("input")!, {
    target: { value: "Pérez" },
  });
  fireEvent.change(getFieldContainer(/^cédula/i).querySelector("input")!, {
    target: { value: "123456789" },
  });

  await openAndSelect(/^departamento/i, "Antioquia");
  await waitFor(() => {
    expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
  });

  await openAndSelect(/^franquicia/i, "Franquicia A");

  return { onSubmit };
}

describe("CounselorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDepartments as any).mockResolvedValue([]);
    (getCitiesByDepartment as any).mockResolvedValue([]);
    (getActiveFranchises as any).mockResolvedValue([]);
    (checkCounselorIdCard as any).mockResolvedValue({ exists: false });
  });

  describe("carga inicial de catálogos", () => {
    it("al montar llama a getActiveFranchises y getDepartments una vez cada uno", async () => {
      // Arrange & Act
      await renderForm();

      // Assert
      expect(getActiveFranchises).toHaveBeenCalledTimes(1);
      expect(getDepartments).toHaveBeenCalledTimes(1);
    });
  });

  describe("validateIdCard", () => {
    it("cédula vacía: al perder el foco muestra 'La cédula es obligatoria.' y no consulta el backend", async () => {
      // Arrange
      await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;

      // Act
      fireEvent.blur(idCardInput);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("La cédula es obligatoria.")).toBeInTheDocument();
      });
      expect(checkCounselorIdCard).not.toHaveBeenCalled();
    });

    it("modo 'edit' con cédula sin cambios respecto a la inicial: no llama a checkCounselorIdCard ni muestra error", async () => {
      // Arrange & Act
      await renderForm({ mode: "edit", initial: { id: 9, id_card: "111222333" } });
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;
      fireEvent.blur(idCardInput);
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(checkCounselorIdCard).not.toHaveBeenCalled();
      expect(
        screen.queryByText(/ya existe|obligatoria|no se pudo validar/i),
      ).not.toBeInTheDocument();
    });

    it("cédula nueva que ya existe: checkCounselorIdCard resuelve {exists:true} y muestra el mensaje correspondiente", async () => {
      // Arrange
      (checkCounselorIdCard as any).mockResolvedValueOnce({ exists: true });
      await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;

      // Act
      fireEvent.change(idCardInput, { target: { value: "123456789" } });
      fireEvent.blur(idCardInput);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Esta cédula ya existe en el sistema.")).toBeInTheDocument();
      });
      expect(checkCounselorIdCard).toHaveBeenCalledWith("123456789", undefined);
    });

    it("cédula nueva disponible: checkCounselorIdCard resuelve {exists:false} y no muestra error", async () => {
      // Arrange
      (checkCounselorIdCard as any).mockResolvedValueOnce({ exists: false });
      await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;

      // Act
      fireEvent.change(idCardInput, { target: { value: "123456789" } });
      fireEvent.blur(idCardInput);

      // Assert
      await waitFor(() => expect(checkCounselorIdCard).toHaveBeenCalledTimes(1));
      expect(
        screen.queryByText(/ya existe|obligatoria|no se pudo validar/i),
      ).not.toBeInTheDocument();
    });

    it("si checkCounselorIdCard rechaza, muestra 'No se pudo validar la cédula (intenta de nuevo).'", async () => {
      // Arrange
      (checkCounselorIdCard as any).mockRejectedValueOnce(new Error("network error"));
      await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;

      // Act
      fireEvent.change(idCardInput, { target: { value: "123456789" } });
      fireEvent.blur(idCardInput);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText("No se pudo validar la cédula (intenta de nuevo)."),
        ).toBeInTheDocument();
      });
    });

    it("mientras la validación está en curso, muestra 'Validando cédula...'", async () => {
      // Arrange
      let resolveCheck!: (v: { exists: boolean }) => void;
      (checkCounselorIdCard as any).mockReturnValueOnce(
        new Promise((res) => {
          resolveCheck = res;
        }),
      );
      await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;

      // Act
      fireEvent.change(idCardInput, { target: { value: "123456789" } });
      fireEvent.blur(idCardInput);

      // Assert: pending
      await waitFor(() => {
        expect(screen.getByText("Validando cédula...")).toBeInTheDocument();
      });

      // Act: resolve
      await act(async () => {
        resolveCheck({ exists: false });
        await Promise.resolve();
      });

      // Assert: message gone once settled
      await waitFor(() => {
        expect(screen.queryByText("Validando cédula...")).not.toBeInTheDocument();
      });
    });

    it("onBlur de la cédula dispara validateIdCard automáticamente, salvo en modo 'view'", async () => {
      // Arrange & Act: create mode -> blur does trigger the backend check
      const firstRender = await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector(
        "input",
      ) as HTMLInputElement;
      fireEvent.change(idCardInput, { target: { value: "123456789" } });
      fireEvent.blur(idCardInput);
      await waitFor(() => expect(checkCounselorIdCard).toHaveBeenCalledTimes(1));
      // Unmount before rendering a second instance so `getFieldContainer`
      // doesn't match the "Cédula" label twice on the document.
      firstRender.unmount();

      // Arrange & Act: view mode -> blur never calls the backend check
      vi.clearAllMocks();
      (checkCounselorIdCard as any).mockResolvedValue({ exists: false });
      await renderForm({ mode: "view", initial: { id: 9, id_card: "111222333" } });
      const viewIdCardInput = getFieldContainer(/^cédula/i).querySelector(
        "input",
      ) as HTMLInputElement;
      expect(viewIdCardInput).toBeDisabled();
      fireEvent.blur(viewIdCardInput);
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(checkCounselorIdCard).not.toHaveBeenCalled();
    });
  });

  describe("canSubmit", () => {
    it("el botón 'Guardar' permanece deshabilitado hasta completar name/lastname/id_card/departamento/ciudad/franquicia, y reacciona a la longitud del celular", async () => {
      // Arrange
      (getDepartments as any).mockResolvedValue(makeDepartments());
      (getCitiesByDepartment as any).mockResolvedValue([
        { id: 3, name: "Medellín", department_id: 7 },
      ]);
      (getActiveFranchises as any).mockResolvedValue([{ id: 1, name: "Franquicia A" }]);
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

      // Act & Assert: + id_card
      fireEvent.change(getFieldContainer(/^cédula/i).querySelector("input")!, {
        target: { value: "123456789" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + department -> auto-selects its only city, franquicia still missing
      await openAndSelect(/^departamento/i, "Antioquia");
      await waitFor(() => {
        expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("Medellín");
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: + franquicia -> everything required is complete
      await openAndSelect(/^franquicia/i, "Franquicia A");
      expect(saveButton).not.toBeDisabled();

      // Act & Assert: an invalid-length movil disables it again
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "12345" },
      });
      expect(saveButton).toBeDisabled();

      // Act & Assert: exactly 10 digits re-enables it
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "3001234567" },
      });
      expect(saveButton).not.toBeDisabled();

      // Act & Assert: an empty movil is also valid
      fireEvent.change(getFieldContainer(/^celular/i).querySelector("input")!, {
        target: { value: "" },
      });
      expect(saveButton).not.toBeDisabled();
    });

    it("idCardError distinto de null deshabilita 'Guardar' aunque los demás campos estén completos", async () => {
      // Arrange
      (checkCounselorIdCard as any).mockResolvedValueOnce({ exists: true });
      await fillValidForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });
      expect(saveButton).not.toBeDisabled();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;

      // Act: onBlur validation finds the id_card already exists
      fireEvent.blur(idCardInput);

      // Assert
      await waitFor(() => expect(saveButton).toBeDisabled());
    });
  });

  describe("submit: revalidación forzada de la cédula antes de guardar", () => {
    it("si la revalidación de submit encuentra la cédula ya existente, alerta 'Cédula inválida' y no llama a onSubmit", async () => {
      // Arrange: canSubmit is already true (idCardError starts at null, never
      // validated via onBlur in this flow) -> the Guardar button is enabled
      // purely from field completeness, not from a prior successful check.
      (checkCounselorIdCard as any).mockResolvedValueOnce({ exists: true });
      const { onSubmit } = await fillValidForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });
      expect(saveButton).not.toBeDisabled();

      // Act
      fireEvent.click(saveButton);

      // Assert: submit() forces a real backend check before trusting canSubmit
      await waitFor(() => {
        expect(alert.warn).toHaveBeenCalledWith(
          "Cédula inválida",
          "Revisa la cédula antes de guardar.",
        );
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("con todos los datos válidos, click en 'Guardar' fuerza una revalidación real de la cédula y llama a onSubmit con el payload exacto", async () => {
      // Arrange
      const { onSubmit } = await fillValidForm();
      const saveButton = screen.getByRole("button", { name: /guardar/i });

      // Act
      fireEvent.click(saveButton);

      // Assert: the id_card is checked against the backend even though it was
      // never blurred before (proving the forced revalidation actually runs).
      await waitFor(() =>
        expect(checkCounselorIdCard).toHaveBeenCalledWith("123456789", undefined),
      );
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        name: "JUAN",
        lastname: "PÉREZ",
        id_card: "123456789",
        address: null,
        date_admission: null,
        type_contra: "Término Fijo",
        rol: 0,
        phone: null,
        movil: null,
        city_id: 3,
        user_id: 1,
        state: 1,
        email: null,
        password: null,
      });
      // Let the `finally { setSaving(false) }` in submit() settle before the
      // test ends, so it doesn't leak an unwrapped state update into whatever
      // runs next.
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^guardar$/i })).not.toBeDisabled();
      });
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
      expect(getFieldContainer(/^cédula/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^departamento/i).querySelector("input")).toHaveValue("");
      // With `departmentId` cleared, the city field becomes disabled again
      // (`disabled={isView || !departmentId}`) and shows no selection.
      expect(getFieldContainer(/^ciudad/i).querySelector("input")).toBeDisabled();
      expect(getFieldContainer(/^ciudad/i).querySelector("input")).toHaveValue("");
      expect(getFieldContainer(/^franquicia/i).querySelector("input")).toHaveValue("");
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("click en 'Limpiar' quita cualquier mensaje de error de cédula previo (idCardError vuelve a null)", async () => {
      // Arrange: leave the form with a visible id-card error
      (checkCounselorIdCard as any).mockResolvedValueOnce({ exists: true });
      await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;
      fireEvent.change(idCardInput, { target: { value: "123456789" } });
      fireEvent.blur(idCardInput);
      await waitFor(() => {
        expect(screen.getByText("Esta cédula ya existe en el sistema.")).toBeInTheDocument();
      });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

      // Assert
      expect(screen.queryByText("Esta cédula ya existe en el sistema.")).not.toBeInTheDocument();
    });

    it("click en 'Limpiar' resetea lastCheckedRef: la misma cédula vuelve a consultarse contra el backend tras limpiar", async () => {
      // Arrange: validate "123456789" once, then confirm the cache would
      // normally skip a second identical check (no new call happens).
      await renderForm();
      const idCardInput = getFieldContainer(/^cédula/i).querySelector("input") as HTMLInputElement;
      fireEvent.change(idCardInput, { target: { value: "123456789" } });
      fireEvent.blur(idCardInput);
      await waitFor(() => expect(checkCounselorIdCard).toHaveBeenCalledTimes(1));

      fireEvent.blur(idCardInput);
      await act(async () => {
        await Promise.resolve();
      });
      expect(checkCounselorIdCard).toHaveBeenCalledTimes(1); // cached, no re-query

      // Act: clear, then re-enter the exact same id_card and blur again
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));
      const idCardInputAfterClear = getFieldContainer(/^cédula/i).querySelector(
        "input",
      ) as HTMLInputElement;
      fireEvent.change(idCardInputAfterClear, { target: { value: "123456789" } });
      fireEvent.blur(idCardInputAfterClear);

      // Assert: `lastCheckedRef` was reset to "" by clear(), so the backend
      // is queried again for the very same value instead of hitting the cache.
      await waitFor(() => expect(checkCounselorIdCard).toHaveBeenCalledTimes(2));
    });
  });
});

describe("CounselorForm: texto en mayúsculas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Nombres, Apellidos y Dirección se escriben en mayúsculas", async () => {
    await renderForm();
    const cases: [RegExp, string, string][] = [
      [/^nombres/i, "luis ángel", "LUIS ÁNGEL"],
      [/^apellidos/i, "mora peña", "MORA PEÑA"],
      [/^dirección/i, "calle 9 # 4-5", "CALLE 9 # 4-5"],
    ];

    for (const [label, typed, expected] of cases) {
      const input = getFieldContainer(label).querySelector("input")!;
      fireEvent.change(input, { target: { value: typed } });
      expect(input).toHaveValue(expected);
    }
  });
});
