import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";

const base = {
  confirmButtonText: "Aceptar",
  cancelButtonText: "Cancelar",
  reverseButtons: true,
  allowOutsideClick: false,
} satisfies SweetAlertOptions;

// Helper para mezclar sin que TS se enrede con el union de SweetAlertOptions
const withBase = (opts: SweetAlertOptions): SweetAlertOptions =>
  ({ ...base, ...opts } as SweetAlertOptions);

export const alert = {
  show: (opts: SweetAlertOptions) => Swal.fire(withBase(opts)),

  success: (title = "Listo", text?: string) =>
    Swal.fire(withBase({ icon: "success", title, text })),

  error: (title = "Ups", text?: string) =>
    Swal.fire(withBase({ icon: "error", title, text })),

  info: (title = "Info", text?: string) =>
    Swal.fire(withBase({ icon: "info", title, text })),

  warn: (title = "Atención", text?: string) =>
    Swal.fire(withBase({ icon: "warning", title, text })),

  confirm: async (params?: {
    title?: string;
    text?: string;
    icon?: SweetAlertIcon;
    confirmButtonText?: string;
    cancelButtonText?: string;
  }) => {
    const res = await Swal.fire(
      withBase({
        icon: params?.icon ?? "question",
        title: params?.title ?? "¿Confirmas?",
        text: params?.text,
        showCancelButton: true,
        confirmButtonText: params?.confirmButtonText ?? "Sí",
        cancelButtonText: params?.cancelButtonText ?? "No",
      })
    );
    return res.isConfirmed;
  },
};
