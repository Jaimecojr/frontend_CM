import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UppercaseInput, UppercaseTextarea } from "@/components/FormElements/UppercaseInput";

// The input is controlled by its parent in every form, so the interaction tests use a parent
// that feeds the value back in, like the real forms do.
function Harness({
  initial = "",
  onValue,
  ...props
}: { initial?: string; onValue?: (v: string) => void } & React.ComponentProps<"input">) {
  const [value, setValue] = useState(initial);
  return (
    <UppercaseInput
      {...props}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onValue?.(e.target.value);
      }}
    />
  );
}

const getInput = () => screen.getByRole("textbox") as HTMLInputElement;

describe("UppercaseInput", () => {
  it("convierte a mayúsculas lo que se escribe, y esa versión es la que recibe el onChange del padre", async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await userEvent.type(getInput(), "juan pérez");

    expect(getInput()).toHaveValue("JUAN PÉREZ");
    expect(onValue).toHaveBeenLastCalledWith("JUAN PÉREZ");
  });

  it("respeta tildes y la ñ al convertir", async () => {
    render(<Harness />);

    await userEvent.type(getInput(), "muñoz ángel");

    expect(getInput()).toHaveValue("MUÑOZ ÁNGEL");
  });

  it("no mueve el cursor al final cuando se edita en medio del texto", async () => {
    render(<Harness initial="JUAN PEREZ" />);
    const input = getInput();

    // Cursor después de "JUAN " (posición 5) y se escribe una letra minúscula
    await userEvent.type(input, "x", { initialSelectionStart: 5, initialSelectionEnd: 5 });

    expect(input).toHaveValue("JUAN XPEREZ");
    expect(input.selectionStart).toBe(6);
  });

  it("marca el campo con la clase 'uppercase' para que también se vea en mayúsculas lo que ya venía guardado en minúscula", () => {
    render(<Harness initial="maría" className="mt-1 w-full" />);

    expect(getInput()).toHaveClass("uppercase");
    expect(getInput()).toHaveClass("mt-1", "w-full");
  });

  it("pasa el resto de props al input (placeholder, disabled)", () => {
    render(<UppercaseInput value="ana" onChange={vi.fn()} placeholder="Nombre" disabled />);

    expect(screen.getByPlaceholderText("Nombre")).toBeDisabled();
  });

  it("con fireEvent.change (como hacen los tests de los formularios) también entrega el valor en mayúsculas", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    fireEvent.change(getInput(), { target: { value: "carlos" } });

    expect(onValue).toHaveBeenLastCalledWith("CARLOS");
  });
});

describe("UppercaseTextarea", () => {
  function TextareaHarness({ initial = "" }: { initial?: string }) {
    const [value, setValue] = useState(initial);
    return <UppercaseTextarea value={value} onChange={(e) => setValue(e.target.value)} className="w-full" />;
  }
  const getTextarea = () => screen.getByRole("textbox") as HTMLTextAreaElement;

  it("convierte a mayúsculas lo que se escribe, respetando tildes y saltos de línea", async () => {
    render(<TextareaHarness />);

    await userEvent.type(getTextarea(), "llamar mañana{enter}renovar plan");

    expect(getTextarea()).toHaveValue("LLAMAR MAÑANA\nRENOVAR PLAN");
  });

  it("no mueve el cursor al final cuando se edita en medio del texto", async () => {
    render(<TextareaHarness initial={"UNO DOS\nTRES"} />);
    const textarea = getTextarea();

    await userEvent.type(textarea, "x", { initialSelectionStart: 4, initialSelectionEnd: 4 });

    expect(textarea).toHaveValue("UNO XDOS\nTRES");
    expect(textarea.selectionStart).toBe(5);
  });

  it("lleva la clase 'uppercase' para que el texto guardado antes en minúscula también se vea en mayúsculas", () => {
    render(<TextareaHarness initial="nota vieja" />);

    expect(getTextarea()).toHaveClass("uppercase", "w-full");
  });
});
