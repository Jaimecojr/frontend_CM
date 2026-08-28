// src/components/web/affiliateService.ts

import { csrf, getXsrfToken } from "@/lib/api";

export interface AffiliateStatusResponse {
  success: boolean;
  message: string;
  data?: {
    name: string;
    lastname: string;
    id_card: string;
    stade: number; // 1 = Active, 2 = Inactive
    validity_end: string;
    beneficiaries: { name: string }[];
  };
}

/**
 * Consults an affiliate's status by document number for the public-site widget.
 *
 * Always resolves to an `AffiliateStatusResponse` — network failures and non-ok
 * HTTP responses are caught and converted into `{ success: false, message }`
 * instead of throwing. This lets the calling widget just check `.success` without
 * a try/catch around every call.
 */
export async function checkAffiliateStatus(
  docNum: string
): Promise<AffiliateStatusResponse> {
  try {
    await csrf();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/public/affiliate-status`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": getXsrfToken() ?? "",
        },
        body: JSON.stringify({ document_number: docNum }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "No se pudo consultar el estado. Intente nuevamente.",
      };
    }

    return data;
  } catch (error) {
    console.error("Error checking affiliate status:", error);
    return {
      success: false,
      message: "Ocurrió un error al consultar. Intente nuevamente.",
    };
  }
}
