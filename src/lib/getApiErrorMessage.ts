type ApiErrorShape = {
  data?: { message?: string; errors?: Record<string, string | string[]> };
};

type AxiosErrorShape = {
  response?: { data?: { message?: string; errors?: Record<string, string | string[]> } };
};

type GenericErrorShape = { message?: string };

/**
 * Normalizes any thrown value into a user-facing Spanish message.
 *
 * Three call sites produce three different error shapes, checked in order:
 * 1. Our own `ApiError` (thrown by `apiFetch` in `src/lib/api.ts`) — carries
 *    the parsed JSON body under `.data`, in Laravel's validation format
 *    (`{ message, errors: { field: string[] } }`).
 * 2. An Axios-style error (`.response.data`) — kept for any code path that
 *    might throw an Axios error instead of going through `apiFetch`.
 * 3. A plain `Error` (network failure, unexpected exception) — `.message`.
 * Falls back to a generic message when none of the three shapes match.
 */
export function getApiErrorMessage(err: unknown): string {
  const data = (err as ApiErrorShape)?.data;

  if (data?.message) {
    if (data?.errors && typeof data.errors === "object") {
      const firstField = Object.keys(data.errors)[0];
      const firstMsg = Array.isArray(data.errors[firstField])
        ? data.errors[firstField][0]
        : String(data.errors[firstField]);
      return `${data.message}: ${firstMsg}`;
    }
    return data.message;
  }

  const axiosData = (err as AxiosErrorShape)?.response?.data;
  if (axiosData?.message) {
    if (axiosData?.errors && typeof axiosData.errors === "object") {
      const firstField = Object.keys(axiosData.errors)[0];
      const firstMsg = Array.isArray(axiosData.errors[firstField])
        ? axiosData.errors[firstField][0]
        : String(axiosData.errors[firstField]);
      return `${axiosData.message}: ${firstMsg}`;
    }
    return axiosData.message;
  }

  const genericMessage = (err as GenericErrorShape)?.message;
  if (genericMessage) return genericMessage;

  return "Ocurrió un error inesperado. Intenta de nuevo.";
}
