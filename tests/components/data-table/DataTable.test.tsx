import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures: minimal, generic columns — this suite tests the reusable
// component, not the columns of any business module.
// ─────────────────────────────────────────────────────────────────────────────
type Row = { id: number; name: string; state: number };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Nombre" },
];

const wideColumns: ColumnDef<Row, string>[] = Array.from(
  { length: 7 },
  (_, i): ColumnDef<Row, string> => ({
    id: `col-${i + 1}`,
    header: `Col ${i + 1}`,
    accessorFn: (row) => row.name,
  }),
);

const personas: Row[] = [
  { id: 1, name: "Ana Gómez", state: 1 },
  { id: 2, name: "Bruno Díaz", state: 2 },
  { id: 3, name: "Carla Ruiz", state: 1 },
  { id: 4, name: "Diego Peña", state: 2 },
];

function makeRows(total: number): Row[] {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    name: `Fila ${String(i + 1).padStart(2, "0")}`,
    state: 1,
  }));
}

function getSearchInput() {
  return screen.getByPlaceholderText("Buscar...");
}

/** Normalized text of the "Página X de N" summary (the numbers live in a separate `<span>`). */
function resumenPagina() {
  return screen
    .getByText(/Página/)
    .textContent?.replace(/\s+/g, " ")
    .trim();
}

/** Counts the rows actually rendered in the `<tbody>` (includes skeleton rows). */
function contarFilas(container: HTMLElement) {
  return container.querySelectorAll("tbody tr").length;
}

