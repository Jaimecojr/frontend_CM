import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

describe("getApiErrorMessage", () => {
  it("extrae message de err.data.message", () => {
    // Arrange
    const err = { data: { message: "Error X" } };

    // Act
    const result = getApiErrorMessage(err);

    // Assert
    expect(result).toBe("Error X");
  });

  it("concatena message + primer error cuando hay array de errores", () => {
    // Arrange
    const err = {
      data: { message: "Error X", errors: { email: ["requerido"] } },
    };

    // Act
    const result = getApiErrorMessage(err);

    // Assert
    expect(result).toBe("Error X: requerido");
  });

  it("concatena message + error cuando errors[field] es string (no array)", () => {
    // Arrange
    const err = {
      data: { message: "Error X", errors: { email: "requerido" } },
    };

    // Act
    const result = getApiErrorMessage(err);

    // Assert
    expect(result).toBe("Error X: requerido");
  });

  it("usa err.response.data.message cuando err.data no existe", () => {
    // Arrange
    const err = { response: { data: { message: "Error Axios" } } };

    // Act
    const result = getApiErrorMessage(err);

    // Assert
    expect(result).toBe("Error Axios");
  });

  it("usa err.message cuando ni err.data ni err.response.data existen", () => {
    // Arrange
    const err = { message: "fallo genérico" };

    // Act
    const result = getApiErrorMessage(err);

    // Assert
    expect(result).toBe("fallo genérico");
  });

  it("devuelve mensaje default cuando err no tiene ninguna propiedad reconocida", () => {
    // Arrange
    const err = {};

    // Act
    const result = getApiErrorMessage(err);

    // Assert
    expect(result).toBe("Ocurrió un error inesperado. Intenta de nuevo.");
  });
});
