// src/services/affiliateService.ts

export interface AffiliateStatusResponse {
  success: boolean;
  message: string;
  data?: {
    name: string;
    lastname: string;
    id_card: string;
    stade: number; // 1 = Activo, 2 = Inactivo
    validity_end: string;
    beneficiaries: { name: string }[];
  };
}

export async function checkAffiliateStatus(
  docNum: string
): Promise<AffiliateStatusResponse> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/public/affiliate-status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
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
