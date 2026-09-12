import type { ComponentProps } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/FormElements/SearchableSelect";

const options: SelectOption[] = [
  { value: 1, label: "Bogotá" },
  { value: 2, label: "Medellín" },
  { value: 3, label: "Cali" },
];

function renderSelect(
  props: Partial<ComponentProps<typeof SearchableSelect>> = {},
) {
  const onChange = vi.fn<(value: string) => void>();
  const utils = render(
    <SearchableSelect
      options={options}
      value=""
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, ...utils };
}

describe("SearchableSelect", () => {
  describe("Paso 1: modo disabled (solo lectura)", () => {
    it("muestra el label de la opción cuyo value coincide con el actual", () => {
      // Arrange & Act
      renderSelect({ value: 1, disabled: true });

      // Assert
      const input = screen.getByDisplayValue("Bogotá");
      expect(input).toBeDisabled();
      expect((input as HTMLInputElement).readOnly).toBe(true);
    });

    it("usa disabledPlaceholder cuando el value no coincide con ninguna opción", () => {
      // Arrange & Act
      renderSelect({
        value: 999,
        disabled: true,
        disabledPlaceholder: "Bogotá",
      });

      // Assert
      const input = screen.getByDisplayValue("Bogotá");
      expect(input).toBeDisabled();
    });

    it("muestra el input vacío cuando no hay match ni disabledPlaceholder", () => {
      // Arrange & Act
      renderSelect({ value: 999, disabled: true });

      // Assert
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
      expect(input).toBeDisabled();
    });
  });

  describe("Paso 2: apertura y filtrado", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("al hacer click en el contenedor se abre el dropdown y el input recibe foco", () => {
      // Arrange
      vi.useFakeTimers();
      renderSelect();
      const input = screen.getByPlaceholderText("Seleccionar…");
      const trigger = input.parentElement as HTMLElement;

      // Act
      fireEvent.click(trigger);

      // Assert: el dropdown se abre mostrando todas las opciones
      expect(screen.getByText("Bogotá")).toBeInTheDocument();
      expect(screen.getByText("Medellín")).toBeInTheDocument();
      expect(screen.getByText("Cali")).toBeInTheDocument();

      // Assert: el foco se aplica en el siguiente tick (setTimeout(0))
      vi.runAllTimers();
      expect(document.activeElement).toBe(input);
    });

    it("filtra las opciones por label de forma case-insensitive, y muestra 'Sin resultados' si no hay coincidencias", () => {
      // Arrange
      renderSelect();
      const input = screen.getByPlaceholderText("Seleccionar…");
      fireEvent.click(input.parentElement as HTMLElement);

      // Act: búsqueda en mayúsculas que solo matchea "Medellín" en minúsculas
      fireEvent.change(input, { target: { value: "MED" } });

      // Assert
      expect(screen.getByText("Medellín")).toBeInTheDocument();
      expect(screen.queryByText("Bogotá")).not.toBeInTheDocument();
      expect(screen.queryByText("Cali")).not.toBeInTheDocument();

      // Act: búsqueda sin coincidencias
      fireEvent.change(input, { target: { value: "zzz" } });

      // Assert
      expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    });

    it("al borrar el texto de búsqueda vuelve a mostrar todas las opciones", () => {
      // Arrange
      renderSelect();
      const input = screen.getByPlaceholderText("Seleccionar…");
      fireEvent.click(input.parentElement as HTMLElement);
      fireEvent.change(input, { target: { value: "med" } });
      expect(screen.queryByText("Bogotá")).not.toBeInTheDocument();

      // Act
      fireEvent.change(input, { target: { value: "" } });

      // Assert
      expect(screen.getByText("Bogotá")).toBeInTheDocument();
      expect(screen.getByText("Medellín")).toBeInTheDocument();
      expect(screen.getByText("Cali")).toBeInTheDocument();
    });
  });

  describe("Paso 3: selección de una opción", () => {
    it("al hacer click en una opción invoca onChange con el value como string, cierra el dropdown y limpia la búsqueda", () => {
      // Arrange
      const { onChange } = renderSelect();
      const input = screen.getByPlaceholderText("Seleccionar…");
      fireEvent.click(input.parentElement as HTMLElement);
      fireEvent.change(input, { target: { value: "med" } });
      const option = screen.getByRole("button", { name: "Medellín" });

      // Act
      fireEvent.click(option);

      // Assert: onChange recibe el value convertido a string
      expect(onChange).toHaveBeenCalledWith("2");

      // Assert: el dropdown se cierra (las opciones dejan de estar montadas)
      expect(screen.queryByText("Medellín")).not.toBeInTheDocument();
      expect(screen.queryByText("Bogotá")).not.toBeInTheDocument();

      // Act: reabrir sin haber vuelto a escribir nada — si la búsqueda ("med") no se
      // hubiera limpiado al seleccionar, aquí seguiría filtrando y "Bogotá" no aparecería.
      fireEvent.click(input.parentElement as HTMLElement);

      // Assert
      expect(screen.getByText("Bogotá")).toBeInTheDocument();
      expect(screen.getByText("Cali")).toBeInTheDocument();
    });

    it("resalta con bg-primary/10 la opción cuyo value coincide con el value actual", () => {
      // Arrange
      renderSelect({ value: 2 });
      const input = screen.getByRole("textbox");

      // Act
      fireEvent.click(input.parentElement as HTMLElement);

      // Assert
      const selectedOption = screen.getByRole("button", { name: "Medellín" });
      const otherOption = screen.getByRole("button", { name: "Bogotá" });
      expect(selectedOption).toHaveClass("bg-primary/10");
      expect(otherOption).not.toHaveClass("bg-primary/10");
    });
  });

  describe("Paso 4: cierre por click-fuera", () => {
    it("un click fuera del componente cierra el dropdown y limpia el texto de búsqueda", () => {
      // Arrange: elemento externo real para disparar el mousedown fuera del contenedor
      render(
        <div>
          <SearchableSelect
            options={options}
            value=""
            onChange={vi.fn<(value: string) => void>()}
          />
          <button type="button">Afuera</button>
        </div>,
      );
      const input = screen.getByPlaceholderText("Seleccionar…");
      fireEvent.click(input.parentElement as HTMLElement);
      fireEvent.change(input, { target: { value: "med" } });
      expect(screen.queryByText("Bogotá")).not.toBeInTheDocument();

      // Act
      fireEvent.mouseDown(screen.getByText("Afuera"));

      // Assert: el dropdown se cierra
      expect(screen.queryByText("Medellín")).not.toBeInTheDocument();
      expect(screen.queryByText("Sin resultados")).not.toBeInTheDocument();

      // Act: reabrir — si la búsqueda no se hubiera limpiado, "Bogotá" seguiría oculto
      fireEvent.click(input.parentElement as HTMLElement);

      // Assert
      expect(screen.getByText("Bogotá")).toBeInTheDocument();
    });
  });
});
