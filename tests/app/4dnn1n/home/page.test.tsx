import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/4dnn1n/home/page";

// Stub the 4 widgets via their real alias path (relative specifiers resolve
// against this test file's directory, not the source file's, in this
// mirror-folder layout, so they would never intercept the real import).
vi.mock("@/app/4dnn1n/home/_components/expiring-today-card", () => ({
  ExpiringTodayCard: () => <div data-testid="widget-expiring-today" />,
}));
vi.mock("@/app/4dnn1n/home/_components/today-appointments-card", () => ({
  TodayAppointmentsCard: () => <div data-testid="widget-today-appointments" />,
}));
vi.mock("@/app/4dnn1n/home/_components/stats-cards", () => ({
  StatsCards: () => <div data-testid="widget-stats-cards" />,
}));
vi.mock("@/app/4dnn1n/home/_components/charts-section", () => ({
  ChartsSection: () => <div data-testid="widget-charts-section" />,
}));

const HOME_DIR = join(process.cwd(), "src/app/4dnn1n/home");

function startsWithUseClient(source: string): boolean {
  const trimmed = source.trimStart();
  return trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');
}

describe("Regla arquitectónica: Client Components para datos autenticados", () => {
  it.each([
    "_components/stats-cards.tsx",
    "_components/expiring-today-card.tsx",
    "_components/today-appointments-card.tsx",
    "_components/charts-section.tsx",
  ])("%s declara 'use client' porque consume la API autenticada del panel", (relPath) => {
    // Arrange
    const source = readFileSync(join(HOME_DIR, relPath), "utf-8");

    // Act
    const isClientComponent = startsWithUseClient(source);

    // Assert
    expect(isClientComponent).toBe(true);
  });

  it("page.tsx NO declara 'use client' — permanece Server Component de composición sin fetch propio", () => {
    // Arrange
    const source = readFileSync(join(HOME_DIR, "page.tsx"), "utf-8");

    // Act
    const isClientComponent = startsWithUseClient(source);

    // Assert
    expect(isClientComponent).toBe(false);
  });

  it("no existe loading.tsx en la carpeta del dashboard (cada widget maneja su propio skeleton, no un overlay global)", () => {
    // Arrange & Act
    const loadingFileExists = existsSync(join(HOME_DIR, "loading.tsx"));

    // Assert
    expect(loadingFileExists).toBe(false);
  });

  it("page.tsx no importa LoadingOverlay (el dashboard no debe usar el overlay de pantalla completa)", () => {
    // Arrange
    const source = readFileSync(join(HOME_DIR, "page.tsx"), "utf-8");

    // Act & Assert
    expect(source).not.toMatch(/LoadingOverlay/);
  });
});

describe("DashboardPage — composición", () => {
  it("renderiza los 4 widgets sin gates de permisos propios en la página", () => {
    // Arrange & Act
    render(<DashboardPage />);

    // Assert: each widget stub is present — access control lives inside each
    // widget (StatsCards/ChartsSection already verify it internally), not here.
    expect(screen.getByTestId("widget-expiring-today")).toBeInTheDocument();
    expect(screen.getByTestId("widget-today-appointments")).toBeInTheDocument();
    expect(screen.getByTestId("widget-stats-cards")).toBeInTheDocument();
    expect(screen.getByTestId("widget-charts-section")).toBeInTheDocument();
  });

  it("ordena los widgets en el DOM: fila 1 (expiring-today, today-appointments) → stats-cards → charts-section", () => {
    // Arrange
    render(<DashboardPage />);

    // Act: read testids in DOM order
    const testIds = screen
      .getAllByTestId(/^widget-/)
      .map((el) => el.getAttribute("data-testid"));

    // Assert
    expect(testIds).toEqual([
      "widget-expiring-today",
      "widget-today-appointments",
      "widget-stats-cards",
      "widget-charts-section",
    ]);
  });
});
