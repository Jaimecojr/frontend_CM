export function getApiErrorMessage(err: any) {
  // Nuestro ApiError (fetch)
  const data = err?.data;

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

  // Axios (por si lo usas en otro lado)
  const axiosData = err?.response?.data;
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

  if (err?.message) return err.message;

  return "Ocurrió un error inesperado. Intenta de nuevo.";
}
