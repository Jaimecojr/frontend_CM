import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoneyInput } from "@/components/FormElements/MoneyInput";

// MoneyInput is controlled (the parent owns the number), so the interaction tests need a parent
// that feeds the emitted value back in, exactly like the affiliate form does.
function Harness({
  initial = 0,
  onValue,
  ...props
}: {
  initial?: number | string;
  onValue?: (n: number) => void;
} & Partial<React.ComponentProps<typeof MoneyInput>>) {
  const [value, setValue] = useState<number | string>(initial);
  return (
    <MoneyInput
      value={value}
      onChange={(n) => {
        setValue(n);
        onValue?.(n);
      }}
      {...props}
    />
  );
}

const getInput = () => screen.getByRole("textbox") as HTMLInputElement;

describe("MoneyInput", () => {
  describe("Paso 1: visualización", () => {
    it("muestra el valor con punto como separador de miles", () => {
      render(<MoneyInput value={52383} onChange={vi.fn()} />);

      expect(getInput()).toHaveValue("52.383");
    });

    it("acepta el valor como string numérico (la API puede devolverlo así)", () => {
      render(<MoneyInput value="1234567" onChange={vi.fn()} />);

      expect(getInput()).toHaveValue("1.234.567");
    });

    it("con valor 0 el campo editable queda vacío y muestra '0' como placeholder", () => {
      render(<MoneyInput value={0} onChange={vi.fn()} />);

      expect(getInput()).toHaveValue("");
      expect(getInput()).toHaveAttribute("placeholder", "0");
    });

    it("deshabilitado (modo vista) muestra '0' real en lugar de vacío", () => {
      render(<MoneyInput value={0} onChange={vi.fn()} disabled />);

      expect(getInput()).toHaveValue("0");
      expect(getInput()).toBeDisabled();
    });

    it("es un input de texto numérico (sin las flechitas de type=number)", () => {
      render(<MoneyInput value={0} onChange={vi.fn()} />);

      expect(getInput()).toHaveAttribute("type", "text");
      expect(getInput()).toHaveAttribute("inputmode", "numeric");
    });
  });

  describe("Paso 2: escritura", () => {
    it("formatea con puntos mientras se escribe y emite el número entero", async () => {
      const onValue = vi.fn();
      render(<Harness onValue={onValue} />);

      await userEvent.type(getInput(), "1234567");

      expect(getInput()).toHaveValue("1.234.567");
      expect(onValue).toHaveBeenLastCalledWith(1234567);
    });

    it("ignora los caracteres que no son dígitos", async () => {
      render(<Harness />);

      await userEvent.type(getInput(), "12abc.,-3");

      expect(getInput()).toHaveValue("123");
    });

    it("no deja ceros a la izquierda", async () => {
      const onValue = vi.fn();
      render(<Harness onValue={onValue} />);

      await userEvent.type(getInput(), "007");

      expect(getInput()).toHaveValue("7");
      expect(onValue).toHaveBeenLastCalledWith(7);
    });

    it("respeta el tope de dígitos (9 por defecto) para no desbordar la columna integer", async () => {
      const onValue = vi.fn();
      render(<Harness onValue={onValue} />);

      await userEvent.type(getInput(), "12345678901");

      expect(getInput()).toHaveValue("123.456.789");
      expect(onValue).toHaveBeenLastCalledWith(123456789);
    });
  });

  describe("Paso 3: borrado", () => {
    it("se puede borrar todo el contenido con Backspace, dígito por dígito, hasta quedar vacío", async () => {
      const onValue = vi.fn();
      render(<Harness initial={52383} onValue={onValue} />);

      await userEvent.click(getInput());
      await userEvent.keyboard("{End}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}");

      expect(getInput()).toHaveValue("");
      expect(onValue).toHaveBeenLastCalledWith(0);
    });

    it("seleccionar todo y borrar deja el campo vacío y emite 0", async () => {
      const onValue = vi.fn();
      render(<Harness initial={52383} onValue={onValue} />);

      await userEvent.click(getInput());
      await userEvent.keyboard("{Control>}a{/Control}{Delete}");

      expect(getInput()).toHaveValue("");
      expect(onValue).toHaveBeenLastCalledWith(0);
    });

    it("Backspace justo después de un punto borra el dígito anterior en vez de no hacer nada", async () => {
      render(<Harness initial={1234} />);

      // "1.234" con el cursor después del punto (posición 2)
      await userEvent.click(getInput());
      getInput().setSelectionRange(2, 2);
      await userEvent.keyboard("{Backspace}");

      expect(getInput()).toHaveValue("234");
    });

    it("Delete justo antes de un punto borra el dígito siguiente en vez de no hacer nada", async () => {
      render(<Harness initial={1234} />);

      // "1.234" con el cursor antes del punto (posición 1)
      await userEvent.click(getInput());
      getInput().setSelectionRange(1, 1);
      await userEvent.keyboard("{Delete}");

      expect(getInput()).toHaveValue("134");
    });
  });

  describe("Paso 4: posición del cursor", () => {
    it("al insertar un dígito en medio, el cursor queda justo después de él (no salta al final)", async () => {
      render(<Harness initial={1234567} />);
      const input = getInput();

      // "1.234.567": cursor después de "1.2" (posición 3), se inserta un 9
      await userEvent.type(input, "9", { initialSelectionStart: 3, initialSelectionEnd: 3 });

      expect(input).toHaveValue("12.934.567");
      // 3 dígitos antes del cursor ("129") -> justo después del 9 en "12.9"
      expect(input.selectionStart).toBe(4);
    });
  });
});
