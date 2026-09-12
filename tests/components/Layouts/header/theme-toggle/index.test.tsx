import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";
import { useTheme } from "next-themes";

vi.mock("next-themes", () => ({ useTheme: vi.fn() }));

function mockTheme(theme: string) {
  const setTheme = vi.fn();
  vi.mocked(useTheme).mockReturnValue({ themes: ["light", "dark"], theme, setTheme });
  return setTheme;
}

describe("ThemeToggleSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paso 1: guard de montaje (SSR)", () => {
    // The component returns null while `mounted` is false (the anti-hydration-mismatch
    // guard). React Testing Library's render() wraps the initial render AND the flush of
    // the mount effect in the same act(), so `setMounted(true)` has already run by the
    // time render() returns — there is no way to observe `mounted === false` from a
    // synchronous RTL test without monkey-patching `useEffect` itself (the same finding
    // applies to LoadingOverlay, which uses the identical pattern and whose test suite
    // does not attempt to assert the pre-mount state either). What IS verified here is
    // the observable consequence: once mounted, the real button renders.
    it("renderiza el botón real tras el efecto de montaje (el guard '!mounted' no es observable de forma síncrona en RTL)", () => {
      // Arrange & Act
      mockTheme("light");
      render(<ThemeToggleSwitch />);

      // Assert
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Paso 2: click alterna el tema", () => {
    it("con theme='light' el click invoca setTheme('dark')", () => {
      // Arrange
      const setTheme = mockTheme("light");
      render(<ThemeToggleSwitch />);

      // Act
      fireEvent.click(screen.getByRole("button"));

      // Assert
      expect(setTheme).toHaveBeenCalledWith("dark");
    });

    it("con theme='dark' el click invoca setTheme('light')", () => {
      // Arrange
      const setTheme = mockTheme("dark");
      render(<ThemeToggleSwitch />);

      // Act
      fireEvent.click(screen.getByRole("button"));

      // Assert
      expect(setTheme).toHaveBeenCalledWith("light");
    });
  });

  describe("Paso 3: texto accesible", () => {
    it("indica 'Switch to dark mode' cuando el tema actual es claro", () => {
      // Arrange & Act
      mockTheme("light");
      render(<ThemeToggleSwitch />);

      // Assert
      expect(screen.getByText("Switch to dark mode")).toBeInTheDocument();
    });

    it("indica 'Switch to light mode' cuando el tema actual es oscuro", () => {
      // Arrange & Act
      mockTheme("dark");
      render(<ThemeToggleSwitch />);

      // Assert
      expect(screen.getByText("Switch to light mode")).toBeInTheDocument();
    });
  });
});
