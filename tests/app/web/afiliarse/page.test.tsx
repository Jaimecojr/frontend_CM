import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AfiliacioPage from "@/app/web/afiliarse/page";
import { csrf, getXsrfToken } from "@/lib/api";
import type { Department, City } from "@/types/geo";

/* ────────────────────────────── Mocks ────────────────────────────── */

// The real widget talks to Google; the stub exposes a button that plays the
// role of "the user solved the captcha" and a ref with reset(), which the page
// calls on every failed submit.
const { recaptchaResetMock } = vi.hoisted(() => ({ recaptchaResetMock: vi.fn() }));

vi.mock("react-google-recaptcha", async () => {
  const React = await import("react");
  const RecaptchaStub = React.forwardRef(function RecaptchaStub(
    props: { onChange: (token: string | null) => void; onExpired?: () => void },
    ref: React.Ref<{ reset: () => void }>,
  ) {
    React.useImperativeHandle(ref, () => ({ reset: recaptchaResetMock }));
    return (
      <>
        <button
          type="button"
          data-testid="recaptcha-stub"
          onClick={() => props.onChange("captcha-token")}
        >
          recaptcha stub
        </button>
        <button
          type="button"
          data-testid="recaptcha-expire"
          onClick={() => props.onExpired?.()}
        >
          recaptcha expirado
        </button>
      </>
    );
  });
  return { default: RecaptchaStub };
});

vi.mock("@/lib/api", () => ({
  csrf: vi.fn(async () => undefined),
  getXsrfToken: vi.fn(() => "xsrf-de-prueba"),
}));

// Its own behavior is covered in LegalModal.test.tsx; here only the wiring
// (which type is opened, and that onClose closes it) matters.
vi.mock("@/components/web/LegalModal", () => ({
  default: ({ type, onClose }: { type: "privacy" | "terms"; onClose: () => void }) => (
    <div data-testid="legal-modal" data-type={type}>
      <button type="button" onClick={onClose}>
        cerrar-modal
      </button>
    </div>
  ),
}));

const csrfMock = vi.mocked(csrf);
const getXsrfTokenMock = vi.mocked(getXsrfToken);

/* ───────────────────────── Datos y utilidades ───────────────────────── */

// The page module reads the base URL at import time from the same variable.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const DEPARTMENTS: Department[] = [
  { id: 1, name: "Quindío" },
  { id: 2, name: "Antioquia" },
];

const CITIES_BY_DEPARTMENT: Record<number, City[]> = {
  1: [
    { id: 11, name: "Armenia", department_id: 1 },
    { id: 12, name: "Calarcá", department_id: 1 },
  ],
  2: [{ id: 21, name: "Medellín", department_id: 2 }],
};

const VALID_INPUT = {
  name: "Juan Carlos",
  lastname: "Gómez Pérez",
  cedula: "1094000000",
  movil: "3001234567",
  email: "juan.gomez@example.com",
  birthDate: "1990-05-20",
  address: "Calle 10 # 5-23, Barrio Centro",
};

const fetchMock = vi.fn<typeof fetch>();

/** Response shape the page consumes: only `ok` and `json()` are read. */
function jsonResponse(ok: boolean, data: unknown, status = ok ? 200 : 422): Response {
  return { ok, status, json: async () => data } as Response;
}

