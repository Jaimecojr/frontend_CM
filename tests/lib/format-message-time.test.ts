import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { formatMessageTime } from "@/lib/format-message-time";

describe("formatMessageTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra minutos en formato Xm para mensajes hace menos de 60 minutos hoy", () => {
    // Arrange
    const thirtyMinutesAgo = new Date("2026-06-15T11:30:00").toISOString();

    // Act
    const result = formatMessageTime(thirtyMinutesAgo);

    // Assert
    expect(result).toBe("30m");
  });

  it("muestra just now cuando hace 0 minutos (mismo timestamp)", () => {
    // Arrange
    const now = new Date("2026-06-15T12:00:00").toISOString();

    // Act
    const result = formatMessageTime(now);

    // Assert
    expect(result).toBe("just now");
  });

  it("muestra hora local en formato 12h cuando hace más de 60 minutos pero mismo día", () => {
    // Arrange
    const threeHoursAgo = new Date("2026-06-15T09:00:00").toISOString();
    const expectedTime = new Date("2026-06-15T09:00:00").toLocaleTimeString(
      "en-US",
      { hour: "numeric", minute: "2-digit", hour12: true }
    );

    // Act
    const result = formatMessageTime(threeHoursAgo);

    // Assert
    expect(result).toBe(expectedTime);
  });

  it("muestra nombre del día para mensajes dentro de la semana", () => {
    // Arrange
    const twoDaysAgo = new Date("2026-06-13T12:00:00").toISOString();
    const expectedDay = new Date("2026-06-13T12:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long" }
    );

    // Act
    const result = formatMessageTime(twoDaysAgo);

    // Assert
    expect(result).toBe(expectedDay);
  });

  it("muestra formato Mon DD para mensajes hace más de 7 días, mismo año", () => {
    // Arrange
    const thirtyDaysAgo = new Date("2026-05-16T12:00:00").toISOString();
    const expectedDate = new Date("2026-05-16T12:00:00").toLocaleDateString(
      "en-US",
      { day: "numeric", month: "short" }
    );

    // Act
    const result = formatMessageTime(thirtyDaysAgo);

    // Assert
    expect(result).toBe(expectedDate);
  });

  it("incluye el año para mensajes de un año anterior", () => {
    // Arrange
    const lastYear = new Date("2025-06-15T12:00:00").toISOString();
    const expectedDate = new Date("2025-06-15T12:00:00").toLocaleDateString(
      "en-US",
      { day: "numeric", month: "short", year: "numeric" }
    );

    // Act
    const result = formatMessageTime(lastYear);

    // Assert
    expect(result).toBe(expectedDate);
  });
});
