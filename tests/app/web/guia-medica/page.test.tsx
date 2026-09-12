import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import GuiaMedicaPage from "@/app/web/guia-medica/page";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";
import type { Department, City } from "@/types/geo";
import type { ApiSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

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

const SPECIALTIES: ApiSpecialty[] = [
  { id: 1, name: "Cardiología", state: 1 },
  { id: 2, name: "Pediatría", state: 1 },
];

function buildDoctor(overrides: Partial<ApiDoctor> = {}): ApiDoctor {
  return {
    id: 1,
    name: "Ana",
    lastname: "Restrepo",
    specialty_id: 1,
    city_id: 11,
    phone: "6067654321",
    movil: "3001234567",
    address: "Calle 10 # 5-23",
    secretary_name: "Secretaria",
    value_agreement: 50000,
    state: 1,
    specialty: { id: 1, name: "Cardiología" },
    city: { id: 11, name: "Armenia" },
    ...overrides,
  };
}

const fetchMock = vi.fn<typeof fetch>();

/** Response shape the page consumes: only `ok`, `status` and `json()` are read. */
function jsonResponse(ok: boolean, data: unknown, status = ok ? 200 : 500): Response {
  return { ok, status, json: async () => data } as Response;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/** Per-test reply for GET /api/public/doctors (any query string). */
let doctorsResponse: () => Promise<Response>;
/** Per-test reply for GET /api/public/departments. */
let departmentsResponse: () => Promise<Response>;
/** Per-test reply for GET /api/public/specialties. */
let specialtiesResponse: () => Promise<Response>;

function defaultDoctorsMeta(total: number, overrides: Partial<{ current_page: number; last_page: number }> = {}) {
  return { current_page: 1, last_page: 1, total, ...overrides };
}

/** Every fetch call made to /api/public/doctors, parsed into its URLSearchParams. */
function doctorsCalls(): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([input]) => urlOf(input))
    .filter((url) => url.includes("/api/public/doctors"))
    .map((url) => new URLSearchParams(url.split("?")[1] ?? ""));
}

function lastDoctorsCall(): URLSearchParams {
  const calls = doctorsCalls();
  if (calls.length === 0) throw new Error("No se hizo ninguna llamada a /api/public/doctors.");
  return calls[calls.length - 1];
}

function getSearchInput(): HTMLInputElement {
  return screen.getByPlaceholderText("Buscar por nombre o apellido...") as HTMLInputElement;
}

/** The three filter selects are rendered in this fixed order: departamento, ciudad, especialidad. */
function getFilterSelects(): HTMLSelectElement[] {
  return screen.getAllByRole("combobox") as HTMLSelectElement[];
}

function getDeptSelect(): HTMLSelectElement {
  return getFilterSelects()[0];
}

function getCitySelect(): HTMLSelectElement {
  return getFilterSelects()[1];
}

function getSpecialtySelect(): HTMLSelectElement {
  return getFilterSelects()[2];
}

/**
 * The specialty badge inside DoctorCard shares its text with the specialty
 * <select>'s <option>, so it must be located by its distinctive class instead
 * of by text alone (which would match both).
 */
function getSpecialtyBadge(): HTMLElement | null {
  return document.querySelector(".tracking-widest");
}

/** Renders and waits for the initial doctors fetch to resolve. */
async function renderPage() {
  const utils = render(<GuiaMedicaPage />);
  await waitFor(() => expect(doctorsCalls().length).toBeGreaterThan(0));
  await screen.findByText(/Mostrando|No se encontraron médicos con esos filtros\./);
  return utils;
}

/* ─────────────────────────────── Tests ─────────────────────────────── */