describe("DataTable", () => {
  describe("Paso 3: búsqueda cliente con debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("aplica el filtro sólo después de los 300 ms del debounce", () => {
      // Arrange
      const { container } = render(
        <DataTable
          columns={columns}
          data={personas}
          getSearchText={(row) => row.name}
        />,
      );

      // Act
      fireEvent.change(getSearchInput(), { target: { value: "ana" } });

      // Assert: the text is already in the input but the filter hasn't applied yet
      expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
      expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();

      // Act: one millisecond before the debounce threshold, nothing should change yet
      act(() => {
        vi.advanceTimersByTime(299);
      });

      // Assert
      expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
      expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();

      // Act: millisecond 300 triggers the debounce
      act(() => {
        vi.advanceTimersByTime(1);
      });

      // Assert
      expect(
        container.querySelector("svg.animate-spin"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument();
      expect(screen.queryByText("Bruno Díaz")).not.toBeInTheDocument();
      expect(screen.queryByText("Carla Ruiz")).not.toBeInTheDocument();
    });

    it("muestra 'No hay resultados.' ocupando todas las columnas cuando nada coincide", () => {
      // Arrange
      render(
        <DataTable
          columns={columns}
          data={personas}
          getSearchText={(row) => row.name}
        />,
      );

      // Act
      fireEvent.change(getSearchInput(), { target: { value: "zzzzz" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      const celda = screen.getByText("No hay resultados.");
      expect(celda).toBeInTheDocument();
      expect(celda).toHaveAttribute("colspan", String(columns.length));
    });

    it("vuelve a la primera página cuando cambia el texto de búsqueda", () => {
      // Arrange
      render(
        <DataTable
          columns={columns}
          data={makeRows(12)}
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 25]}
          getSearchText={(row) => row.name}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      expect(resumenPagina()).toBe("Página 2 de 3");
      expect(screen.getByText("Fila 06")).toBeInTheDocument();

      // Act
      fireEvent.change(getSearchInput(), { target: { value: "fila" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(resumenPagina()).toBe("Página 1 de 3");
      expect(screen.getByText("Fila 01")).toBeInTheDocument();
      expect(screen.queryByText("Fila 06")).not.toBeInTheDocument();
    });
  });

  describe("Paso 3b: búsqueda y filtro controlados por el padre", () => {
    it("aplica el searchValue externo sin debounce y delega el tecleo al padre", () => {
      // Arrange
      const onSearchChange = vi.fn<(v: string) => void>();
      const { container } = render(
        <DataTable
          columns={columns}
          data={personas}
          searchValue="ana"
          onSearchChange={onSearchChange}
          isSearching
          getSearchText={(row) => row.name}
        />,
      );

      // Assert: the filter is already applied and the parent controls the spinner
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument();
      expect(screen.queryByText("Bruno Díaz")).not.toBeInTheDocument();
      expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();

      // Act
      fireEvent.change(getSearchInput(), { target: { value: "carla" } });

      // Assert
      expect(onSearchChange).toHaveBeenCalledWith("carla");
    });

    it("no filtra por estado client-side cuando el padre controla el filtro", () => {
      // Arrange
      const onStateFilterChange = vi.fn<(v: string) => void>();

      // Act
      render(
        <DataTable
          columns={columns}
          data={personas}
          enableStateFilter
          getStateValue={(row) => row.state}
          stateFilterValue="1"
          onStateFilterChange={onStateFilterChange}
        />,
      );

      // Assert: the data arrives already filtered from the parent, the component doesn't re-filter
      expect(screen.getByTitle("Estado")).toHaveValue("1");
      for (const persona of personas) {
        expect(screen.getByText(persona.name)).toBeInTheDocument();
      }

      // Act
      fireEvent.change(screen.getByTitle("Estado"), { target: { value: "2" } });

      // Assert
      expect(onStateFilterChange).toHaveBeenCalledWith("2");
    });
  });

  describe("Paso 3c: cambio del tamaño de página en modo cliente", () => {
    it("re-pagina y vuelve a la primera página al elegir un tamaño mayor", () => {
      // Arrange
      render(
        <DataTable
          columns={columns}
          data={makeRows(12)}
          defaultPageSize={5}
          pageSizeOptions={[5, 10, 25]}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      expect(resumenPagina()).toBe("Página 2 de 3");

      // Act
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "25" },
      });

      // Assert
      expect(resumenPagina()).toBe("Página 1 de 1");
      expect(screen.getByText("Fila 01")).toBeInTheDocument();
      expect(screen.getByText("Fila 12")).toBeInTheDocument();
    });
  });

  describe("Paso 4: filtro de estado (enableStateFilter)", () => {
    it("arranca en '1' y filtra client-side cuando no se pasan opciones", () => {
      // Arrange & Act
      render(
        <DataTable
          columns={columns}
          data={personas}
          enableStateFilter
          getStateValue={(row) => row.state}
        />,
      );

      // Assert
      expect(screen.getByTitle("Estado")).toHaveValue("1");
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument();
      expect(screen.getByText("Carla Ruiz")).toBeInTheDocument();
      expect(screen.queryByText("Bruno Díaz")).not.toBeInTheDocument();
      expect(screen.queryByText("Diego Peña")).not.toBeInTheDocument();
    });

    it("arranca en el primer value de stateFilterOptions cuando se pasan opciones", () => {
      // Arrange & Act
      render(
        <DataTable
          columns={columns}
          data={personas}
          enableStateFilter
          getStateValue={(row) => row.state}
          stateFilterOptions={[
            { label: "Inactivos", value: "2" },
            { label: "Activos", value: "1" },
          ]}
        />,
      );

      // Assert
      expect(screen.getByTitle("Estado")).toHaveValue("2");
      expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();
      expect(screen.queryByText("Ana Gómez")).not.toBeInTheDocument();
    });

    it("no aplica ningún filtro de estado al seleccionar 'Todos'", () => {
      // Arrange
      render(
        <DataTable
          columns={columns}
          data={personas}
          enableStateFilter
          getStateValue={(row) => row.state}
        />,
      );

      // Act
      fireEvent.change(screen.getByTitle("Estado"), {
        target: { value: "all" },
      });

      // Assert
      for (const persona of personas) {
        expect(screen.getByText(persona.name)).toBeInTheDocument();
      }
    });
  });

  describe("Paso 5: modo servidor (serverSide)", () => {
    it("pinta todas las filas recibidas sin recorte cliente", () => {
      // Arrange & Act
      const { container } = render(
        <DataTable
          columns={columns}
          data={makeRows(12)}
          defaultPageSize={5}
          serverSide
          serverPage={1}
          serverLastPage={3}
          serverTotal={30}
        />,
      );

      // Assert
      expect(contarFilas(container)).toBe(12);
      expect(screen.getByText("Fila 12")).toBeInTheDocument();
    });

    it("usa el paginador de servidor e informa la página pedida", () => {
      // Arrange
      const onPageChange = vi.fn<(page: number) => void>();
      render(
        <DataTable
          columns={columns}
          data={makeRows(12)}
          defaultPageSize={5}
          serverSide
          serverPage={2}
          serverLastPage={3}
          serverTotal={30}
          onPageChange={onPageChange}
        />,
      );
      expect(resumenPagina()).toBe("Página 2 de 3");

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      fireEvent.click(screen.getByRole("button", { name: "Anterior" }));

      // Assert
      expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
      expect(onPageChange).toHaveBeenNthCalledWith(2, 1);
    });

    it("deshabilita 'Anterior' en la primera página y 'Siguiente' en la última", () => {
      // Arrange & Act
      const { unmount } = render(
        <DataTable
          columns={columns}
          data={makeRows(5)}
          serverSide
          serverPage={1}
          serverLastPage={3}
          serverTotal={15}
          onPageChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();

      // Act
      unmount();
      render(
        <DataTable
          columns={columns}
          data={makeRows(5)}
          serverSide
          serverPage={3}
          serverLastPage={3}
          serverTotal={15}
          onPageChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    });

    it("no muestra paginador cuando sólo hay una página en el servidor", () => {
      // Arrange & Act
      render(
        <DataTable
          columns={columns}
          data={makeRows(3)}
          serverSide
          serverPage={1}
          serverLastPage={1}
          serverTotal={3}
        />,
      );

      // Assert
      expect(screen.queryByText(/Página/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Siguiente" }),
      ).not.toBeInTheDocument();
    });

    it("renderiza 8 filas esqueleto en lugar de los datos mientras loading es true", () => {
      // Arrange & Act
      const { container } = render(
        <DataTable
          columns={columns}
          data={makeRows(12)}
          serverSide
          serverPage={2}
          serverLastPage={3}
          serverTotal={30}
          onPageChange={vi.fn()}
          loading
        />,
      );

      // Assert
      expect(contarFilas(container)).toBe(8);
      expect(container.querySelectorAll("tbody .animate-pulse")).toHaveLength(
        8 * columns.length,
      );
      expect(screen.queryByText("Fila 01")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    });
  });

  describe("Paso 6: ancho de la tabla según la cantidad de columnas (isFit)", () => {
    it("usa el ancho ajustado y centrado con 6 columnas o menos", () => {
      // Arrange & Act
      const { container } = render(
        <DataTable columns={columns} data={personas} />,
      );

      // Assert
      const tabla = container.querySelector("table");
      expect(tabla).toHaveClass("w-max");
      expect(tabla).not.toHaveClass("min-w-full");

      const contenedor = tabla?.closest("div.min-w-0");
      expect(contenedor).toHaveClass("flex", "justify-center");
    });

    it("usa el ancho completo con más de 6 columnas", () => {
      // Arrange & Act
      const { container } = render(
        <DataTable columns={wideColumns} data={personas} />,
      );

      // Assert
      const tabla = container.querySelector("table");
      expect(tabla).toHaveClass("min-w-full");

      const contenedor = tabla?.closest("div.min-w-0");
      expect(contenedor).not.toHaveClass("justify-center");
      expect(contenedor).toHaveClass("rounded-md", "border");
    });
  });
});
