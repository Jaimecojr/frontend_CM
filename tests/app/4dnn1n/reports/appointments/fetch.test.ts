import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAppointmentsReport, getActiveDoctors } from "@/app/4dnn1n/reports/appointments/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("appointments (reports)/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should build the query string and return data/meta from getAppointmentsReport", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 1, name: "ANA LOPEZ (Titular)" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    const result = await getAppointmentsReport({ doctor_id: "9" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/appointments?doctor_id=9");
    expect(result.data).toHaveLength(1);
  });

  it("should call /api/doctors?state=1&per_page=100 from getActiveDoctors", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({ data: [{ id: 1, name: "CARLOS", lastname: "PEREZ" }] });

    // Act
    await getActiveDoctors();

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/doctors?state=1&per_page=100");
  });
});
