import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SigninWithPassword from "@/components/Auth/SigninWithPassword";
import { csrf, getXsrfToken } from "@/app/4dnn1n/home/fetch";

vi.mock("@/app/4dnn1n/home/fetch", () => ({
  csrf: vi.fn(),
  getXsrfToken: vi.fn(),
}));

// LoadingOverlay renders LogoIcon via next/image over a static PNG import,
// which next/image can't resolve in the jsdom test environment; stub it out
// the same way LoadingOverlay's own test suite does.
vi.mock("@/components/logo", () => ({
  LogoIcon: () => <div data-testid="logo-icon">Logo</div>,
}));

const mockedCsrf = vi.mocked(csrf);
const mockedGetXsrfToken = vi.mocked(getXsrfToken);

/** Builds a `Response`-like object with just the members the component reads. */
function buildFetchResponse(overrides: { ok: boolean; json: () => Promise<unknown> }) {
  return overrides as Response;
}

describe("SigninWithPassword", () => {
  const originalLocation = window.location;
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");

    mockedCsrf.mockResolvedValue(undefined);
    mockedGetXsrfToken.mockReturnValue("token123");

    fetchMock = vi.fn().mockResolvedValue(buildFetchResponse({ ok: true, json: async () => ({}) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    // jsdom throws "Not implemented: navigation" on a real `href` assignment;
    // replacing `window.location` with a plain writable object lets the
    // component's redirect be observed without it actually navigating.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { ...originalLocation, href: "" };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    global.fetch = originalFetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = originalLocation;
  });

  // ──── Step 1: Campos y estado inicial ────
  describe("Renderizado inicial y actualización de campos", () => {
    it("renderiza los inputs vacíos, el checkbox sin marcar y el botón habilitado", () => {
      // Arrange & Act
      render(<SigninWithPassword />);

      // Assert
      expect(screen.getByLabelText("Usuario")).toHaveValue("");
      expect(screen.getByLabelText("Contraseña")).toHaveValue("");
      expect(screen.getByLabelText("Recordarme")).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
    });

    it("actualiza data.user y data.password al escribir en los inputs", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<SigninWithPassword />);

      // Act
      await user.type(screen.getByLabelText("Usuario"), "asesor1");
      await user.type(screen.getByLabelText("Contraseña"), "secreta123");

      // Assert
      expect(screen.getByLabelText("Usuario")).toHaveValue("asesor1");
      expect(screen.getByLabelText("Contraseña")).toHaveValue("secreta123");
    });

    it("marca data.remember al hacer click en el checkbox Recordarme", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<SigninWithPassword />);

      // Act
      await user.click(screen.getByLabelText("Recordarme"));

      // Assert
      expect(screen.getByLabelText("Recordarme")).toBeChecked();
    });
  });

  // ──── Step 2: Submit exitoso ────
  describe("Submit exitoso", () => {
    it("llama csrf() antes del fetch de login con los headers y el body correctos, muestra el LoadingOverlay y redirige", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<SigninWithPassword />);
      await user.type(screen.getByLabelText("Usuario"), "asesor1");
      await user.type(screen.getByLabelText("Contraseña"), "secreta123");
      await user.click(screen.getByLabelText("Recordarme"));

      // Act
      await user.click(screen.getByRole("button", { name: "Ingresar" }));

      // Assert: csrf() se llamó antes del fetch de login
      expect(mockedCsrf).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const csrfOrder = mockedCsrf.mock.invocationCallOrder[0];
      const fetchOrder = fetchMock.mock.invocationCallOrder[0];
      expect(csrfOrder).toBeLessThan(fetchOrder);

      // Assert: URL, headers y body del fetch de login
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:8000/login");
      expect(options.method).toBe("POST");
      expect(options.credentials).toBe("include");
      expect(options.headers).toEqual({
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": "token123",
        Accept: "application/json",
      });
      expect(JSON.parse(options.body)).toEqual({
        user: "asesor1",
        password: "secreta123",
        remember: true,
      });

      // Assert: tras la respuesta ok, redirige y el overlay sigue visible
      // (no hay setLoading(false) en el camino de éxito: el overlay debe
      // permanecer mientras dure la navegación)
      await waitFor(() => expect(window.location.href).toBe("/4dnn1n/home"));
      expect(document.body).toHaveTextContent("Cargando");
    });
  });

  // ──── Step 3: Submit fallido ────
  describe("Submit fallido", () => {
    it("lanza y muestra el error de CSRF cuando getXsrfToken retorna null, sin llamar a fetch", async () => {
      // Arrange
      mockedGetXsrfToken.mockReturnValue(null);
      const user = userEvent.setup();
      render(<SigninWithPassword />);
      await user.type(screen.getByLabelText("Usuario"), "asesor1");
      await user.type(screen.getByLabelText("Contraseña"), "secreta123");

      // Act
      await user.click(screen.getByRole("button", { name: "Ingresar" }));

      // Assert
      expect(await screen.findByText("No se pudo obtener el token CSRF")).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
      expect(document.body).not.toHaveTextContent("Cargando");
    });

    it("muestra el mensaje del servidor cuando la respuesta no es ok", async () => {
      // Arrange
      fetchMock.mockResolvedValue(
        buildFetchResponse({ ok: false, json: async () => ({ message: "Credenciales inválidas" }) }),
      );
      const user = userEvent.setup();
      render(<SigninWithPassword />);
      await user.type(screen.getByLabelText("Usuario"), "asesor1");
      await user.type(screen.getByLabelText("Contraseña"), "incorrecta");

      // Act
      await user.click(screen.getByRole("button", { name: "Ingresar" }));

      // Assert
      expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
      expect(document.body).not.toHaveTextContent("Cargando");
    });

    it("muestra el mensaje genérico cuando res.json() falla (ej. HTML de un 419)", async () => {
      // Arrange
      fetchMock.mockResolvedValue(
        buildFetchResponse({
          ok: false,
          json: async () => {
            throw new Error("no json");
          },
        }),
      );
      const user = userEvent.setup();
      render(<SigninWithPassword />);
      await user.type(screen.getByLabelText("Usuario"), "asesor1");
      await user.type(screen.getByLabelText("Contraseña"), "secreta123");

      // Act
      await user.click(screen.getByRole("button", { name: "Ingresar" }));

      // Assert
      expect(await screen.findByText("Error al iniciar sesión")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
      expect(document.body).not.toHaveTextContent("Cargando");
    });
  });
});
