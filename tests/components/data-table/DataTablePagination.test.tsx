import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";

type Row = { id: number; name: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Nombre" },
];

function makeRows(total: number): Row[] {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    name: `Fila ${String(i + 1).padStart(2, "0")}`,
  }));
}

type HarnessProps = {
  total: number;
  pageSize: number;
  defaultPageSize: number;
};

/**
 * Monta una tabla real de TanStack: el componente sólo lee `table`, así que mockear su API
 * sería menos fiel que dejar que la librería calcule páginas y filas de verdad.
 */
function PaginationHarness({ total, pageSize, defaultPageSize }: HarnessProps) {
  const [data] = useState<Row[]>(() => makeRows(total));
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div>
      <ul>
        {table.getRowModel().rows.map((row) => (
          <li key={row.id}>{row.original.name}</li>
        ))}
      </ul>
      <DataTablePagination
        table={table}
        defaultPageSize={defaultPageSize}
        totalRows={data.length}
      />
    </div>
  );
}

/** Texto normalizado del resumen "Página X de N" (el número vive en un `<span>` aparte). */
function resumenPagina() {
  return screen
    .getByText(/Página/)
    .textContent?.replace(/\s+/g, " ")
    .trim();
}

describe("DataTablePagination", () => {
  describe("Paso 2.1: sin paginación necesaria", () => {
    it("no renderiza nada cuando el total de filas cabe en el tamaño por defecto", () => {
      // Arrange & Act
      render(
        <PaginationHarness total={5} pageSize={10} defaultPageSize={10} />,
      );

      // Assert
      expect(screen.queryByText(/Página/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Siguiente" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Anterior" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Paso 2.2: navegación entre páginas", () => {
    it("muestra la página actual y el total de páginas calculado por la tabla", () => {
      // Arrange & Act
      render(
        <PaginationHarness total={25} pageSize={10} defaultPageSize={10} />,
      );

      // Assert
      expect(resumenPagina()).toBe("Página 1 de 3");
    });

    it("deshabilita 'Anterior' en la primera página y habilita 'Siguiente'", () => {
      // Arrange & Act
      render(
        <PaginationHarness total={25} pageSize={10} defaultPageSize={10} />,
      );

      // Assert
      expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Siguiente" }),
      ).toBeEnabled();
    });

    it("avanza de página al pulsar 'Siguiente' y cambia las filas visibles", () => {
      // Arrange
      render(
        <PaginationHarness total={25} pageSize={10} defaultPageSize={10} />,
      );
      expect(screen.getByText("Fila 01")).toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

      // Assert
      expect(resumenPagina()).toBe("Página 2 de 3");
      expect(screen.queryByText("Fila 01")).not.toBeInTheDocument();
      expect(screen.getByText("Fila 11")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    });

    it("retrocede de página al pulsar 'Anterior'", () => {
      // Arrange
      render(
        <PaginationHarness total={25} pageSize={10} defaultPageSize={10} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Anterior" }));

      // Assert
      expect(resumenPagina()).toBe("Página 1 de 3");
      expect(screen.getByText("Fila 01")).toBeInTheDocument();
    });

    it("deshabilita 'Siguiente' al llegar a la última página", () => {
      // Arrange
      render(
        <PaginationHarness total={25} pageSize={10} defaultPageSize={10} />,
      );

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

      // Assert
      expect(resumenPagina()).toBe("Página 3 de 3");
      expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
      expect(screen.getByText("Fila 25")).toBeInTheDocument();
    });
  });
});
