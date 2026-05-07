"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogoIcon } from "@/components/logo";

interface Props {
  isLoading?: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading = true, message = "Cargando" }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isLoading || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#020d1a]">
      <div className="animate-pulse mb-6">
        <LogoIcon size={80} />
      </div>
      <p className="flex items-end gap-[3px] text-lg font-semibold text-dark dark:text-white">
        {message}
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
      </p>
    </div>,
    document.body,
  );
}
