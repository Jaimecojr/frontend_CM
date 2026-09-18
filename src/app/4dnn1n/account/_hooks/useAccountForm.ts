"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { updateUsername, changePassword } from "../fetch";

type PasswordErrors = {
  current?: string;
  new?: string;
  confirm?: string;
};

type FieldErrorsShape = { data?: { errors?: Record<string, string | string[]> } };

/**
 * Encapsulates the two independent forms on the account page (username,
 * password) — extracted so the page component is limited to JSX/props,
 * matching the pattern already used by `useAffiliateFormState` for the
 * affiliates module.
 */
export function useAccountForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // ── Section A: username ──────────────────────────────
  const [username, setUsername] = useState(user?.user ?? "");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // ── Section B: password ─────────────────────────────────────
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");

    if (username.trim().length < 3) {
      setUsernameError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    setSavingUsername(true);
    try {
      await updateUsername(user!.id, username.trim());
      await refreshUser();
      await alert.success("Guardado", "Nombre de usuario actualizado correctamente.");
      router.push("/4dnn1n/home");
    } catch (err: unknown) {
      const fieldErr = (err as FieldErrorsShape)?.data?.errors?.user;
      if (fieldErr) {
        setUsernameError(Array.isArray(fieldErr) ? fieldErr[0] : String(fieldErr));
      } else {
        await alert.error("Error", getApiErrorMessage(err));
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: PasswordErrors = {};

    if (newPassword.length < 6) {
      errs.new = "La contraseña debe tener al menos 6 caracteres.";
    }
    if (newPassword !== confirmPassword) {
      errs.confirm = "Las contraseñas no coinciden.";
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setPasswordErrors({});
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      await alert.success("Guardado", "Contraseña actualizada correctamente.");
      router.push("/4dnn1n/home");
    } catch (err: unknown) {
      const currentErr = (err as FieldErrorsShape)?.data?.errors?.current_password;
      if (currentErr) {
        setPasswordErrors({
          current: Array.isArray(currentErr) ? currentErr[0] : String(currentErr),
        });
      } else {
        await alert.error("Error", getApiErrorMessage(err));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const togglePasswordSection = () => {
    setShowPasswordSection((v) => !v);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
  };

  return {
    username,
    setUsername,
    usernameError,
    setUsernameError,
    savingUsername,
    handleSaveUsername,

    showPasswordSection,
    togglePasswordSection,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordErrors,
    setPasswordErrors,
    savingPassword,
    handleSavePassword,
    showCurrent,
    setShowCurrent,
    showNew,
    setShowNew,
    showConfirm,
    setShowConfirm,
  };
}
