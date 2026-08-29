import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AppointmentForm from "@/app/4dnn1n/appointments/_components/AppointmentForm";
import {
  searchAffiliateByIdCard,
  getActiveSpecialties,
  getDoctorsBySpecialty,
  type AffiliateForAppointment,
  type SpecialtyOption,
  type DoctorForAppointment,
} from "@/app/4dnn1n/appointments/fetch";

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// affiliate search, specialty loading, or doctor loading.
vi.mock("@/app/4dnn1n/appointments/fetch", () => ({
  searchAffiliateByIdCard: vi.fn(),
  getActiveSpecialties: vi.fn(),
  getDoctorsBySpecialty: vi.fn(),
}));

// The real component wraps flatpickr (a DOM-manipulating third-party calendar
// lib) which isn't part of AppointmentForm's own logic — stubbed with a plain
// input so tests can drive `form.date` through a standard change event instead
// of flatpickr's imperative API.
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

function makeDoctors(): DoctorForAppointment[] {
  return [
    {
      id: 10,
      name: "Carlos",
      lastname: "Pérez",
      address: "Calle 10 # 5-20",
      city_id: 3,
      city: { id: 3, name: "Bogotá" },
      value_agreement: 50000,
    },
  ];
}

function makeAffiliate(overrides: Partial<AffiliateForAppointment> = {}): AffiliateForAppointment {
  return {
    id: 100,
    name: "Juan",
    lastname: "García",
    id_card: "123456",
    movil: "3001234567",
    phone: null,
    stade: 1,
    validity_end: "2026-12-31",
    beneficiaries: [
      { id: 200, name: "Ana García", id_card: "999" },
      { id: 201, name: "Luis García", id_card: null },
    ],
    ...overrides,
  };
}

