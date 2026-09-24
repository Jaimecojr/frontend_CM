/**
 * Six plain counts returned by the Resumen de Afiliados report. Unlike every
 * other report there's no row list or pagination here, so this stands alone
 * instead of feeding a shared `Api<Entity>Row`/meta shape.
 */
export type AffiliatesSummaryIndicators = {
  titulares: number;
  titulares_activos: number;
  titulares_inactivos: number;
  beneficiarios: number;
  beneficiarios_activos: number;
  beneficiarios_inactivos: number;
};