describe("GuiaMedicaPage (directorio médico público)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    departmentsResponse = async () => jsonResponse(true, { data: DEPARTMENTS });
    specialtiesResponse = async () => jsonResponse(true, { data: SPECIALTIES });
    doctorsResponse = async () =>
      jsonResponse(true, { data: [buildDoctor()], meta: defaultDoctorsMeta(1) });

    fetchMock.mockImplementation(async (input) => {
      const url = urlOf(input);
      if (url.includes("/api/public/doctors")) return doctorsResponse();
      const citiesMatch = url.match(/\/api\/public\/departments\/(\d+)\/cities$/);
      if (citiesMatch) {
        return jsonResponse(true, { data: CITIES_BY_DEPARTMENT[Number(citiesMatch[1])] ?? [] });
      }
      if (url.endsWith("/api/public/departments")) return departmentsResponse();
      if (url.endsWith("/api/public/specialties")) return specialtiesResponse();
      throw new Error(`URL no mockeada en el test: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── Paso 1 ── */
  describe("Paso 1: carga inicial", () => {
    it("al montar pide departamentos, especialidades y médicos sin filtros, con page=1 y per_page=12", async () => {
      // Arrange & Act
      await renderPage();

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/public/departments`, {
        headers: { Accept: "application/json" },
      });
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/public/specialties`, {
        headers: { Accept: "application/json" },
      });
      const params = lastDoctorsCall();
      expect(params.get("page")).toBe("1");
      expect(params.get("per_page")).toBe("12");
      expect(params.has("search")).toBe(false);
      expect(params.has("department_id")).toBe(false);
      expect(params.has("city_id")).toBe(false);
      expect(params.has("specialty_id")).toBe(false);
    });

    it("mientras carga muestra 6 tarjetas esqueleto", async () => {
      // Arrange: the doctors response stays pending so the loading state can be observed
      let resolveDoctors!: (response: Response) => void;
      doctorsResponse = () =>
        new Promise<Response>((resolve) => {
          resolveDoctors = resolve;
        });

      // Act
      const { container } = render(<GuiaMedicaPage />);

      // Assert
      expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);

      // Cleanup: resolve it so no promise is left hanging between tests
      resolveDoctors(jsonResponse(true, { data: [], meta: defaultDoctorsMeta(0) }));
      await screen.findByText("No se encontraron médicos con esos filtros.");
    });

    it("con meta.total en 0 muestra el mensaje de cero resultados", async () => {
      // Arrange
      doctorsResponse = async () => jsonResponse(true, { data: [], meta: defaultDoctorsMeta(0) });

      // Act
      await renderPage();

      // Assert
      expect(
        screen.getByText("No se encontraron médicos con esos filtros."),
      ).toBeInTheDocument();
      expect(screen.getByText("No se encontraron médicos")).toBeInTheDocument();
    });

    it("con un único médico muestra el conteo en singular", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, { data: [buildDoctor()], meta: defaultDoctorsMeta(1) });

      // Act
      await renderPage();

      // Assert
      expect(screen.getByText("Mostrando 1 de 1 médico")).toBeInTheDocument();
    });

    it("con varios médicos muestra el conteo en plural", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor({ id: 1 }), buildDoctor({ id: 2, name: "Luis" })],
          meta: defaultDoctorsMeta(5),
        });

      // Act
      await renderPage();

      // Assert
      expect(screen.getByText("Mostrando 2 de 5 médicos")).toBeInTheDocument();
    });
  });

  /* ── Paso 2 ── */
  describe("Paso 2: filtros — cascada y reset de página", () => {
    it("escribir en el buscador dispara un fetch nuevo por cada tecleo de forma inmediata (sin debounce) y resetea la página", async () => {
      // Arrange: get to page 2 with real timers, like the rest of the suite.
      // Fake timers are only enabled right before typing (see the Act block
      // below): that way it can be asserted, without relying on `waitFor`
      // (which waits up to ~1000ms real time and would therefore tolerate a
      // debounce), that the fetch happens without advancing any timer.
      // Same rigor as DataTable's debounce test
      // (tests/components/data-table/DataTable.test.tsx), adapted so that
      // what's being demonstrated here is the ABSENCE of a `setTimeout`
      // around the fetch.
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor()],
          meta: defaultDoctorsMeta(30, { current_page: 2, last_page: 3 }),
        });
      await renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
      await waitFor(() => expect(lastDoctorsCall().get("page")).toBe("2"));
      const callsBefore = doctorsCalls().length;

      // Act & Assert
      vi.useFakeTimers();
      try {
        // If the fetch depended on a `setTimeout(..., 300)` (debounce), this
        // call would be left pending on a simulated timer that never advances
        // in this test, and the assertion below would fail immediately.
        fireEvent.change(getSearchInput(), { target: { value: "A" } });
        expect(doctorsCalls().length).toBe(callsBefore + 1);
        const firstSearchCall = lastDoctorsCall();
        expect(firstSearchCall.get("search")).toBe("A");
        expect(firstSearchCall.get("page")).toBe("1");

        fireEvent.change(getSearchInput(), { target: { value: "An" } });
        expect(doctorsCalls().length).toBe(callsBefore + 2);
        const secondSearchCall = lastDoctorsCall();
        expect(secondSearchCall.get("search")).toBe("An");
        expect(secondSearchCall.get("page")).toBe("1");

        // No timer (e.g. a debounce) should be left pending waiting to
        // trigger the fetch.
        expect(vi.getTimerCount()).toBe(0);

        // Cleanup: drain the last fetch's promise (it doesn't depend on
        // timers, only on the microtask queue) so it isn't left resolving
        // outside act() once the test has finished.
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("al elegir un departamento pide sus ciudades, resetea la página y habilita el select de ciudad", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor()],
          meta: defaultDoctorsMeta(30, { current_page: 2, last_page: 3 }),
        });
      await renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
      await waitFor(() => expect(lastDoctorsCall().get("page")).toBe("2"));
      expect(getCitySelect()).toBeDisabled();

      // Act
      fireEvent.change(getDeptSelect(), { target: { value: "1" } });

      // Assert
      await screen.findByRole("option", { name: "Armenia" });
      expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/public/departments/1/cities`, {
        headers: { Accept: "application/json" },
      });
      expect(getCitySelect()).not.toBeDisabled();
      await waitFor(() => expect(lastDoctorsCall().get("department_id")).toBe("1"));
      expect(lastDoctorsCall().get("page")).toBe("1");
    });

    it("al elegir una especialidad, la siguiente llamada a médicos incluye specialty_id", async () => {
      // Arrange
      await renderPage();

      // Act
      fireEvent.change(getSpecialtySelect(), { target: { value: "2" } });

      // Assert
      await waitFor(() => expect(lastDoctorsCall().get("specialty_id")).toBe("2"));
      expect(lastDoctorsCall().get("page")).toBe("1");
    });

    it("no muestra el botón Limpiar cuando no hay ningún filtro activo", async () => {
      // Arrange & Act
      await renderPage();

      // Assert
      expect(screen.queryByRole("button", { name: /Limpiar/ })).not.toBeInTheDocument();
    });

    it("con un filtro activo aparece Limpiar, y al pulsarlo resetea búsqueda, departamento, ciudad, especialidad y página", async () => {
      // Arrange
      await renderPage();
      fireEvent.change(getSearchInput(), { target: { value: "Ana" } });
      await waitFor(() => expect(lastDoctorsCall().get("search")).toBe("Ana"));
      fireEvent.change(getDeptSelect(), { target: { value: "1" } });
      await screen.findByRole("option", { name: "Armenia" });
      fireEvent.change(getCitySelect(), { target: { value: "11" } });
      fireEvent.change(getSpecialtySelect(), { target: { value: "2" } });
      await waitFor(() => expect(lastDoctorsCall().get("city_id")).toBe("11"));
      expect(screen.getByRole("button", { name: /Limpiar/ })).toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByRole("button", { name: /Limpiar/ }));

      // Assert
      await waitFor(() => {
        const params = lastDoctorsCall();
        expect(params.has("search")).toBe(false);
        expect(params.has("department_id")).toBe(false);
        expect(params.has("city_id")).toBe(false);
        expect(params.has("specialty_id")).toBe(false);
        expect(params.get("page")).toBe("1");
      });
      expect(getSearchInput().value).toBe("");
      expect(getDeptSelect().value).toBe("");
      expect(getSpecialtySelect().value).toBe("");
      expect(screen.queryByRole("button", { name: /Limpiar/ })).not.toBeInTheDocument();
    });
  });

  /* ── Paso 3 ── */
  describe("Paso 3: tarjeta de médico (DoctorCard)", () => {
    it("usa movil como contacto cuando está presente", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor({ movil: "3009998877", phone: "6041112233" })],
          meta: defaultDoctorsMeta(1),
        });

      // Act
      await renderPage();

      // Assert
      expect(screen.getByText("3009998877")).toBeInTheDocument();
      expect(screen.queryByText("6041112233")).not.toBeInTheDocument();
    });

    it("usa phone como contacto cuando movil está vacío", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [
            buildDoctor({
              movil: null as unknown as string,
              phone: "6041112233",
            }),
          ],
          meta: defaultDoctorsMeta(1),
        });

      // Act
      await renderPage();

      // Assert
      expect(screen.getByText("6041112233")).toBeInTheDocument();
    });

    it("muestra el nombre de la especialidad cuando está presente", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor({ specialty: { id: 1, name: "Cardiología" } })],
          meta: defaultDoctorsMeta(1),
        });

      // Act
      await renderPage();

      // Assert
      expect(getSpecialtyBadge()?.textContent).toBe("Cardiología");
    });

    it("omite la línea de especialidad cuando no viene en el médico", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor({ specialty: undefined })],
          meta: defaultDoctorsMeta(1),
        });

      // Act
      await renderPage();

      // Assert
      expect(getSpecialtyBadge()).not.toBeInTheDocument();
    });

    it("omite las líneas de dirección y ciudad cuando el médico no las trae", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [
            buildDoctor({
              address: undefined as unknown as string,
              city: undefined,
            }),
          ],
          meta: defaultDoctorsMeta(1),
        });

      // Act
      await renderPage();

      // Assert
      expect(screen.queryByText("Calle 10 # 5-23")).not.toBeInTheDocument();
      expect(screen.queryByText("Armenia")).not.toBeInTheDocument();
    });

    it("muestra dirección y ciudad cuando el médico las trae", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor({ address: "Calle 10 # 5-23", city: { id: 11, name: "Armenia" } })],
          meta: defaultDoctorsMeta(1),
        });

      // Act
      await renderPage();

      // Assert
      expect(screen.getByText("Calle 10 # 5-23")).toBeInTheDocument();
      expect(screen.getByText("Armenia")).toBeInTheDocument();
    });
  });

  /* ── Paso 4 ── */
  describe("Paso 4: paginación", () => {
    it("en la página 1 muestra el paginador con Anterior deshabilitado y Siguiente habilitado", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor()],
          meta: defaultDoctorsMeta(30, { current_page: 1, last_page: 3 }),
        });

      // Act
      await renderPage();

      // Assert
      expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Siguiente/ })).not.toBeDisabled();
    });

    it("en la última página Siguiente queda deshabilitado", async () => {
      // Arrange: the disabling compares the internal `page` (not meta.current_page)
      // against meta.last_page, so we need to actually advance to the last page.
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor()],
          meta: defaultDoctorsMeta(30, { current_page: 1, last_page: 3 }),
        });
      await renderPage();

      // Act
      fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
      await waitFor(() => expect(lastDoctorsCall().get("page")).toBe("2"));
      fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
      await waitFor(() => expect(lastDoctorsCall().get("page")).toBe("3"));

      // Assert
      expect(screen.getByRole("button", { name: /Siguiente/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Anterior/ })).not.toBeDisabled();
    });

    it("al pulsar Siguiente incrementa la página y dispara un nuevo fetch con page actualizado", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor()],
          meta: defaultDoctorsMeta(30, { current_page: 1, last_page: 3 }),
        });
      await renderPage();
      const callsBefore = doctorsCalls().length;

      // Act
      fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));

      // Assert
      await waitFor(() => expect(doctorsCalls().length).toBe(callsBefore + 1));
      expect(lastDoctorsCall().get("page")).toBe("2");
    });

    it("con last_page <= 1 no se muestra el paginador", async () => {
      // Arrange
      doctorsResponse = async () =>
        jsonResponse(true, {
          data: [buildDoctor()],
          meta: defaultDoctorsMeta(1, { current_page: 1, last_page: 1 }),
        });

      // Act
      await renderPage();

      // Assert
      expect(screen.queryByRole("button", { name: /Anterior/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Siguiente/ })).not.toBeInTheDocument();
    });
  });
});
