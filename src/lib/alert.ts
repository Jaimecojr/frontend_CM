import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";

const base = {
  confirmButtonText: "Aceptar",
  cancelButtonText: "Cancelar",
  reverseButtons: true,
  allowOutsideClick: false,
} satisfies SweetAlertOptions;

// Helper to merge without TS getting tangled in the SweetAlertOptions union
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
    /** If provided, it runs after confirming while showing a loading spinner. */
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

    // With loading: keeps the modal open with a spinner while onConfirm runs
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
