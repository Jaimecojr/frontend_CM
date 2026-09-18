import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

describe("Breadcrumb", () => {
  it("con solo pageName, arma los crumbs por defecto: link a Dashboard + label actual", () => {
    // Arrange & Act
    render(<Breadcrumb pageName="Afiliados" />);

    // Assert
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/4dnn1n/home");
    expect(screen.getByText("Afiliados")).toBeInTheDocument();
  });

  it("no muestra el título h2 por defecto (showTitle=false)", () => {
    // Arrange & Act
    render(<Breadcrumb pageName="Afiliados" />);

    // Assert
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("muestra el título h2 con el label del último crumb cuando showTitle=true", () => {
    // Arrange & Act
    render(<Breadcrumb pageName="Afiliados" showTitle />);

    // Assert
    expect(screen.getByRole("heading", { level: 2, name: "Afiliados" })).toBeInTheDocument();
  });

  it("usa items multinivel en vez de pageName cuando items tiene elementos", () => {
    // Arrange & Act
    render(
      <Breadcrumb
        pageName="Ignorado"
        items={[
          { label: "Dashboard", href: "/4dnn1n/home" },
          { label: "Afiliados", href: "/4dnn1n/affiliates" },
          { label: "Editar" },
        ]}
      />,
    );

    // Assert
    expect(screen.queryByText("Ignorado")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Afiliados" })).toHaveAttribute(
      "href",
      "/4dnn1n/affiliates",
    );
    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("el último crumb nunca es un link, aunque tenga href", () => {
    // Arrange & Act
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/4dnn1n/home" },
          { label: "Actual", href: "/4dnn1n/actual" },
        ]}
      />,
    );

    // Assert
    expect(screen.queryByRole("link", { name: "Actual" })).not.toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
  });

  it("filtra el crumb por defecto sin label cuando no se pasa pageName", () => {
    // Arrange & Act
    render(<Breadcrumb />);

    // Assert: solo queda "Dashboard", y como es el único (y último) crumb, no es link
    expect(screen.getAllByText("Dashboard")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("aplica className adicional al contenedor", () => {
    // Arrange & Act
    const { container } = render(<Breadcrumb pageName="X" className="mi-clase" />);

    // Assert
    expect(container.firstChild).toHaveClass("mi-clase");
  });
});
