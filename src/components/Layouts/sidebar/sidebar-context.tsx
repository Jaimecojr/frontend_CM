"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SidebarContextType = {
  // Mobile (overlay)
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Desktop (mini)
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  toggleCollapse: () => void;

  isMobile: boolean;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebarContext must be used within a SidebarProvider");
  return context;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false); // overlay
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed); // mini desktop

  useEffect(() => {
    // cuando pasa a mobile, sidebar overlay debe arrancar cerrado
    if (isMobile) setIsOpen(false);
    // cuando vuelve a desktop, overlay no aplica
    if (!isMobile) setIsOpen(false);
  }, [isMobile]);

  function toggleSidebar() {
    // solo para mobile
    setIsOpen((prev) => !prev);
  }

  function toggleCollapse() {
    // solo para desktop
    setIsCollapsed((prev) => !prev);
  }

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      toggleSidebar,
      isCollapsed,
      setIsCollapsed,
      toggleCollapse,
      isMobile,
    }),
    [isOpen, isCollapsed, isMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
