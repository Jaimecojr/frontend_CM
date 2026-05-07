"use client";

import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Contacto Médico Admin`;
  }, [title]);
}
