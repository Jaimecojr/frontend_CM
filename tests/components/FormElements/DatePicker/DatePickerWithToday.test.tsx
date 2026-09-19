import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";

describe("DatePickerWithToday", () => {
  describe("Paso 1: modo disabled (solo lectura)", () => {
    it("muestra el valor formateado dd/mm/aaaa y el input queda deshabilitado", () => {
      // Arrange & Act
      render(
        <DatePickerWithToday value="2026-06-15" onChange={vi.fn<(date: string) => void>()} disabled />,
      );

      // Assert
      const input = screen.getByDisplayValue("15/06/2026");
      expect(input).toBeDisabled();
    });

    it("muestra el placeholder cuando value está vacío", () => {
      // Arrange & Act
      render(
        <DatePickerWithToday value="" onChange={vi.fn<(date: string) => void>()} disabled />,
      );

      // Assert
      const input = screen.getByPlaceholderText("dd/mm/aaaa");
      expect(input).toBeDisabled();
      expect(input).toHaveValue("");
    });

    it("muestra el string crudo cuando value no matchea el formato YYYY-MM-DD", () => {
      // Arrange & Act
      render(
        <DatePickerWithToday
          value="no-es-fecha"
          onChange={vi.fn<(date: string) => void>()}
          disabled
        />,
      );

      // Assert
      const input = screen.getByDisplayValue("no-es-fecha");
      expect(input).toBeDisabled();
    });
  });

  describe("Paso 2: modo editable e inicialización de flatpickr", () => {
    it("el input no queda deshabilitado y flatpickr fija el valor inicial recibido", () => {
      // Arrange & Act
      render(
        <DatePickerWithToday value="2026-06-15" onChange={vi.fn<(date: string) => void>()} />,
      );

      // Assert
      const input = screen.getByPlaceholderText("dd/mm/aaaa") as HTMLInputElement;
      expect(input).not.toBeDisabled();
      expect(input.value).toBe("15/06/2026");
    });

    it("al cambiar la prop value tras el montaje, el segundo efecto actualiza el valor mostrado sin recrear la instancia", () => {
      // Arrange: solo la prop `value` cambia entre renders; `onChange` se mantiene igual
      // para aislar el efecto bajo prueba (el segundo useEffect, dependiente de [value]).
      const onChange = vi.fn<(date: string) => void>();
      const { rerender } = render(
        <DatePickerWithToday value="2026-06-15" onChange={onChange} />,
      );
      const input = screen.getByPlaceholderText("dd/mm/aaaa") as HTMLInputElement;
      expect(input.value).toBe("15/06/2026");
      const calendarsBeforeRerender = document.querySelectorAll(".flatpickr-calendar").length;

      // Act
      rerender(<DatePickerWithToday value="2026-07-20" onChange={onChange} />);

      // Assert: el valor mostrado se actualiza y no se crea una segunda instancia de flatpickr
      expect(input.value).toBe("20/07/2026");
      expect(document.querySelectorAll(".flatpickr-calendar")).toHaveLength(calendarsBeforeRerender);
    });
  });

  describe('Paso 3: botón "Hoy"', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('renderiza un botón "Hoy" dentro del calendario de flatpickr tras abrirlo', () => {
      // Arrange
      render(
        <DatePickerWithToday value="2026-06-15" onChange={vi.fn<(date: string) => void>()} />,
      );
      const input = screen.getByPlaceholderText("dd/mm/aaaa");

      // Act: abre el calendario haciendo click en el input
      fireEvent.click(input);

      // Assert
      const boton = screen.getByText("Hoy");
      expect(boton).toBeInTheDocument();
      expect(boton.closest(".flatpickr-calendar")).not.toBeNull();
    });

    it('al hacer click en "Hoy" invoca onChange con la fecha de hoy en formato YYYY-MM-DD', () => {
      // Arrange: fija "hoy" con timers falsos solo para Date, sin afectar el resto de temporizadores
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 8, 10)); // 10/09/2026
      const handleChange = vi.fn<(date: string) => void>();
      render(<DatePickerWithToday value="2026-06-15" onChange={handleChange} />);
      const input = screen.getByPlaceholderText("dd/mm/aaaa");
      fireEvent.click(input);
      const boton = screen.getByText("Hoy");

      // Act
      fireEvent.click(boton);

      // Assert
      expect(handleChange).toHaveBeenCalledWith("2026-09-10");
    });

    it('al hacer click en "Hoy" también cierra el calendario (elegir un día ya lo cierra solo)', () => {
      // Arrange
      render(<DatePickerWithToday value="2026-06-15" onChange={vi.fn<(date: string) => void>()} />);
      fireEvent.click(screen.getByPlaceholderText("dd/mm/aaaa"));
      const calendar = document.querySelector(".flatpickr-calendar");
      expect(calendar).toHaveClass("open");

      // Act
      fireEvent.click(screen.getByText("Hoy"));

      // Assert
      expect(calendar).not.toHaveClass("open");
    });

    it("al elegir una fecha invoca el onChange más reciente, no el capturado al montar", () => {
      // Arrange: flatpickr se crea una sola vez; si captura el onChange del primer render,
      // un consumidor que hace setForm({ ...form, date }) restauraría el `form` del montaje
      // y borraría lo escrito en los demás campos.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 8, 10));
      const handlerAtMount = vi.fn<(date: string) => void>();
      const latestHandler = vi.fn<(date: string) => void>();
      const { rerender } = render(<DatePickerWithToday value="" onChange={handlerAtMount} />);
      rerender(<DatePickerWithToday value="" onChange={latestHandler} />);
      fireEvent.click(screen.getByPlaceholderText("dd/mm/aaaa"));

      // Act
      fireEvent.click(screen.getByText("Hoy"));

      // Assert
      expect(latestHandler).toHaveBeenCalledWith("2026-09-10");
      expect(handlerAtMount).not.toHaveBeenCalled();
    });
  });

  describe("Paso 4: cleanup al desmontar", () => {
    it("destruye la instancia de flatpickr al desmontar, sin dejar calendarios duplicados", () => {
      // Arrange
      const { unmount } = render(
        <DatePickerWithToday value="2026-06-15" onChange={vi.fn<(date: string) => void>()} />,
      );
      expect(document.querySelectorAll(".flatpickr-calendar")).toHaveLength(1);

      // Act
      unmount();

      // Assert: el destroy() de flatpickr eliminó el calendarContainer del document.body
      expect(document.querySelectorAll(".flatpickr-calendar")).toHaveLength(0);

      // Act: un segundo montaje en el mismo document.body no debe acumular calendarios
      render(
        <DatePickerWithToday value="2026-06-15" onChange={vi.fn<(date: string) => void>()} />,
      );

      // Assert
      expect(document.querySelectorAll(".flatpickr-calendar")).toHaveLength(1);
    });
  });
});