/**
 * Locates a SearchableSelect field by its `<Label>` text (e.g. /especialidad/i)
 * rather than by placeholder: once an option is picked, SearchableSelect swaps
 * its placeholder for the selected option's own label, so a placeholder-based
 * lookup breaks the moment a value is already set (e.g. re-opening "Especialidad"
 * to change it). The label sits in a sibling `<label>` right before the field's
 * root node, so its parent element is the shared field container.
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

/** Renders the form and waits for the mount-time specialties load to settle. */
async function renderForm(onSubmit = vi.fn(), userId = 1) {
  const view = render(<AppointmentForm onSubmit={onSubmit} userId={userId} />);
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

/** Types the id card and clicks "Buscar", waiting for the result cards to show. */
async function searchAndGetAffiliate(affiliate: AffiliateForAppointment = makeAffiliate()) {
  (searchAffiliateByIdCard as any).mockResolvedValue(affiliate);
  const input = screen.getByPlaceholderText("Ej: 1234567890");
  fireEvent.change(input, { target: { value: affiliate.id_card } });
  fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
  await screen.findByText(/^titular/i);
  return affiliate;
}

/** Drives the full happy path up to a selected doctor: search, pick the policyholder,
 * pick a specialty, and pick a doctor. Leaves the form ready for Section 3 assertions. */
async function selectPatientAndDoctor(doctors: DoctorForAppointment[] = makeDoctors()) {
  (getDoctorsBySpecialty as any).mockResolvedValue(doctors);
  const affiliate = await searchAndGetAffiliate();
  fireEvent.click(screen.getByText(`${affiliate.name} ${affiliate.lastname}`));
  await openAndSelect(/especialidad/i, "Cardiología");
  // Wait for the doctors request to fully settle (not just to have been
  // called) so `setDoctors`/`setDoctorsLoading` have already flushed before
  // interacting with the "Médico" field.
  await waitFor(() => {
    expect(getDoctorsBySpecialty).toHaveBeenCalledWith(1);
    const input = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
    expect(input).not.toBeDisabled();
  });
  await openAndSelect(/^médico$/i, `${doctors[0].name} ${doctors[0].lastname}`);
  return { affiliate, doctors };
}

describe("AppointmentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveSpecialties as any).mockResolvedValue(makeSpecialties());
    (getDoctorsBySpecialty as any).mockResolvedValue(makeDoctors());
    (searchAffiliateByIdCard as any).mockResolvedValue(makeAffiliate());
  });

  describe("búsqueda de afiliado", () => {
    it("al montar llama a getActiveSpecialties una vez", async () => {
      // Arrange & Act
      await renderForm();

      // Assert
      expect(getActiveSpecialties).toHaveBeenCalledTimes(1);
    });

    it("escribir un documento y click en Buscar llama a searchAffiliateByIdCard con el valor recortado", async () => {
      // Arrange
      await renderForm();
      const input = screen.getByPlaceholderText("Ej: 1234567890");

      // Act
      fireEvent.change(input, { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: /buscar/i }));

      // Assert
      await waitFor(() => expect(searchAffiliateByIdCard).toHaveBeenCalledWith("123456"));
    });

    it("búsqueda exitosa muestra la tarjeta de Titular y la de cada beneficiario", async () => {
      // Arrange
      const affiliate = makeAffiliate();
      await renderForm();

      // Act
      await searchAndGetAffiliate(affiliate);

      // Assert
      expect(screen.getByText("Juan García")).toBeInTheDocument();
      expect(screen.getByText(/^titular/i)).toBeInTheDocument();
      expect(screen.getByText("Ana García")).toBeInTheDocument();
      expect(screen.getByText("Luis García")).toBeInTheDocument();
    });

    it("búsqueda fallida muestra el mensaje de error de getApiErrorMessage", async () => {
      // Arrange
      (searchAffiliateByIdCard as any).mockRejectedValue(new Error("Afiliado no encontrado"));
      await renderForm();
      const input = screen.getByPlaceholderText("Ej: 1234567890");

      // Act
      fireEvent.change(input, { target: { value: "999999" } });
      fireEvent.click(screen.getByRole("button", { name: /buscar/i }));

      // Assert
      expect(await screen.findByText("Afiliado no encontrado")).toBeInTheDocument();
    });

    it("con el input vacío (o solo espacios/letras filtradas) el botón Buscar está deshabilitado", async () => {
      // Arrange
      await renderForm();
      const input = screen.getByPlaceholderText("Ej: 1234567890");

      // Assert: initial empty state
      expect(screen.getByRole("button", { name: /buscar/i })).toBeDisabled();

      // Act: typing only non-digit characters is filtered down to an empty string
      fireEvent.change(input, { target: { value: "   " } });

      // Assert
      expect(input).toHaveValue("");
      expect(screen.getByRole("button", { name: /buscar/i })).toBeDisabled();
    });
  });

  describe("selección de paciente y carga de médicos", () => {
    it("click en la tarjeta de Titular fija selectedPatient y autocompleta el teléfono desde movil (recortado a 10 dígitos)", async () => {
      // Arrange
      const affiliate = makeAffiliate({ movil: "300123456799" }); // more than 10 digits on purpose
      await renderForm();
      await searchAndGetAffiliate(affiliate);

      // Act
      fireEvent.click(screen.getByText(`${affiliate.name} ${affiliate.lastname}`));
      expect(await screen.findByText(/especialidad y médico/i)).toBeInTheDocument();
      await openAndSelect(/especialidad/i, "Cardiología");
      await waitFor(() => {
        expect(getDoctorsBySpecialty).toHaveBeenCalledWith(1);
        const input = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
        expect(input).not.toBeDisabled();
      });
      await openAndSelect(/^médico$/i, "Carlos Pérez");

      // Assert
      expect(screen.getByPlaceholderText("Ej: 3001234567")).toHaveValue("3001234567");
    });

    it("usa affiliate.phone cuando movil es null", async () => {
      // Arrange
      const affiliate = makeAffiliate({ movil: null, phone: "3109876543" });
      await renderForm();
      await searchAndGetAffiliate(affiliate);

      // Act
      fireEvent.click(screen.getByText(`${affiliate.name} ${affiliate.lastname}`));
      await openAndSelect(/especialidad/i, "Cardiología");
      await waitFor(() => {
        expect(getDoctorsBySpecialty).toHaveBeenCalledWith(1);
        const input = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
        expect(input).not.toBeDisabled();
      });
      await openAndSelect(/^médico$/i, "Carlos Pérez");

      // Assert
      expect(screen.getByPlaceholderText("Ej: 3001234567")).toHaveValue("3109876543");
    });

    it("click en un beneficiario fija selectedPatient con su propio afiCode/type/name", async () => {
      // Arrange
      const affiliate = makeAffiliate();
      await renderForm();
      await searchAndGetAffiliate(affiliate);

      // Act
      fireEvent.click(screen.getByText("Ana García"));

      // Assert: section 2 only renders when `selectedPatient` is set
      expect(await screen.findByText(/especialidad y médico/i)).toBeInTheDocument();
    });

    it("seleccionar una especialidad llama a getDoctorsBySpecialty y el selector de médico queda deshabilitado mientras carga", async () => {
      // Arrange
      let resolveDoctors!: (v: DoctorForAppointment[]) => void;
      (getDoctorsBySpecialty as any).mockImplementation(
        () => new Promise<DoctorForAppointment[]>((res) => { resolveDoctors = res; }),
      );
      await renderForm();
      await searchAndGetAffiliate();
      fireEvent.click(screen.getByText("Juan García"));

      // Act
      await openAndSelect(/especialidad/i, "Cardiología");

      // Assert: request fired, and the "Médico" field is disabled while
      // `doctorsLoading` is true (the `disabled` prop passed down is
      // `!specialtyId || doctorsLoading`).
      expect(getDoctorsBySpecialty).toHaveBeenCalledWith(1);
      const doctorInput = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
      expect(doctorInput).toBeDisabled();

      // Act: resolve the pending doctors request
      resolveDoctors(makeDoctors());

      // Assert: the doctor selector becomes enabled once loading finishes
      await waitFor(() => {
        const input = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
        expect(input).not.toBeDisabled();
      });
    });

    it("cambiar de especialidad resetea el médico seleccionado (la sección de detalles desaparece)", async () => {
      // Arrange
      await renderForm();
      await selectPatientAndDoctor();
      expect(screen.getByText(/detalles de la cita/i)).toBeInTheDocument();

      // Act
      await openAndSelect(/especialidad/i, "Pediatría");

      // Assert: `selectedDoctor` was reset to null, so section 3 unmounts
      expect(screen.queryByText(/detalles de la cita/i)).not.toBeInTheDocument();
    });
  });

  describe("selección de médico (autocompletado)", () => {
    it("autocompleta address, value y muestra la ciudad (read-only) desde el médico elegido", async () => {
      // Arrange & Act
      await renderForm();
      const { doctors } = await selectPatientAndDoctor();

      // Assert
      expect(screen.getByPlaceholderText("Dirección del consultorio")).toHaveValue(doctors[0].address);
      expect(screen.getByPlaceholderText("Ej: 50000")).toHaveValue(String(doctors[0].value_agreement));
      expect(screen.getByText(doctors[0].city!.name)).toBeInTheDocument();
    });
  });

  describe("validaciones", () => {
    it("value 5000 muestra el error de mínimo; 10000 no muestra error", async () => {
      // Arrange
      await renderForm();
      await selectPatientAndDoctor();
      const valueInput = screen.getByPlaceholderText("Ej: 50000");

      // Act & Assert: below minimum
      fireEvent.change(valueInput, { target: { value: "5000" } });
      expect(screen.getByText("El valor debe ser mayor o igual a $10.000")).toBeInTheDocument();

      // Act & Assert: exactly at minimum
      fireEvent.change(valueInput, { target: { value: "10000" } });
      expect(screen.queryByText("El valor debe ser mayor o igual a $10.000")).not.toBeInTheDocument();
    });

    it("phone con 5 dígitos muestra el error de longitud; con 10 dígitos no muestra error", async () => {
      // Arrange
      await renderForm();
      await selectPatientAndDoctor();
      const phoneInput = screen.getByPlaceholderText("Ej: 3001234567");

      // Act & Assert: too short
      fireEvent.change(phoneInput, { target: { value: "12345" } });
      expect(screen.getByText("El teléfono debe tener exactamente 10 dígitos")).toBeInTheDocument();

      // Act & Assert: exactly 10 digits
      fireEvent.change(phoneInput, { target: { value: "3001234567" } });
      expect(screen.queryByText("El teléfono debe tener exactamente 10 dígitos")).not.toBeInTheDocument();
    });

    it("canSubmit es false si aún no se ha seleccionado ningún paciente", async () => {
      // Arrange & Act: "Guardar Cita" is unconditionally rendered, even before any search
      await renderForm();

      // Assert
      expect(screen.getByRole("button", { name: /guardar cita/i })).toBeDisabled();
    });

    it("canSubmit es false si hay paciente pero aún no se ha seleccionado médico", async () => {
      // Arrange
      const affiliate = makeAffiliate();
      await renderForm();
      await searchAndGetAffiliate(affiliate);

      // Act: select the patient but stop before picking a specialty/doctor
      fireEvent.click(screen.getByText(`${affiliate.name} ${affiliate.lastname}`));
      await screen.findByText(/especialidad y médico/i);

      // Assert
      expect(screen.getByRole("button", { name: /guardar cita/i })).toBeDisabled();
    });

    it("canSubmit es false mientras falten fecha y hora, aunque el resto ya esté completo", async () => {
      // Arrange & Act
      await renderForm();
      await selectPatientAndDoctor();

      // Assert: address/city/value/phone are already auto-filled, but date/hour are empty
      expect(screen.getByRole("button", { name: /guardar cita/i })).toBeDisabled();
    });

    it("canSubmit es false si se borra la dirección manualmente", async () => {
      // Arrange
      const { container } = await renderForm();
      await selectPatientAndDoctor();
      fireEvent.change(screen.getByTestId("date-input-stub"), { target: { value: "2026-09-01" } });
      fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, {
        target: { value: "10:30" },
      });
      expect(screen.getByRole("button", { name: /guardar cita/i })).not.toBeDisabled();

      // Act
      fireEvent.change(screen.getByPlaceholderText("Dirección del consultorio"), {
        target: { value: "" },
      });

      // Assert
      expect(screen.getByRole("button", { name: /guardar cita/i })).toBeDisabled();
    });

    it("canSubmit es false si el valor queda por debajo de 10000", async () => {
      // Arrange
      const { container } = await renderForm();
      await selectPatientAndDoctor();
      fireEvent.change(screen.getByTestId("date-input-stub"), { target: { value: "2026-09-01" } });
      fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, {
        target: { value: "10:30" },
      });

      // Act
      fireEvent.change(screen.getByPlaceholderText("Ej: 50000"), { target: { value: "5000" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar cita/i })).toBeDisabled();
    });

    it("canSubmit es false si el teléfono es inválido", async () => {
      // Arrange
      const { container } = await renderForm();
      await selectPatientAndDoctor();
      fireEvent.change(screen.getByTestId("date-input-stub"), { target: { value: "2026-09-01" } });
      fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, {
        target: { value: "10:30" },
      });

      // Act
      fireEvent.change(screen.getByPlaceholderText("Ej: 3001234567"), { target: { value: "12345" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar cita/i })).toBeDisabled();
    });

    it("canSubmit es true solo cuando fecha, hora y el resto de campos son válidos", async () => {
      // Arrange
      const { container } = await renderForm();
      await selectPatientAndDoctor();

      // Act
      fireEvent.change(screen.getByTestId("date-input-stub"), { target: { value: "2026-09-01" } });
      fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, {
        target: { value: "10:30" },
      });

      // Assert
      expect(screen.getByRole("button", { name: /guardar cita/i })).not.toBeDisabled();
    });
  });

  describe("envío y limpieza", () => {
    it("con todos los campos válidos, click en 'Guardar Cita' llama onSubmit con el payload exacto (titular)", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const { container } = await renderForm(onSubmit, 7);
      const { affiliate, doctors } = await selectPatientAndDoctor();
      fireEvent.change(screen.getByTestId("date-input-stub"), { target: { value: "2026-09-01" } });
      fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, {
        target: { value: "10:30" },
      });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar cita/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        afi_code: affiliate.id,
        type: 1,
        name: `${affiliate.name} ${affiliate.lastname}`,
        doctor_id: doctors[0].id,
        date: "2026-09-01",
        hour: "10:30",
        address: doctors[0].address,
        city_id: doctors[0].city_id,
        phone: affiliate.movil,
        value: doctors[0].value_agreement,
        user_id: 7,
      });
    });

    it("con un beneficiario seleccionado, el payload usa type: 2, su propio afi_code y nombre", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const affiliate = makeAffiliate();
      const doctors = makeDoctors();
      (getDoctorsBySpecialty as any).mockResolvedValue(doctors);
      const { container } = await renderForm(onSubmit, 9);
      await searchAndGetAffiliate(affiliate);

      // Act
      fireEvent.click(screen.getByText("Ana García"));
      await openAndSelect(/especialidad/i, "Cardiología");
      await waitFor(() => {
        expect(getDoctorsBySpecialty).toHaveBeenCalledWith(1);
        const input = getFieldContainer(/^médico$/i).querySelector("input") as HTMLInputElement;
        expect(input).not.toBeDisabled();
      });
      await openAndSelect(/^médico$/i, "Carlos Pérez");
      fireEvent.change(screen.getByTestId("date-input-stub"), { target: { value: "2026-09-02" } });
      fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, {
        target: { value: "08:00" },
      });
      fireEvent.click(screen.getByRole("button", { name: /guardar cita/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          afi_code: 200,
          type: 2,
          name: "Ana García",
          user_id: 9,
        }),
      );
    });

    it("click en 'Limpiar' resetea la búsqueda, el paciente seleccionado y el formulario completo", async () => {
      // Arrange
      await renderForm();
      await selectPatientAndDoctor();

      // Act
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

      // Assert
      expect(screen.getByPlaceholderText("Ej: 1234567890")).toHaveValue("");
      expect(screen.getByRole("button", { name: /buscar/i })).toBeDisabled();
      expect(screen.queryByText(/^titular/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/especialidad y médico/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/detalles de la cita/i)).not.toBeInTheDocument();
    });
  });
});
