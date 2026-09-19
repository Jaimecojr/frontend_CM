import { describe, expect, it } from "vitest";
import { compactFormat, formatThousands, standardFormat } from "@/lib/format-number";

describe("compactFormat", () => {
  it("formatea 0 sin notación compacta", () => {
    expect(compactFormat(0)).toBe("0");
  });

  it("formatea un valor típico en miles usando notación compacta corta", () => {
    expect(compactFormat(1500)).toBe("1.5K");
  });

  it("formatea un valor grande en millones usando notación compacta corta", () => {
    expect(compactFormat(2_300_000)).toBe("2.3M");
  });
});

describe("standardFormat", () => {
  it("formatea 0 con dos decimales fijos", () => {
    expect(standardFormat(0)).toBe("0.00");
  });

  it("formatea un valor típico con separador de miles y dos decimales", () => {
    expect(standardFormat(1000)).toBe("1,000.00");
  });

  it("formatea un valor grande con separador de miles y dos decimales", () => {
    expect(standardFormat(1234567.5)).toBe("1,234,567.50");
  });
});

describe("formatThousands", () => {
  it("no agrega separador a números de hasta 3 cifras", () => {
    expect(formatThousands(0)).toBe("0");
    expect(formatThousands(999)).toBe("999");
  });

  it("agrega punto como separador de miles, incluso desde 4 cifras", () => {
    expect(formatThousands(1000)).toBe("1.000");
    expect(formatThousands(52383)).toBe("52.383");
  });

  it("agrupa de a tres cifras en números grandes", () => {
    expect(formatThousands(1234567)).toBe("1.234.567");
    expect(formatThousands(999999999)).toBe("999.999.999");
  });
});
