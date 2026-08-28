import { describe, expect, it } from "vitest";
import { compactFormat, standardFormat } from "@/lib/format-number";

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
