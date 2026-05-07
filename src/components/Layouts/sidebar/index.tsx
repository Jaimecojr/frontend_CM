"use client";

import { Logo, LogoIcon } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const {
    setIsOpen,
    isOpen,
    isMobile,
    toggleSidebar,
    isCollapsed,
    setIsCollapsed,
  } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    // ✅ si está colapsado, NO abrir acordeones
    if (!isMobile && isCollapsed) return;

    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
  };

  useEffect(() => {
    // ✅ si estás en home, no dejes nada expandido
    if (pathname === "/4dnn1n/home") {
      setExpandedItems([]);
      return;
    }

    // Keep collapsible open, when it's subpage is active
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        return item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              setExpandedItems([item.title]);
            }
            return true;
          }
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const widthClass = isMobile
    ? isOpen
      ? "w-[290px]"
      : "w-0"
    : isCollapsed
      ? "w-[72px]"
      : "w-[290px]";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          widthClass,
        )}
        aria-label="Main navigation"
        aria-hidden={isMobile ? !isOpen : false}
        inert={isMobile ? (!isOpen as any) : undefined}
      >
        <div
          className={cn(
            "flex h-full flex-col py-6 pr-[7px]",
            !isMobile && isCollapsed ? "pl-3" : "pl-4",
          )}
        >
          <div className="relative mb-4">
            <Link
              href={"/4dnn1n/home"}
              onClick={() => {
                if (isMobile) toggleSidebar();
              }}
              className={cn(
                "flex w-full items-center justify-center",
                !isMobile && isCollapsed ? "justify-center" : "justify-center",
              )}
            >
              {!isMobile && isCollapsed ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/10">
                  <LogoIcon size={30} />
                </div>
              ) : (
                <Logo />
              )}
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
              >
                <span className="sr-only">Close Menu</span>
                <ArrowLeftIcon className="ml-auto size-7" />
              </button>
            )}
          </div>

          <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3 min-[850px]:mt-10">
            {NAV_DATA.map((section) => (
              <div key={section.label} className="mb-6">
                {/* Oculta label cuando está colapsado en desktop */}
                {!(!isMobile && isCollapsed) && (
                  <h2 className="mb-5 text-sm font-medium text-dark-4 dark:text-dark-6">
                    {section.label}
                  </h2>
                )}

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.title}>
                        {item.items.length ? (
                          <div>
                            <MenuItem
                              isActive={item.items.some(
                                ({ url }) => url === pathname,
                              )}
                              onClick={() => toggleExpanded(item.title)}
                              className={cn(
                                !isMobile &&
                                  isCollapsed &&
                                  "justify-center px-0",
                              )}
                              title={
                                !isMobile && isCollapsed
                                  ? item.title
                                  : undefined
                              }
                            >
                              <item.icon
                                className="size-6 shrink-0"
                                aria-hidden="true"
                              />

                              <span
                                className={cn(
                                  !isMobile && isCollapsed && "hidden",
                                )}
                              >
                                {item.title}
                              </span>

                              <ChevronUp
                                className={cn(
                                  "ml-auto rotate-180 transition-transform duration-200",
                                  expandedItems.includes(item.title) &&
                                    "rotate-0",
                                  !isMobile && isCollapsed && "hidden",
                                )}
                                aria-hidden="true"
                              />
                            </MenuItem>

                            {/* No mostramos submenu en colapsado */}
                            {expandedItems.includes(item.title) &&
                              !(!isMobile && isCollapsed) && (
                                <ul
                                  className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                  role="menu"
                                >
                                  {item.items.map((subItem) => (
                                    <li key={subItem.title} role="none">
                                      <MenuItem
                                        as="link"
                                        href={subItem.url}
                                        isActive={pathname === subItem.url}
                                      >
                                        <span>{subItem.title}</span>
                                      </MenuItem>
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </div>
                        ) : (
                          (() => {
                            const href =
                              "url" in item
                                ? item.url + ""
                                : "/" +
                                  item.title.toLowerCase().split(" ").join("-");

                            return (
                              <MenuItem
                                className={cn(
                                  "flex items-center gap-3 py-3",
                                  !isMobile &&
                                    isCollapsed &&
                                    "justify-center px-0",
                                )}
                                as="link"
                                href={href}
                                isActive={pathname === href}
                                title={
                                  !isMobile && isCollapsed
                                    ? item.title
                                    : undefined
                                }
                              >
                                <item.icon
                                  className="size-6 shrink-0"
                                  aria-hidden="true"
                                />
                                <span
                                  className={cn(
                                    !isMobile && isCollapsed && "hidden",
                                  )}
                                >
                                  {item.title}
                                </span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
