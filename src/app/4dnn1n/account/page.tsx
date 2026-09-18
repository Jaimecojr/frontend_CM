"use client";

import { Save, KeyRound, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useAccountForm } from "./_hooks/useAccountForm";

export default function AccountPage() {
  usePageTitle("Configuración de cuenta");

  const {
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
    showCurrent,
    setShowCurrent,
    newPassword,
    setNewPassword,
    showNew,
    setShowNew,
    confirmPassword,
    setConfirmPassword,
    showConfirm,
    setShowConfirm,
    passwordErrors,
    setPasswordErrors,
    savingPassword,
    handleSavePassword,
  } = useAccountForm();

  return (
    <div className="space-y-6">
      {/* ── Section A: username ── */}
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

      {/* ── Section B: password ── */}
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
            {/* Current password */}
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

            {/* New password */}
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

            {/* Confirm new password */}
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
