"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
} from "@/components/ui/dropdown";
import Link from "next/link";
import { LogOutIcon, SettingsIcon } from "./icons";
import { ThemeToggleSwitch } from "../theme-toggle";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, logoutUser } = useAuth();

  // Placeholder mientras carga
  if (loading || !user) {
    return <div className="h-12 w-12 animate-pulse rounded-full bg-gray-300" />;
  }

  const avatarLetter = (user?.user || user?.name)?.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <>
      <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
        <DropdownTrigger>
          <figure className="flex cursor-pointer items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-xl font-semibold text-white">
              {avatarLetter}
            </div>

            <figcaption className="flex items-center gap-1 font-medium">
              <span>{user.user || user.name}</span>
              <ChevronUpIcon
                className={`rotate-180 transition-transform ${isOpen && "rotate-0"}`}
              />
            </figcaption>
          </figure>
        </DropdownTrigger>

        <DropdownContent
          align="end"
          className="w-64 rounded-lg border border-gray-200 bg-white p-0 shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          {/* HEADER */}
          <figure className="flex items-center gap-2.5 px-5 py-3.5">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary text-xl font-semibold text-white">
              {avatarLetter}
            </div>

            <figcaption>
              <div className="mb-2 font-semibold">{user.user || user.name}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
            </figcaption>
          </figure>

          <hr className="border-gray-200 dark:border-dark-3" />

          {/* TEMA */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-[#4B5563] dark:text-dark-6">Modo oscuro</span>
            <ThemeToggleSwitch />
          </div>

          <hr className="border-gray-200 dark:border-dark-3" />

          {/* LINKS */}
          <div className="space-y-1 p-2 text-sm text-[#4B5563] dark:text-dark-6">
            <Link
              href="/4dnn1n/account"
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-3"
              onClick={() => setIsOpen(false)}
            >
              <SettingsIcon className="h-5 w-5" />
              Configuración
            </Link>
          </div>

          <hr className="border-gray-200 dark:border-dark-3" />

          {/* LOGOUT */}
          <div className="p-2">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-3"
              onClick={handleLogout}
            >
              <LogOutIcon className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </DropdownContent>
      </Dropdown>
    </>
  );
}
