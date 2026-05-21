import { apiFetch, csrf } from "@/lib/api";

export async function updateUsername(userId: number, username: string): Promise<void> {
  await csrf();
  await apiFetch(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ user: username }),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await csrf();
  await apiFetch("/api/user/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}
