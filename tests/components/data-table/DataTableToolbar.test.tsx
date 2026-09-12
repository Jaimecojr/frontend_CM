import type { ComponentProps } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DataTableToolbar } from "@/components/data-table/DataTableToolbar";

type ToolbarProps = ComponentProps<typeof DataTableToolbar>;

function renderToolbar(props: Partial<ToolbarProps> = {}) {
  const onSearchChange = vi.fn<(v: string) => void>();
  const onPageSizeChange = vi.fn<(size: number) => void>();
  const onStateFilterChange = vi.fn<(v: string) => void>();

  const utils = render(
    <DataTableToolbar
      searchPlaceholder="Buscar afiliado..."
      searchValue=""
      onSearchChange={onSearchChange}
      defaultPageSize={10}
      pageSizeOptions={[20, 25, 50, 100]}
      totalRows={30}
      filteredRows={30}
      pageSize={20}
      onPageSizeChange={onPageSizeChange}
      {...props}
    />,
  );

  return { onSearchChange, onPageSizeChange, onStateFilterChange, ...utils };
}

/** El selector de tamaño de página es el único `combobox` cuando no hay filtro de estado. */
function getPageSizeSelect() {
  return screen.getByRole("combobox") as HTMLSelectElement;
}

describe("DataTableToolbar", () => {
  describe("Paso 1.1: visibilidad del selector de tamaño de página", () => {
    it("muestra el selector 'Ver' cuando hay más filas filtradas que el tamaño por defecto", () => {
      // Arrange & Act
      renderToolbar({ defaultPageSize: 10, filteredRows: 30 });

      // Assert
      expect(screen.getByText("Ver")).toBeInTheDocument();
      expect(getPageSizeSelect()).toBeInTheDocument();
    });

    it("oculta el selector 'Ver' cuando las filas filtradas caben en una página", () => {
      // Arrange & Act
      renderToolbar({ defaultPageSize: 10, filteredRows: 10 });

      // Assert
      expect(screen.queryByText("Ver")).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("Paso 1.2: valor seleccionado del tamaño de página", () => {
    it("selecciona la opción 'Todos' cuando el tamaño de página cubre todas las filas filtradas", () => {
      // Arrange & Act
      renderToolbar({ defaultPageSize: 10, filteredRows: 30, pageSize: 30 });

      // Assert
      expect(getPageSizeSelect().value).toBe("all");
    });

    it("selecciona el tamaño concreto cuando no cubre todas las filas filtradas", () => {
      // Arrange & Act
      renderToolbar({ defaultPageSize: 10, filteredRows: 30, pageSize: 20 });

      // Assert
      expect(getPageSizeSelect().value).toBe("20");
    });

    it("informa el total de filas filtradas al elegir la opción 'Todos'", () => {
      // Arrange
      const { onPageSizeChange } = renderToolbar({
        defaultPageSize: 10,
        filteredRows: 30,
        pageSize: 20,
      });

      // Act
      fireEvent.change(getPageSizeSelect(), { target: { value: "all" } });

      // Assert
      expect(onPageSizeChange).toHaveBeenCalledWith(30);
    });

    it("informa el número elegido al seleccionar un tamaño concreto", () => {
      // Arrange
      const { onPageSizeChange } = renderToolbar({
        defaultPageSize: 10,
        filteredRows: 30,
        pageSize: 20,
      });

      // Act
      fireEvent.change(getPageSizeSelect(), { target: { value: "50" } });

      // Assert
      expect(onPageSizeChange).toHaveBeenCalledWith(50);
    });
  });

  describe("Paso 1.3: input de búsqueda", () => {
    it("invoca onSearchChange con el texto tecleado", () => {
      // Arrange
      const { onSearchChange } = renderToolbar();
      const input = screen.getByPlaceholderText("Buscar afiliado...");

      // Act
      fireEvent.change(input, { target: { value: "Gómez" } });

      // Assert
      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith("Gómez");
    });

    it("refleja el valor controlado recibido por props", () => {
      // Arrange & Act
      renderToolbar({ searchValue: "Ana" });

      // Assert
      expect(screen.getByPlaceholderText("Buscar afiliado...")).toHaveValue(
        "Ana",
      );
    });
  });

  describe("Paso 1.4: indicador de búsqueda en curso", () => {
    it("muestra el spinner cuando isSearching es true", () => {
      // Arrange & Act
      const { container } = renderToolbar({ isSearching: true });

      // Assert
      expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
    });

    it("no muestra el spinner cuando isSearching es false", () => {
      // Arrange & Act
      const { container } = renderToolbar({ isSearching: false });

      // Assert
      expect(
        container.querySelector("svg.animate-spin"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Paso 1.5: filtro de estado", () => {
    it("no renderiza el filtro de estado si no se pasan value y handler", () => {
      // Arrange & Act
      renderToolbar();

      // Assert
      expect(screen.queryByTitle("Estado")).not.toBeInTheDocument();
    });

    it("usa las opciones por defecto Activos/Inactivos más 'Todos'", () => {
      // Arrange
      const onStateFilterChange = vi.fn<(v: string) => void>();

      // Act
      renderToolbar({ stateFilterValue: "1", onStateFilterChange });

      // Assert
      const select = screen.getByTitle("Estado");
      const labels = within(select)
        .getAllByRole("option")
        .map((opt) => opt.textContent);
      expect(labels).toEqual(["Activos", "Inactivos", "Todos"]);
      expect((select as HTMLSelectElement).value).toBe("1");
    });

    it("usa las opciones personalizadas recibidas más 'Todos'", () => {
      // Arrange
      const onStateFilterChange = vi.fn<(v: string) => void>();

      // Act
      renderToolbar({
        stateFilterValue: "0",
        onStateFilterChange,
        stateFilterOptions: [
          { label: "Pendientes", value: "0" },
          { label: "Convertidas", value: "1" },
        ],
      });

      // Assert
      const labels = within(screen.getByTitle("Estado"))
        .getAllByRole("option")
        .map((opt) => opt.textContent);
      expect(labels).toEqual(["Pendientes", "Convertidas", "Todos"]);
    });

    it("invoca onStateFilterChange con el valor seleccionado", () => {
      // Arrange
      const onStateFilterChange = vi.fn<(v: string) => void>();
      renderToolbar({ stateFilterValue: "1", onStateFilterChange });

      // Act
      fireEvent.change(screen.getByTitle("Estado"), {
        target: { value: "all" },
      });

      // Assert
      expect(onStateFilterChange).toHaveBeenCalledWith("all");
    });
  });

  describe("Paso 1.6: hideSearch, acciones y filtros extra", () => {
    it("no renderiza el input de búsqueda cuando hideSearch es true", () => {
      // Arrange & Act
      renderToolbar({ hideSearch: true });

      // Assert
      expect(
        screen.queryByPlaceholderText("Buscar afiliado..."),
      ).not.toBeInTheDocument();
    });

    it("renderiza las acciones y los filtros extra recibidos", () => {
      // Arrange & Act
      renderToolbar({
        actions: <button type="button">Nuevo</button>,
        extraFilters: <span>Filtro extra</span>,
      });

      // Assert
      expect(screen.getByRole("button", { name: "Nuevo" })).toBeInTheDocument();
      expect(screen.getByText("Filtro extra")).toBeInTheDocument();
    });
  });
});
