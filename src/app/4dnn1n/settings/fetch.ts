import { apiFetch, csrf } from "@/lib/api";

export type ApiSetting = {
  id: number;
  wa_api_version: string;
  wa_phone_number_id: string;
  wa_bearer_token: string;
  wa_template_name: string;
};

type ApiResponse<T> = { message: string; data: T };

export async function getSetting(): Promise<ApiSetting> {
  const res = await apiFetch<ApiResponse<ApiSetting>>("/api/settings");
  return res.data;
}

export async function updateSetting(
  id: number,
  payload: Omit<ApiSetting, "id">,
) {
  await csrf();
  return apiFetch<ApiResponse<ApiSetting>>(`/api/settings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
