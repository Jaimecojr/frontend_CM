"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, KeyRound, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { updateUsername, changePassword } from "./fetch";

export default function AccountPage() {
  usePageTitle("Configuración de cuenta");

  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // ── Sección A: nombre de usuario ──────────────────────────────
  const [username, setUsername] = useState(user?.user ?? "");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // ── Sección B: contraseña ─────────────────────────────────────
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});
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
    } catch (err: any) {
      const fieldErr = err?.data?.errors?.user;
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
    const errs: typeof passwordErrors = {};

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
    } catch (err: any) {
      const currentErr = err?.data?.errors?.current_password;
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

  return (
    <div className="space-y-6">
      {/* ── Sección A: nombre de usuario ── */}
      <ShowcaseSection
        title="Nombre de usuario"
        description="Actualiza el nombre de usuario con el que accedes al panel."
      >
        <form onSubmit={handleSaveUsername} className="max-w-md space-y-4">
          <div>
            <label className="text-sm font-medium text-dark dark:text-white">
              Nombre de usuario <span className="text-red-500">*</span>
            </label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError("");
              }}
              minLength={3}
              required
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
            {usernameError && (
              <p className="mt-1 text-sm text-red-500">{usernameError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingUsername}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingUsername ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </ShowcaseSection>

      {/* ── Sección B: contraseña ── */}
      <ShowcaseSection
        title="Contraseña"
        description="Cambia tu contraseña de acceso al panel."
        actions={
          <button
            type="button"
            onClick={togglePasswordSection}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-sm text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            {showPasswordSection ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showPasswordSection ? "Cancelar" : "Cambiar contraseña"}
          </button>
        }
      >
        {showPasswordSection ? (
          <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
            {/* Contraseña actual */}
            <div>
              <label className="text-sm font-medium text-dark dark:text-white">
                Contraseña actual <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordErrors((p) => ({ ...p, current: undefined }));
                  }}
                  required
                  className="w-full rounded-lg border border-stroke px-3 py-2 pr-10 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.current && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.current}</p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="text-sm font-medium text-dark dark:text-white">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordErrors((p) => ({ ...p, new: undefined }));
                  }}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-stroke px-3 py-2 pr-10 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.new && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.new}</p>
              )}
            </div>

            {/* Confirmar nueva contraseña */}
            <div>
              <label className="text-sm font-medium text-dark dark:text-white">
                Confirmar nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordErrors((p) => ({ ...p, confirm: undefined }));
                  }}
                  required
                  className="w-full rounded-lg border border-stroke px-3 py-2 pr-10 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.confirm && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.confirm}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Haz clic en &quot;Cambiar contraseña&quot; para actualizar tu contraseña de acceso.
          </p>
        )}
      </ShowcaseSection>
    </div>
  );
}
