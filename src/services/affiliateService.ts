// src/services/affiliateService.ts

export interface AffiliateStatusResponse {
  success: boolean;
  message: string;
  data?: {
    stade: number; // 1 = Activo, 2 = Inactivo
    validity_end: string;
    name: string;
  };
}

export async function checkAffiliateStatus(
  docType: string,
  docNum: string
): Promise<AffiliateStatusResponse> {
  try {
    // Reemplazar con el endpoint público real de tu backend Laravel
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/public/affiliate-status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ document_type: docType, document_number: docNum }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking affiliate status:", error);
    return {
      success: false,
      message: "No se pudo consultar el estado. Intente nuevamente.",
    };
  }
}