/** Per-test reply for POST /api/public/affiliate-request. */
let postResponse: () => Promise<Response>;
/** Per-test reply for GET /api/public/departments. */
let departmentsResponse: () => Promise<Response>;

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No existe el elemento con id "${id}" en el formulario.`);
  return el as T;
}

function getForm(): HTMLFormElement {
  const form = document.querySelector("form");
  if (!form) throw new Error("El formulario no está renderizado.");
  return form;
}

function getSubmitButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /Enviar solicitud/ }) as HTMLButtonElement;
}

/** The beneficiary-count select is the only one offering "Sin beneficiarios". */
function getBeneficiaryCountSelect(): HTMLSelectElement {
  const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
  const found = selects.find((select) =>
    Array.from(select.options).some((option) => option.text === "Sin beneficiarios"),
  );
  if (!found) throw new Error("No se encontró el select de cantidad de beneficiarios.");
  return found;
}

function getPrivacyCheckbox(): HTMLInputElement {
  return screen.getAllByRole("checkbox")[0] as HTMLInputElement;
}

function getTermsCheckbox(): HTMLInputElement {
  return screen.getAllByRole("checkbox")[1] as HTMLInputElement;
}

/** Records which element received scrollIntoView and with which options. */
const scrollCalls: Array<{ id: string; options: unknown }> = [];

/** Renders and waits for the department catalog to land in the select. */
async function renderPage() {
  const utils = render(<AfiliacioPage />);
  await screen.findByRole("option", { name: "Quindío" });
  return utils;
}

/** Fills every required field with valid data (captcha + both checkboxes included). */
async function fillValidForm(options: { advisorName?: string; beneficiary?: string } = {}) {
  fireEvent.change(byId("name"), { target: { value: VALID_INPUT.name } });
  fireEvent.change(byId("lastname"), { target: { value: VALID_INPUT.lastname } });
  fireEvent.change(byId("document"), { target: { value: VALID_INPUT.cedula } });
  fireEvent.change(byId("movil"), { target: { value: VALID_INPUT.movil } });
  fireEvent.change(byId("email"), { target: { value: VALID_INPUT.email } });
  fireEvent.change(byId("birthDate"), { target: { value: VALID_INPUT.birthDate } });
  fireEvent.change(byId("address"), { target: { value: VALID_INPUT.address } });

  fireEvent.change(byId("deptId"), { target: { value: "1" } });
  await screen.findByRole("option", { name: "Armenia" });
  fireEvent.change(byId("cityId"), { target: { value: "11" } });

  if (options.beneficiary !== undefined) {
    fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "1" } });
    fireEvent.change(byId("ben_0"), { target: { value: options.beneficiary } });
  }

  if (options.advisorName !== undefined) {
    fireEvent.change(screen.getByPlaceholderText("Nombre del asesor que te asesoró"), {
      target: { value: options.advisorName },
    });
  }

  fireEvent.click(screen.getByTestId("recaptcha-stub"));
  fireEvent.click(getPrivacyCheckbox());
  fireEvent.click(getTermsCheckbox());
}

/** Body actually sent to POST /api/public/affiliate-request. */
function getPostCall(): [RequestInfo | URL, RequestInit | undefined] {
  const call = fetchMock.mock.calls.find(([input]) =>
    urlOf(input).endsWith("/api/public/affiliate-request"),
  );
  if (!call) throw new Error("No se hizo POST a /api/public/affiliate-request.");
  return call as [RequestInfo | URL, RequestInit | undefined];
}

/* ─────────────────────────────── Tests ─────────────────────────────── */

describe("AfiliacioPage (formulario público de afiliación)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scrollCalls.length = 0;

    // jsdom does not implement scrollIntoView; the page uses it to focus the
    // first field with an error.
    Element.prototype.scrollIntoView = vi.fn(function (
      this: Element,
      options?: boolean | ScrollIntoViewOptions,
    ) {
      scrollCalls.push({ id: this.id, options });
    }) as unknown as typeof Element.prototype.scrollIntoView;

    getXsrfTokenMock.mockReturnValue("xsrf-de-prueba");
    departmentsResponse = async () => jsonResponse(true, { data: DEPARTMENTS });
    postResponse = async () => jsonResponse(true, { success: true });

    fetchMock.mockImplementation(async (input) => {
      const url = urlOf(input);
      if (url.endsWith("/api/public/departments")) return departmentsResponse();
      const citiesMatch = url.match(/\/api\/public\/departments\/(\d+)\/cities$/);
      if (citiesMatch) {
        return jsonResponse(true, { data: CITIES_BY_DEPARTMENT[Number(citiesMatch[1])] ?? [] });
      }
      if (url.endsWith("/api/public/affiliate-request")) return postResponse();
      throw new Error(`URL no mockeada en el test: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── Paso 1 ── */
  describe("Paso 1: carga de catálogos y cascada departamento → ciudad", () => {
    it("pide los departamentos al montar y los muestra en el select", async () => {
      // Arrange & Act
      await renderPage();

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/public/departments`, {
        headers: { Accept: "application/json" },
      });
      expect(screen.getByRole("option", { name: "Quindío" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Antioquia" })).toBeInTheDocument();
    });

    it("deja el select de ciudad deshabilitado mientras no haya departamento elegido", async () => {
      // Arrange & Act
      await renderPage();

      // Assert
      expect(byId<HTMLSelectElement>("cityId")).toBeDisabled();
      expect(
        screen.getByRole("option", { name: "Primero selecciona un departamento" }),
      ).toBeInTheDocument();
    });

    it("al elegir un departamento pide sus ciudades y habilita el select de ciudad", async () => {
      // Arrange
      await renderPage();

      // Act
      fireEvent.change(byId("deptId"), { target: { value: "1" } });

      // Assert
      await screen.findByRole("option", { name: "Armenia" });
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/public/departments/1/cities`, {
        headers: { Accept: "application/json" },
      });
      expect(byId<HTMLSelectElement>("cityId")).not.toBeDisabled();
      expect(screen.getByRole("option", { name: "Calarcá" })).toBeInTheDocument();
    });

    it("al cambiar de departamento reemplaza el listado de ciudades", async () => {
      // Arrange
      await renderPage();
      fireEvent.change(byId("deptId"), { target: { value: "1" } });
      await screen.findByRole("option", { name: "Armenia" });

      // Act
      fireEvent.change(byId("deptId"), { target: { value: "2" } });

      // Assert
      await screen.findByRole("option", { name: "Medellín" });
      expect(screen.queryByRole("option", { name: "Armenia" })).not.toBeInTheDocument();
    });

    it("al volver el departamento a vacío limpia las ciudades y deshabilita el select", async () => {
      // Arrange
      await renderPage();
      fireEvent.change(byId("deptId"), { target: { value: "1" } });
      await screen.findByRole("option", { name: "Armenia" });
      fireEvent.change(byId("cityId"), { target: { value: "11" } });

      // Act
      fireEvent.change(byId("deptId"), { target: { value: "" } });

      // Assert
      await waitFor(() => {
        expect(screen.queryByRole("option", { name: "Armenia" })).not.toBeInTheDocument();
      });
      expect(byId<HTMLSelectElement>("cityId")).toBeDisabled();
      expect(byId<HTMLSelectElement>("cityId").value).toBe("");
    });

    it("si la respuesta de departamentos no trae data, deja el select solo con el placeholder", async () => {
      // Arrange
      departmentsResponse = async () => jsonResponse(true, {});

      // Act
      await act(async () => {
        render(<AfiliacioPage />);
      });

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/public/departments`, {
        headers: { Accept: "application/json" },
      });
      expect(screen.getAllByRole("option", { name: "Selecciona un departamento" })).toHaveLength(1);
      expect(screen.queryByRole("option", { name: "Quindío" })).not.toBeInTheDocument();
    });

    it("si falla la carga de departamentos registra el error y deja la página usable", async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      departmentsResponse = async () => jsonResponse(false, {}, 500);

      // Act
      render(<AfiliacioPage />);

      // Assert
      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
      expect(screen.queryByRole("option", { name: "Quindío" })).not.toBeInTheDocument();
      expect(getSubmitButton()).toBeInTheDocument();
    });
  });

  /* ── Paso 2 ── */
  describe("Paso 2: beneficiarios dinámicos", () => {
    it("al elegir 3 beneficiarios muestra tres bloques con su campo de nombre", async () => {
      // Arrange
      await renderPage();

      // Act
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "3" } });

      // Assert
      expect(screen.getByText("Beneficiario 1")).toBeInTheDocument();
      expect(screen.getByText("Beneficiario 2")).toBeInTheDocument();
      expect(screen.getByText("Beneficiario 3")).toBeInTheDocument();
      expect(byId<HTMLInputElement>("ben_0").value).toBe("");
      expect(byId<HTMLInputElement>("ben_2").value).toBe("");
    });

    it("al reducir la cantidad conserva los nombres de los beneficiarios que quedan", async () => {
      // Arrange
      await renderPage();
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "3" } });
      fireEvent.change(byId("ben_0"), { target: { value: "María Fernanda López" } });
      fireEvent.change(byId("ben_1"), { target: { value: "Pedro Ruiz" } });

      // Act
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "1" } });

      // Assert
      expect(byId<HTMLInputElement>("ben_0").value).toBe("María Fernanda López");
      expect(screen.queryByText("Beneficiario 2")).not.toBeInTheDocument();
      expect(document.getElementById("ben_1")).toBeNull();
    });

    it("al aumentar la cantidad agrega bloques vacíos sin tocar los ya escritos", async () => {
      // Arrange
      await renderPage();
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "1" } });
      fireEvent.change(byId("ben_0"), { target: { value: "María Fernanda López" } });

      // Act
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "2" } });

      // Assert
      expect(byId<HTMLInputElement>("ben_0").value).toBe("María Fernanda López");
      expect(byId<HTMLInputElement>("ben_1").value).toBe("");
    });

    it("al volver a 'Sin beneficiarios' quita todos los bloques", async () => {
      // Arrange
      await renderPage();
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "2" } });

      // Act
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "0" } });

      // Assert
      expect(screen.queryByText("Beneficiario 1")).not.toBeInTheDocument();
      expect(document.getElementById("ben_0")).toBeNull();
    });
  });

  /* ── Paso 3 ── */
  describe("Paso 3: validaciones del formulario", () => {
    it("con el formulario vacío muestra el mensaje exacto de cada regla y no envía nada", async () => {
      // Arrange: el botón está deshabilitado sin captcha ni checkboxes, así que
      // se dispara el submit del form para ejercitar todas las reglas a la vez.
      await renderPage();

      // Act
      fireEvent.submit(getForm());

      // Assert
      expect(await screen.findByText("El nombre es requerido.")).toBeInTheDocument();
      expect(screen.getByText("Los apellidos son requeridos.")).toBeInTheDocument();
      expect(screen.getByText("La cédula debe contener solo números.")).toBeInTheDocument();
      expect(screen.getByText("El celular debe tener exactamente 10 dígitos.")).toBeInTheDocument();
      expect(screen.getByText("Ingresa un correo válido.")).toBeInTheDocument();
      expect(screen.getByText("La fecha de nacimiento es requerida.")).toBeInTheDocument();
      expect(screen.getByText("La dirección es requerida.")).toBeInTheDocument();
      expect(screen.getByText("Selecciona un departamento.")).toBeInTheDocument();
      expect(screen.getByText("Selecciona una ciudad.")).toBeInTheDocument();
      expect(screen.getByText("Por favor completa el reCAPTCHA.")).toBeInTheDocument();
      expect(screen.getByText("Debes aceptar la Política de Privacidad.")).toBeInTheDocument();
      expect(screen.getByText("Debes aceptar los Términos y Condiciones.")).toBeInTheDocument();
      expect(csrfMock).not.toHaveBeenCalled();
      expect(
        fetchMock.mock.calls.some(([input]) =>
          urlOf(input).endsWith("/api/public/affiliate-request"),
        ),
      ).toBe(false);
    });

    it("desplaza la vista hasta el primer campo con error", async () => {
      // Arrange
      await renderPage();

      // Act
      fireEvent.submit(getForm());

      // Assert
      await screen.findByText("El nombre es requerido.");
      expect(scrollCalls).toHaveLength(1);
      expect(scrollCalls[0]).toEqual({
        id: "name",
        options: { behavior: "smooth", block: "center" },
      });
    });

    it("desplaza hasta el bloque de privacidad cuando los demás campos ya son válidos", async () => {
      // Arrange
      await renderPage();
      await fillValidForm();
      fireEvent.click(getPrivacyCheckbox()); // se desmarca a propósito
      scrollCalls.length = 0;

      // Act
      fireEvent.submit(getForm());

      // Assert
      await screen.findByText("Debes aceptar la Política de Privacidad.");
      expect(scrollCalls[0].id).toBe("privacy");
    });

    it("si el captcha expira, el único error es el suyo y desplaza hasta el bloque del reCAPTCHA", async () => {
      // Arrange: todo válido salvo el captcha, que expira
      await renderPage();
      await fillValidForm();
      fireEvent.click(screen.getByTestId("recaptcha-expire"));
      scrollCalls.length = 0;
      expect(getSubmitButton()).toBeDisabled();

      // Act: el botón queda bloqueado, así que el submit se dispara desde el form
      fireEvent.submit(getForm());

      // Assert
      expect(await screen.findByText("Por favor completa el reCAPTCHA.")).toBeInTheDocument();
      expect(screen.queryByText("El nombre es requerido.")).not.toBeInTheDocument();
      expect(scrollCalls[0]).toEqual({
        id: "captcha",
        options: { behavior: "smooth", block: "center" },
      });
      expect(csrfMock).not.toHaveBeenCalled();
    });

    it("muestra el error del beneficiario cuando su nombre queda vacío", async () => {
      // Arrange
      await renderPage();
      await fillValidForm();
      fireEvent.change(getBeneficiaryCountSelect(), { target: { value: "1" } });
      scrollCalls.length = 0;

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(
        await screen.findByText("El nombre del beneficiario es requerido."),
      ).toBeInTheDocument();
      expect(scrollCalls[0].id).toBe("ben_0");
      expect(
        fetchMock.mock.calls.some(([input]) =>
          urlOf(input).endsWith("/api/public/affiliate-request"),
        ),
      ).toBe(false);
    });

    it("descarta las letras del celular y lo trunca a 10 dígitos", async () => {
      // Arrange
      await renderPage();
      const movilInput = byId<HTMLInputElement>("movil");

      // Act
      fireEvent.change(movilInput, { target: { value: "abc300-123 4567890" } });

      // Assert
      expect(movilInput.value).toBe("3001234567");
    });

    it("descarta los caracteres no numéricos de la cédula sin truncarla", async () => {
      // Arrange
      await renderPage();
      const cedulaInput = byId<HTMLInputElement>("document");

      // Act
      fireEvent.change(cedulaInput, { target: { value: "10.940-00abc0000" } });

      // Assert: 11 dígitos, sin el truncado a 10 que sí aplica el celular
      expect(cedulaInput.value).toBe("10940000000");
    });

    it("rechaza un correo con formato inválido", async () => {
      // Arrange
      await renderPage();
      await fillValidForm();
      fireEvent.change(byId("email"), { target: { value: "correo-invalido@sindominio" } });

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(await screen.findByText("Ingresa un correo válido.")).toBeInTheDocument();
      expect(csrfMock).not.toHaveBeenCalled();
    });

    it("rechaza un celular de menos de 10 dígitos", async () => {
      // Arrange
      await renderPage();
      await fillValidForm();
      fireEvent.change(byId("movil"), { target: { value: "300123" } });

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(
        await screen.findByText("El celular debe tener exactamente 10 dígitos."),
      ).toBeInTheDocument();
    });

    it("mantiene deshabilitado el botón de envío hasta aceptar ambos textos legales y el captcha", async () => {
      // Arrange
      await renderPage();

      // Assert: estado inicial
      expect(getSubmitButton()).toBeDisabled();

      // Act & Assert: cada requisito por separado no alcanza
      fireEvent.click(getPrivacyCheckbox());
      expect(getSubmitButton()).toBeDisabled();
      fireEvent.click(getTermsCheckbox());
      expect(getSubmitButton()).toBeDisabled();
      fireEvent.click(screen.getByTestId("recaptcha-stub"));
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  /* ── Paso 4 ── */
  describe("Paso 4: envío exitoso", () => {
    it("pide el CSRF antes del POST y envía el cuerpo exacto esperado por el backend", async () => {
      // Arrange
      await renderPage();
      await fillValidForm({ advisorName: "Asesor Uno", beneficiary: "María Fernanda López" });

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      await screen.findByText("¡Solicitud Enviada!");
      const [url, init] = getPostCall();
      expect(url).toBe(`${API_URL}/api/public/affiliate-request`);
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-XSRF-TOKEN": "xsrf-de-prueba",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        name: VALID_INPUT.name,
        lastname: VALID_INPUT.lastname,
        document: VALID_INPUT.cedula,
        movil: VALID_INPUT.movil,
        email: VALID_INPUT.email,
        birth_date: VALID_INPUT.birthDate,
        address: VALID_INPUT.address,
        department_id: 1,
        city_id: 11,
        beneficiaries: [{ full_name: "María Fernanda López" }],
        advisor_name: "Asesor Uno",
        recaptcha_token: "captcha-token",
      });

      // Assert: csrf() ocurre antes del POST
      const postCallIndex = fetchMock.mock.calls.findIndex(([input]) =>
        urlOf(input).endsWith("/api/public/affiliate-request"),
      );
      expect(csrfMock).toHaveBeenCalledTimes(1);
      expect(csrfMock.mock.invocationCallOrder[0]).toBeLessThan(
        fetchMock.mock.invocationCallOrder[postCallIndex],
      );
    });

    it("envía beneficiaries vacío y advisor_name vacío cuando no se completan", async () => {
      // Arrange
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      await screen.findByText("¡Solicitud Enviada!");
      const body = JSON.parse(String(getPostCall()[1]?.body));
      expect(body.beneficiaries).toEqual([]);
      expect(body.advisor_name).toBe("");
    });

    it("manda el header X-XSRF-TOKEN vacío si no hay cookie XSRF", async () => {
      // Arrange
      getXsrfTokenMock.mockReturnValue(null);
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      await screen.findByText("¡Solicitud Enviada!");
      expect(getPostCall()[1]?.headers).toMatchObject({ "X-XSRF-TOKEN": "" });
    });

    it("muestra la pantalla de éxito con el mensaje devuelto por el servidor", async () => {
      // Arrange
      postResponse = async () =>
        jsonResponse(true, { success: true, message: "Recibimos tu solicitud #123." });
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(await screen.findByText("¡Solicitud Enviada!")).toBeInTheDocument();
      expect(screen.getByText("Recibimos tu solicitud #123.")).toBeInTheDocument();
      expect(screen.queryByText("Datos del Titular")).not.toBeInTheDocument();
    });

    it("usa el mensaje por defecto cuando la respuesta no trae message", async () => {
      // Arrange
      postResponse = async () => jsonResponse(true, {});
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(
        await screen.findByText(
          "¡Tu solicitud fue enviada con éxito! Pronto te contactaremos.",
        ),
      ).toBeInTheDocument();
    });

    it("muestra el estado de carga mientras el POST está en vuelo", async () => {
      // Arrange
      let resolvePost!: (response: Response) => void;
      postResponse = () =>
        new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      const loadingButton = await screen.findByRole("button", { name: /Enviando solicitud/ });
      expect(loadingButton).toBeDisabled();

      // Cleanup: se resuelve para no dejar promesas colgadas entre tests
      resolvePost(jsonResponse(true, {}));
      await screen.findByText("¡Solicitud Enviada!");
    });

    it("'Enviar otra solicitud' vuelve al formulario con todos los campos reseteados", async () => {
      // Arrange
      await renderPage();
      await fillValidForm({ advisorName: "Asesor Uno", beneficiary: "María Fernanda López" });
      fireEvent.click(getSubmitButton());
      await screen.findByText("¡Solicitud Enviada!");

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Enviar otra solicitud" }));

      // Assert
      expect(await screen.findByText("Datos del Titular")).toBeInTheDocument();
      expect(byId<HTMLInputElement>("name").value).toBe("");
      expect(byId<HTMLInputElement>("lastname").value).toBe("");
      expect(byId<HTMLInputElement>("document").value).toBe("");
      expect(byId<HTMLInputElement>("movil").value).toBe("");
      expect(byId<HTMLInputElement>("email").value).toBe("");
      expect(byId<HTMLInputElement>("birthDate").value).toBe("");
      expect(byId<HTMLInputElement>("address").value).toBe("");
      expect(byId<HTMLSelectElement>("deptId").value).toBe("");
      expect(byId<HTMLSelectElement>("cityId").value).toBe("");
      expect(byId<HTMLSelectElement>("cityId")).toBeDisabled();
      expect(getBeneficiaryCountSelect().value).toBe("0");
      expect(document.getElementById("ben_0")).toBeNull();
      expect(screen.getByPlaceholderText("Nombre del asesor que te asesoró")).toHaveValue("");
      expect(getPrivacyCheckbox()).not.toBeChecked();
      expect(getTermsCheckbox()).not.toBeChecked();
      expect(getSubmitButton()).toBeDisabled();
    });
  });

  /* ── Paso 5 ── */
  describe("Paso 5: envío fallido", () => {
    it("muestra el mensaje del servidor, resetea el captcha y vuelve a bloquear el botón", async () => {
      // Arrange
      postResponse = async () => jsonResponse(true, { success: false, message: "Cédula duplicada" });
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(await screen.findByText("Cédula duplicada")).toBeInTheDocument();
      expect(screen.getByText("Datos del Titular")).toBeInTheDocument();
      expect(recaptchaResetMock).toHaveBeenCalledTimes(1);
      expect(getSubmitButton()).toBeDisabled();

      // Assert: al volver a resolver el captcha el envío se rehabilita
      fireEvent.click(screen.getByTestId("recaptcha-stub"));
      expect(getSubmitButton()).not.toBeDisabled();
    });

    it("usa el mensaje de error por defecto cuando la respuesta HTTP falla sin message", async () => {
      // Arrange
      postResponse = async () => jsonResponse(false, {}, 422);
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(
        await screen.findByText("Ocurrió un error al enviar la solicitud. Intenta nuevamente."),
      ).toBeInTheDocument();
      expect(recaptchaResetMock).toHaveBeenCalledTimes(1);
    });

    it("muestra el mensaje de red cuando el fetch rechaza", async () => {
      // Arrange
      postResponse = () => Promise.reject(new Error("network down"));
      await renderPage();
      await fillValidForm();

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      expect(
        await screen.findByText("No se pudo conectar con el servidor. Intenta más tarde."),
      ).toBeInTheDocument();
      expect(recaptchaResetMock).toHaveBeenCalledTimes(1);
      expect(getSubmitButton()).toBeDisabled();
    });

    it("conserva lo escrito en el formulario tras un envío fallido", async () => {
      // Arrange
      postResponse = async () => jsonResponse(true, { success: false, message: "Cédula duplicada" });
      await renderPage();
      await fillValidForm({ beneficiary: "María Fernanda López" });

      // Act
      fireEvent.click(getSubmitButton());

      // Assert
      await screen.findByText("Cédula duplicada");
      expect(byId<HTMLInputElement>("name").value).toBe(VALID_INPUT.name);
      expect(byId<HTMLInputElement>("ben_0").value).toBe("María Fernanda López");
    });
  });

  /* ── Paso 6 ── */
  describe("Paso 6: modal legal", () => {
    it("no muestra ningún modal legal al cargar", async () => {
      // Arrange & Act
      await renderPage();

      // Assert
      expect(screen.queryByTestId("legal-modal")).not.toBeInTheDocument();
    });

    it("abre el modal de privacidad al pulsar 'Política de Privacidad'", async () => {
      // Arrange
      await renderPage();

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Política de Privacidad" }));

      // Assert
      expect(screen.getByTestId("legal-modal")).toHaveAttribute("data-type", "privacy");
      expect(getPrivacyCheckbox()).not.toBeChecked();
    });

    it("abre el modal de términos al pulsar 'Términos y Condiciones'", async () => {
      // Arrange
      await renderPage();

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Términos y Condiciones" }));

      // Assert
      expect(screen.getByTestId("legal-modal")).toHaveAttribute("data-type", "terms");
      expect(getTermsCheckbox()).not.toBeChecked();
    });

    it("cierra el modal legal con su callback onClose", async () => {
      // Arrange
      await renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Términos y Condiciones" }));

      // Act
      fireEvent.click(screen.getByRole("button", { name: "cerrar-modal" }));

      // Assert
      expect(screen.queryByTestId("legal-modal")).not.toBeInTheDocument();
    });
  });
});
