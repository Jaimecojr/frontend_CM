import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ApiAppointment } from "@/app/4dnn1n/appointments/types";
import { buildAppointmentColumns } from "@/app/4dnn1n/appointments/_components/columns";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => (
    <a href={href} data-testid={`link-${href}`}>
      {children}
    </a>
  ),
}));

function createMockAppointment(overrides: Partial<ApiAppointment> = {}): ApiAppointment {
  return {
    id: 1,
    afi_code: 123,
    doctor_id: 1,
    date: "2026-06-20",
    hour: "10:00",
    address: "Carrera 7 #45-67",
    city_id: 1,
    phone: "3001234567",
    value: 150000,
    type: 1,
    name: "Juan García",
    user_id: 1,
    doctor: { id: 1, name: "Carlos", lastname: "Pérez" },
    city: { id: 1, name: "Bogotá" },
    owner: null,
    ...overrides,
  };
}

describe("buildAppointmentColumns", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("columna tipo", () => {
    it("renderiza badge 'Titular' con clases azules cuando type === 1", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const tipoCol = cols.find((col) => col.id === "tipo");

      expect(tipoCol).toBeDefined();
      expect(tipoCol?.cell).toBeDefined();
      expect(typeof tipoCol?.cell).toBe("function");

      const appointment = createMockAppointment({ type: 1 });
      const cellFn = tipoCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      const badge = container.querySelector("span");

      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe("Titular");
      expect(badge?.className).toContain("bg-blue-100");
      expect(badge?.className).toContain("text-blue-800");
    });

    it("renderiza badge 'Beneficiario' con clases moradas cuando type === 2", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const tipoCol = cols.find((col) => col.id === "tipo");

      expect(tipoCol).toBeDefined();
      expect(tipoCol?.cell).toBeDefined();
      expect(typeof tipoCol?.cell).toBe("function");

      const appointment = createMockAppointment({ type: 2 });
      const cellFn = tipoCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      const badge = container.querySelector("span");

      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe("Beneficiario");
      expect(badge?.className).toContain("bg-purple-100");
      expect(badge?.className).toContain("text-purple-800");
    });
  });

  describe("columna name", () => {
    it("muestra owner.name + owner.lastname cuando owner existe", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const nameCol = cols.find((col) => (col as any).accessorKey === "name");

      expect(nameCol).toBeDefined();
      expect(nameCol?.cell).toBeDefined();
      expect(typeof nameCol?.cell).toBe("function");

      const appointment = createMockAppointment({
        name: "Juan García",
        owner: { id: 1, name: "Ana", lastname: "Ruiz" },
      });
      const cellFn = nameCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("Ana Ruiz");
    });

    it("muestra row.original.name cuando owner es null", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const nameCol = cols.find((col) => (col as any).accessorKey === "name");

      expect(nameCol).toBeDefined();
      expect(nameCol?.cell).toBeDefined();
      expect(typeof nameCol?.cell).toBe("function");

      const appointment = createMockAppointment({
        name: "Juan García",
        owner: null,
      });
      const cellFn = nameCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("Juan García");
    });

    it("maneja owner con lastname faltante", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const nameCol = cols.find((col) => (col as any).accessorKey === "name");

      expect(nameCol).toBeDefined();
      expect(nameCol?.cell).toBeDefined();
      expect(typeof nameCol?.cell).toBe("function");

      const appointment = createMockAppointment({
        owner: { id: 1, name: "Ana" },
      });
      const cellFn = nameCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("Ana");
    });
  });

  describe("columna doctor", () => {
    it("muestra 'Nombre Apellido' cuando doctor existe", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const doctorCol = cols.find((col) => col.id === "doctor");

      expect(doctorCol).toBeDefined();
      expect(doctorCol?.cell).toBeDefined();
      expect(typeof doctorCol?.cell).toBe("function");

      const appointment = createMockAppointment({
        doctor: { id: 1, name: "Carlos", lastname: "Pérez" },
      });
      const cellFn = doctorCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("Carlos Pérez");
    });

    it("muestra '-' cuando doctor es null", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const doctorCol = cols.find((col) => col.id === "doctor");

      expect(doctorCol).toBeDefined();
      expect(doctorCol?.cell).toBeDefined();
      expect(typeof doctorCol?.cell).toBe("function");

      const appointment = createMockAppointment({ doctor: null });
      const cellFn = doctorCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("-");
    });
  });

  describe("columna city", () => {
    it("muestra nombre de ciudad cuando city existe", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const cityCol = cols.find((col) => col.id === "city");

      expect(cityCol).toBeDefined();
      expect(cityCol?.cell).toBeDefined();
      expect(typeof cityCol?.cell).toBe("function");

      const appointment = createMockAppointment({
        city: { id: 1, name: "Bogotá" },
      });
      const cellFn = cityCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("Bogotá");
    });

    it("muestra '-' cuando city es null", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const cityCol = cols.find((col) => col.id === "city");

      expect(cityCol).toBeDefined();
      expect(cityCol?.cell).toBeDefined();
      expect(typeof cityCol?.cell).toBe("function");

      const appointment = createMockAppointment({ city: null });
      const cellFn = cityCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("-");
    });
  });

  describe("columna date", () => {
    it("formatea fecha a dd/mm/yyyy", () => {
      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const dateCol = cols.find((col) => (col as any).accessorKey === "date");

      expect(dateCol).toBeDefined();
      expect(dateCol?.cell).toBeDefined();
      expect(typeof dateCol?.cell).toBe("function");

      const appointment = createMockAppointment({ date: "2026-05-14" });
      const cellFn = dateCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      expect(container.textContent).toBe("14/05/2026");
    });
  });

  describe("columna actions - isPast gating", () => {
    it("oculta botones editar/eliminar cuando la cita está en el pasado", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00"));

      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const actionsCol = cols.find((col) => col.id === "actions");

      expect(actionsCol).toBeDefined();
      expect(actionsCol?.cell).toBeDefined();
      expect(typeof actionsCol?.cell).toBe("function");

      const appointment = createMockAppointment({ date: "2026-06-10" });
      const cellFn = actionsCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      // Should only have the "Ver" (Eye) link, not the Pencil and Trash buttons
      const links = container.querySelectorAll("a");
      const buttons = container.querySelectorAll("button");

      expect(links.length).toBe(1); // Only Ver link visible
      expect(buttons.length).toBe(0); // No delete button when past
    });

    it("muestra solo botón 'Ver' cuando hasAccess es false (futuro)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00"));

      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: false });
      const actionsCol = cols.find((col) => col.id === "actions");

      expect(actionsCol).toBeDefined();
      expect(actionsCol?.cell).toBeDefined();
      expect(typeof actionsCol?.cell).toBe("function");

      const appointment = createMockAppointment({ date: "2026-06-20" });
      const cellFn = actionsCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      const links = container.querySelectorAll("a");
      const buttons = container.querySelectorAll("button");

      expect(links.length).toBe(1); // Only Ver link visible
      expect(buttons.length).toBe(0); // No edit or delete buttons
    });

    it("muestra los 3 botones (Ver/Editar/Eliminar) cuando hasAccess es true y la cita es futura", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00"));

      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const actionsCol = cols.find((col) => col.id === "actions");

      expect(actionsCol).toBeDefined();
      expect(actionsCol?.cell).toBeDefined();
      expect(typeof actionsCol?.cell).toBe("function");

      const appointment = createMockAppointment({ date: "2026-06-20" });
      const cellFn = actionsCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      const links = container.querySelectorAll("a");
      const buttons = container.querySelectorAll("button");

      expect(links.length).toBe(2); // Ver and Editar links
      expect(buttons.length).toBe(1); // Eliminar button
    });

    it("invoca onDelete con la cita correcta al hacer click en eliminar", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00"));

      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const actionsCol = cols.find((col) => col.id === "actions");

      expect(actionsCol).toBeDefined();
      expect(actionsCol?.cell).toBeDefined();
      expect(typeof actionsCol?.cell).toBe("function");

      const appointment = createMockAppointment({ id: 42, date: "2026-06-20" });
      const cellFn = actionsCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      const deleteButton = container.querySelector("button");

      expect(deleteButton).not.toBeNull();

      fireEvent.click(deleteButton!);

      expect(onDelete).toHaveBeenCalledWith(appointment);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("no considera como pasada una cita con fecha exactamente hoy", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T12:00:00"));

      const onDelete = vi.fn();
      const cols = buildAppointmentColumns({ onDelete, hasAccess: true });
      const actionsCol = cols.find((col) => col.id === "actions");

      expect(actionsCol).toBeDefined();
      expect(actionsCol?.cell).toBeDefined();
      expect(typeof actionsCol?.cell).toBe("function");

      const appointment = createMockAppointment({ date: "2026-06-15" });
      const cellFn = actionsCol?.cell as Function;
      const cellContent = cellFn({
        row: { original: appointment },
      } as any);

      const { container } = render(<>{cellContent}</>);
      const links = container.querySelectorAll("a");
      const buttons = container.querySelectorAll("button");

      // Should show all 3 action buttons since today is not considered past
      expect(links.length).toBe(2); // Ver and Editar
      expect(buttons.length).toBe(1); // Eliminar
    });
  });
});
