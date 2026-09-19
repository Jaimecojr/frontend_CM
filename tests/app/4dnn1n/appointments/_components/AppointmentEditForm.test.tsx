import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AppointmentEditForm from "@/app/4dnn1n/appointments/_components/AppointmentEditForm";
import {
  getActiveSpecialties,
  getDoctorsBySpecialty,
  type ApiAppointment,
  type SpecialtyOption,
  type DoctorForAppointment,
} from "@/app/4dnn1n/appointments/fetch";

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// specialty loading or doctor loading.
vi.mock("@/app/4dnn1n/appointments/fetch", () => ({
  getActiveSpecialties: vi.fn(),
  getDoctorsBySpecialty: vi.fn(),
}));

// The real component wraps flatpickr (a DOM-manipulating third-party calendar
// lib) which isn't part of AppointmentEditForm's own logic — stubbed with a
// plain input so tests can drive `form.date` through a standard change event
// instead of flatpickr's imperative API.
vi.mock("@/components/FormElements/DatePicker/DatePickerWithToday", () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="date-input-stub"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

function makeSpecialties(): SpecialtyOption[] {
  return [
    { id: 1, name: "Cardiología" },
    { id: 2, name: "Pediatría" },
  ];
}

function makeDoctor(overrides: Partial<DoctorForAppointment> = {}): DoctorForAppointment {
  return {
    id: 10,
    name: "Carlos",
    lastname: "Pérez",
    address: "Calle 10 # 5-20",
    city_id: 3,
    city: { id: 3, name: "Bogotá" },
    value_agreement: 50000,
    ...overrides,
  };
}

function makeInitial(overrides: Partial<ApiAppointment> = {}): ApiAppointment {
  return {
    id: 900,
    afi_code: 100,
    doctor_id: 10,
    date: "2026-09-01",
    hour: "10:30",
    address: "Cra 7 # 20-30",
    city_id: 5,
    phone: "3001234567",
    value: 50000,
    type: 1,
    name: "Juan García",
    user_id: 7,
    doctor: { id: 10, name: "Carlos", lastname: "Pérez", specialty_id: 1 },
    city: { id: 5, name: "Medellín" },
    ...overrides,
  };
}

/**
 * Locates a SearchableSelect field by its `<Label>` text (e.g. /especialidad/i)
 * rather than by placeholder: once an option is picked, SearchableSelect swaps
 * its placeholder for the selected option's own label, so a placeholder-based
 * lookup breaks the moment a value is already set (e.g. the doctor auto-select
 * under test here). The label sits in a sibling `<label>` right before the
 * field's root node, so its parent element is the shared field container.
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

/** Waits until the "Médico" field has finished loading (enabled) for the given specialty id. */
async function waitForDoctorsLoaded(specialtyId: number) {
  await waitFor(() => {
    expect(getDoctorsBySpecialty).toHaveBeenCalledWith(specialtyId);
    const input = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
    expect(input).not.toBeDisabled();
  });
}

/** Renders the form and waits for the mount-time specialties load to settle. */
async function renderEditForm(initial: ApiAppointment, onSubmit = vi.fn()) {
  const view = render(<AppointmentEditForm initial={initial} onSubmit={onSubmit} />);
  await waitFor(() => expect(getActiveSpecialties).toHaveBeenCalledTimes(1));
  // The mount effect calls `getActiveSpecialties().then(setSpecialties)` — the
  // assertion above only proves the call happened, not that the resulting
  // state update has flushed yet. Flush that pending microtask inside an
  // act() boundary so later interactions in the test don't trigger act warnings.
  await act(async () => {
    await Promise.resolve();
  });
  return { ...view, onSubmit };
}

describe("AppointmentEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveSpecialties as any).mockResolvedValue(makeSpecialties());
    (getDoctorsBySpecialty as any).mockResolvedValue([]);
  });

  describe("estado inicial derivado de `initial`", () => {
    it("precarga form (fecha/hora/dirección/teléfono/valor/ciudad) y specialtyId desde initial.doctor.specialty_id", async () => {
      // Arrange
      const initial = makeInitial();

      // Act
      await renderEditForm(initial);
      await waitForDoctorsLoaded(1);

      // Assert: form state comes straight from `initial`
      expect(screen.getByTestId("date-input-stub")).toHaveValue(initial.date);
      expect(screen.getByDisplayValue(initial.hour)).toBeInTheDocument();
      expect(screen.getByDisplayValue(initial.address)).toBeInTheDocument();
      // initial.value is 50000 and the amount field shows thousands separators
      expect(screen.getByDisplayValue("50.000")).toBeInTheDocument();
      expect(screen.getByDisplayValue(initial.phone)).toBeInTheDocument();
      // City is read-only and, with no doctor selected yet, falls back to initial.city.name
      expect(screen.getByText(initial.city!.name)).toBeInTheDocument();
      // specialtyId comes from initial.doctor.specialty_id (the field shows the matching label)
      const specialtyInput = getFieldContainer(/especialidad/i).querySelector("input") as HTMLInputElement;
      expect(specialtyInput).toHaveAttribute("placeholder", "Cardiología");
    });

    it("'Valor de la consulta' muestra punto de miles mientras se escribe", async () => {
      // Arrange
      await renderEditForm(makeInitial());
      await waitForDoctorsLoaded(1);
      const valueInput = screen.getByPlaceholderText("Ej: 50000");

      // Act
      fireEvent.change(valueInput, { target: { value: "1234567" } });

      // Assert
      expect(valueInput).toHaveValue("1.234.567");
    });

    it("si initial.doctor es null, specialtyId queda vacío y no se llama a getDoctorsBySpecialty", async () => {
      // Arrange
      const initial = makeInitial({ doctor: null });

      // Act
      await renderEditForm(initial);

      // Assert
      const specialtyInput = getFieldContainer(/especialidad/i).querySelector("input") as HTMLInputElement;
      expect(specialtyInput).toHaveAttribute("placeholder", "Buscar especialidad...");
      expect(getDoctorsBySpecialty).not.toHaveBeenCalled();
    });
  });

  describe("auto-selección del médico inicial (una sola vez)", () => {
    it("cuando llega la lista de médicos de la especialidad inicial, selecciona initial.doctor_id sin intervención del usuario", async () => {
      // Arrange
      const initial = makeInitial({ doctor_id: 10 });
      const doctor = makeDoctor({ id: 10, name: "Carlos", lastname: "Pérez" });
      (getDoctorsBySpecialty as any).mockResolvedValue([doctor]);

      // Act
      await renderEditForm(initial);
      await waitForDoctorsLoaded(1);

      // Assert: the "Médico" field shows the auto-selected doctor's label with no click at all
      const doctorInput = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
      expect(doctorInput).toHaveAttribute("placeholder", "Carlos Pérez");

      // Assert: auto-select only calls setSelectedDoctor — it does NOT run
      // handleSelectDoctor's side effects, so address/value still come from
      // `initial`, not from the auto-selected doctor's own fields.
      expect(screen.getByDisplayValue(initial.address)).toBeInTheDocument();
      expect(screen.getByDisplayValue("50.000")).toBeInTheDocument();
    });

    it("cambiar de especialidad después NO vuelve a auto-seleccionar, aunque la nueva lista incluya un médico con el mismo id que initial.doctor_id", async () => {
      // Arrange
      const initial = makeInitial({ doctor_id: 10 });
      const doctor10 = makeDoctor({ id: 10, name: "Carlos", lastname: "Pérez" });
      const doctor20 = makeDoctor({ id: 20, name: "Laura", lastname: "Ruiz" });
      (getDoctorsBySpecialty as any).mockImplementation((specialtyId: number) =>
        Promise.resolve(specialtyId === 1 ? [doctor10] : [doctor10, doctor20]),
      );
      await renderEditForm(initial);
      await waitForDoctorsLoaded(1);
      const doctorInputBefore = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
      expect(doctorInputBefore).toHaveAttribute("placeholder", "Carlos Pérez");

      // Act: the ref (`initialDoctorId`) was reset to 0 after the first auto-select above,
      // so switching specialty must not trigger it again — the user picks manually now.
      await openAndSelect(/especialidad/i, "Pediatría");
      await waitForDoctorsLoaded(2);

      // Assert: doctor10 (id === initial.doctor_id) is present in the new list, but nothing
      // gets auto-selected because the ref was already consumed.
      const doctorInputAfter = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
      expect(doctorInputAfter).toHaveAttribute("placeholder", "Buscar médico...");
    });
  });

  describe("canSubmit (sin validación de teléfono)", () => {
    it("con médico/fecha/hora/dirección/ciudad/valor completos, el botón queda habilitado sin importar el teléfono", async () => {
      // Arrange
      const initial = makeInitial({ phone: "" });
      const doctor = makeDoctor({ id: 10 });
      (getDoctorsBySpecialty as any).mockResolvedValue([doctor]);
      await renderEditForm(initial);
      await waitForDoctorsLoaded(1);
      const doctorInput = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
      expect(doctorInput).toHaveAttribute("placeholder", "Carlos Pérez");

      // Assert: an empty phone does not block submission — unlike AppointmentForm,
      // this component has no `phoneError` factored into `canSubmit`.
      expect(screen.getByRole("button", { name: /guardar cambios/i })).not.toBeDisabled();

      // Act: type a phone with an invalid length
      fireEvent.change(screen.getByPlaceholderText("Ej: 3001234567"), { target: { value: "12345" } });

      // Assert: still enabled
      expect(screen.getByRole("button", { name: /guardar cambios/i })).not.toBeDisabled();
    });

    it("sin médico seleccionado, el botón queda deshabilitado aunque el resto de campos ya tenga valores válidos", async () => {
      // Arrange
      const initial = makeInitial({ doctor: null, doctor_id: 0 });

      // Act
      await renderEditForm(initial);

      // Assert
      expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
    });
  });

  describe("handleSubmit", () => {
    it("click en 'Guardar Cambios' llama a onSubmit reutilizando afi_code/type/name/user_id de `initial`, no del formulario", async () => {
      // Arrange
      const initial = makeInitial({ afi_code: 555, type: 2, name: "Ana García", user_id: 42 });
      const doctor = makeDoctor({ id: 10 });
      (getDoctorsBySpecialty as any).mockResolvedValue([doctor]);
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const { container } = await renderEditForm(initial, onSubmit);
      await waitForDoctorsLoaded(1);
      const doctorInput = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
      expect(doctorInput).toHaveAttribute("placeholder", "Carlos Pérez");

      // Act: edit some of the fields that ARE editable in this view before saving
      fireEvent.change(screen.getByTestId("date-input-stub"), { target: { value: "2026-10-05" } });
      fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, {
        target: { value: "15:00" },
      });
      fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        afi_code: 555,
        type: 2,
        name: "Ana García",
        doctor_id: doctor.id,
        date: "2026-10-05",
        hour: "15:00",
        address: initial.address,
        city_id: initial.city_id,
        phone: initial.phone,
        value: initial.value,
        user_id: 42,
      });
    });

    it("el paciente (afi_code/type/name) se muestra solo como texto de solo lectura, sin ningún input editable", async () => {
      // Arrange
      const initial = makeInitial({ name: "Pedro Ramírez", type: 1 });

      // Act
      await renderEditForm(initial);

      // Assert: rendered as plain read-only text, never as a form control the user could edit
      const nameNode = screen.getByText("Pedro Ramírez");
      expect(nameNode.tagName).toBe("P");
      expect(screen.queryByDisplayValue("Pedro Ramírez")).not.toBeInTheDocument();
    });
  });
});

describe("AppointmentEditForm: texto en mayúsculas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveSpecialties as any).mockResolvedValue(makeSpecialties());
    (getDoctorsBySpecialty as any).mockResolvedValue([]);
  });

  it("Dirección de la consulta se escribe en mayúsculas", async () => {
    await renderEditForm(makeInitial());
    await waitForDoctorsLoaded(1);
    const input = getFieldContainer(/^dirección de la consulta/i).querySelector("input")!;

    fireEvent.change(input, { target: { value: "consultorio 4, piso 2" } });

    expect(input).toHaveValue("CONSULTORIO 4, PISO 2");
  });
});
