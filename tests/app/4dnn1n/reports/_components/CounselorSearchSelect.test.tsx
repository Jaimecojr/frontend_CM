import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CounselorSearchSelect } from "@/app/4dnn1n/reports/_components/CounselorSearchSelect";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

// Fake timers are enabled per-test (not in a global beforeEach) because
// mixing them with @testing-library's `waitFor` (which polls with a real
// interval) hangs indefinitely in this repo's vitest setup — the same
// pattern already used by tests/app/web/guia-medica/page.test.tsx for its
// own debounced search. Assertions after `advanceTimersByTimeAsync` run
// directly, not through `waitFor`.
describe("CounselorSearchSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not call the API when the query has fewer than 2 characters", async () => {
    // Arrange
    vi.useFakeTimers();
    try {
      render(<CounselorSearchSelect value="" onChange={vi.fn()} />);

      // Act
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "a" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // Assert
      expect(apiFetch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("should search (debounced) when 2+ characters are typed", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 5, name: "ANA", lastname: "GÓMEZ" }],
    });
    vi.useFakeTimers();
    try {
      render(<CounselorSearchSelect value="" onChange={vi.fn()} />);

      // Act
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "an" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/reports/catalogs/counselors?search=an",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("should call onChange with the id when a result is selected", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 5, name: "ANA", lastname: "GÓMEZ" }],
    });
    const onChange = vi.fn();
    vi.useFakeTimers();
    try {
      render(<CounselorSearchSelect value="" onChange={onChange} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "an" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Act
      fireEvent.click(screen.getByText(/ANA GÓMEZ/i));

      // Assert
      expect(onChange).toHaveBeenCalledWith("5");
    } finally {
      vi.useRealTimers();
    }
  });

  it("should fire a single call with 'ana' when typing 'an' then 'ana' before the debounce expires", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({ data: [] });
    vi.useFakeTimers();
    try {
      render(<CounselorSearchSelect value="" onChange={vi.fn()} />);
      const input = screen.getByRole("textbox");

      // Act
      fireEvent.change(input, { target: { value: "an" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      fireEvent.change(input, { target: { value: "ana" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Assert
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/reports/catalogs/counselors?search=ana",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("should show no results and not propagate an unhandled rejection when apiFetch rejects", async () => {
    // Arrange
    (apiFetch as any).mockRejectedValue(new Error("network error"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    vi.useFakeTimers();
    try {
      render(<CounselorSearchSelect value="" onChange={vi.fn()} />);

      // Act
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "an" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      // Assert
      expect(apiFetch).toHaveBeenCalled();
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
      vi.useRealTimers();
    }
  });

  it("should ignore a stale response from a previous search", async () => {
    // Arrange
    let resolveFirst: (v: unknown) => void = () => {};
    (apiFetch as any)
      .mockImplementationOnce(
        () => new Promise((res) => { resolveFirst = res; }),
      )
      .mockResolvedValueOnce({ data: [{ id: 9, name: "BETO", lastname: "RUIZ" }] });
    vi.useFakeTimers();
    try {
      render(<CounselorSearchSelect value="" onChange={vi.fn()} />);
      const input = screen.getByRole("textbox");

      // Act — first search stays pending (never resolved yet)
      fireEvent.change(input, { target: { value: "an" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(apiFetch).toHaveBeenCalledTimes(1);

      // A second, newer search resolves right away
      fireEvent.change(input, { target: { value: "be" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/BETO RUIZ/i)).toBeInTheDocument();

      // The stale first request resolves only now, after the newer one rendered
      await act(async () => {
        resolveFirst({ data: [{ id: 5, name: "ANA", lastname: "GÓMEZ" }] });
        await vi.advanceTimersByTimeAsync(0);
      });

      // Assert — the stale response must not override the newer results
      expect(screen.queryByText(/ANA GÓMEZ/i)).not.toBeInTheDocument();
      expect(screen.getByText(/BETO RUIZ/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("should clear the debounce timer when unmounted", () => {
    // Arrange
    const clearSpy = vi.spyOn(global, "clearTimeout");
    (apiFetch as any).mockResolvedValue({ data: [] });
    const { unmount } = render(<CounselorSearchSelect value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "an" } });

    // Act
    unmount();

    // Assert — the pending debounce timer was cleared, not left to fire after unmount
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("should show 'Asesor seleccionado' when value arrives preset from the URL (bookmark/reload)", () => {
    // Arrange & Act — no select() ever ran, so there's no label for this id
    render(<CounselorSearchSelect value="5" onChange={vi.fn()} />);

    // Assert
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Asesor seleccionado");
    expect(screen.getByTitle("Limpiar asesor")).toBeInTheDocument();
  });

  it("should allow clearing the counselor when the input is focused (dropdown open)", () => {
    // Arrange — focusing the input opens the dropdown; the "×" must stay
    // visible and usable while it's open, not just once it closes.
    const onChange = vi.fn();
    render(<CounselorSearchSelect value="5" onChange={onChange} />);
    fireEvent.focus(screen.getByRole("textbox"));

    // Act
    fireEvent.click(screen.getByTitle("Limpiar asesor"));

    // Assert
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("should clear the selected label when value is cleared externally, without carrying it into a later preset", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 5, name: "ANA", lastname: "GÓMEZ" }],
    });
    const onChange = vi.fn();
    vi.useFakeTimers();
    try {
      const { rerender } = render(<CounselorSearchSelect value="" onChange={onChange} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "an" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      fireEvent.click(screen.getByText(/ANA GÓMEZ/i));
      expect(onChange).toHaveBeenCalledWith("5");

      // The parent applies the selection: value now reflects the chosen id
      rerender(<CounselorSearchSelect value="5" onChange={onChange} />);
      expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "ANA GÓMEZ");

      // Act — the parent clears the filter externally (e.g. "Limpiar filtros")
      rerender(<CounselorSearchSelect value="" onChange={onChange} />);

      // A later external preset that never went through select() must not
      // show the stale label from the previous, unrelated selection.
      rerender(<CounselorSearchSelect value="9" onChange={onChange} />);

      // Assert
      expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Asesor seleccionado");
    } finally {
      vi.useRealTimers();
    }
  });
});
