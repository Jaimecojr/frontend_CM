import { describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAffiliateFormState } from "@/app/4dnn1n/affiliates/_hooks/useAffiliateFormState";

vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({
  getActiveFranchises: vi.fn().mockResolvedValue([{ id: 1, name: "Franquicia A" }]),
  getActiveCounselors: vi.fn().mockResolvedValue([{ id: 1, name: "Ana", lastname: "Gómez" }]),
  getActiveAgreements: vi.fn().mockResolvedValue([{ id: 1, name: "Convenio A", amount: 150000 }]),
  getDepartments: vi.fn().mockResolvedValue([{ id: 1, name: "Antioquia" }]),
  getCitiesByDepartment: vi.fn().mockResolvedValue([{ id: 1, name: "Medellín", department_id: 1 }]),
  checkAffiliateIdCard: vi.fn().mockResolvedValue({ exists: false }),
}));

vi.mock("@/lib/alert", () => ({
  alert: { warn: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { checkAffiliateIdCard } from "@/app/4dnn1n/affiliates/fetch";

async function renderWithCatalogsLoaded(args: Parameters<typeof useAffiliateFormState>[0]) {
  const view = renderHook(() => useAffiliateFormState(args));
  await waitFor(() => expect(view.result.current.franchises).toHaveLength(1));
  return view;
}

function fillRequiredFields(setForm: (fn: (prev: any) => any) => void) {
  setForm((prev: any) => ({
    ...prev,
    name: "Juan",
    lastname: "Pérez",
    id_card: "123456789",
    movil: "3001234567",
    user_id: 1,
    counselor_id: 1,
    agreement_id: 1,
    email: "juan@test.com",
    company: "ACME",
  }));
}

describe("useAffiliateFormState", () => {
  it("carga los catálogos base al montar", async () => {
    const { result } = await renderWithCatalogsLoaded({ mode: "create" });

    expect(result.current.counselors).toHaveLength(1);
    expect(result.current.agreements).toHaveLength(1);
    expect(result.current.departments).toHaveLength(1);
  });

  it("canSubmit es falso mientras falten campos obligatorios", async () => {
    const { result } = await renderWithCatalogsLoaded({ mode: "create" });
    expect(result.current.canSubmit).toBe(false);
  });

  it("canSubmit es verdadero con todos los campos obligatorios completos", async () => {
    const { result } = await renderWithCatalogsLoaded({ mode: "create" });

    act(() => result.current.setDepartmentId(1));
    await waitFor(() => expect(result.current.cities).toHaveLength(1));

    act(() => fillRequiredFields(result.current.setForm));

    expect(result.current.canSubmit).toBe(true);
  });

  it("submit agrega stade:1 solo en modo creación y llama a onSubmit con el payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = await renderWithCatalogsLoaded({ mode: "create", onSubmit });

    act(() => result.current.setDepartmentId(1));
    await waitFor(() => expect(result.current.cities).toHaveLength(1));
    act(() => fillRequiredFields(result.current.setForm));

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ stade: 1, id_card: "123456789", movil: "3001234567" }),
    );
  });

  it("submit agrega el objeto renovation cuando wantsRenovation es 'si' en modo edición", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = await renderWithCatalogsLoaded({
      mode: "edit",
      initial: { id: 1, id_card: "123456789", validity_end: "2027-01-01" },
      onSubmit,
    });

    act(() => result.current.setDepartmentId(1));
    await waitFor(() => expect(result.current.cities).toHaveLength(1));
    act(() => fillRequiredFields(result.current.setForm));
    act(() => result.current.setWantsRenovation("si"));
    act(() => result.current.setRenovationValue("150000"));

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        renovation: expect.objectContaining({ value: 150000 }),
      }),
    );
  });

  it("clear resetea el formulario a sus valores por defecto", async () => {
    const { result } = await renderWithCatalogsLoaded({ mode: "create" });

    act(() => result.current.setForm((prev) => ({ ...prev, name: "Algo" })));
    expect(result.current.form.name).toBe("Algo");

    act(() => result.current.clear());

    expect(result.current.form.name).toBe("");
  });

  it("validateIdCard marca error si el documento ya existe", async () => {
    (checkAffiliateIdCard as any).mockResolvedValueOnce({ exists: true });
    const { result } = await renderWithCatalogsLoaded({ mode: "create" });

    let isValid = true;
    await act(async () => {
      isValid = await result.current.validateIdCard("999888777");
    });

    expect(isValid).toBe(false);
    expect(result.current.idCardError).toMatch(/ya existe/);
  });
});
