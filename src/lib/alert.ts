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
    /** Si se provee, se ejecuta tras confirmar mostrando un spinner de carga. */
    onConfirm?: () => Promise<unknown>;
  }) => {
    const opts = withBase({
      icon: params?.icon ?? "question",
      title: params?.title ?? "¿Confirmas?",
      text: params?.text,
      showCancelButton: true,
      confirmButtonText: params?.confirmButtonText ?? "Sí",
      cancelButtonText: params?.cancelButtonText ?? "No",
    });

    if (!params?.onConfirm) {
      const res = await Swal.fire(opts);
      return res.isConfirmed;
    }

    // Con carga: mantiene el modal abierto con spinner mientras corre onConfirm
    let storedError: unknown;

    const res = await Swal.fire({
      ...opts,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          return await params.onConfirm!();
        } catch (err) {
          storedError = err;
          Swal.close();
        }
      },
    });

    if (storedError !== undefined) throw storedError;
    return res.isConfirmed;
  },
};
