import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ShowcaseSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;

  children: ReactNode;

  className?: string;          // estilos del contenedor card
  headerClassName?: string;    // estilos del header
  childrenClassName?: string;  // estilos del body (padding)
};

export function ShowcaseSection({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
  childrenClassName,
}: ShowcaseSectionProps) {
  return (
    <div
      className={cn(
        "rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 border-b border-stroke px-4 py-4 dark:border-dark-3 sm:px-6 xl:px-7.5",
          headerClassName
        )}
      >
        <div className="min-w-0">
          <h2 className="font-medium text-dark dark:text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-body-color dark:text-body-color-dark">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className={cn("p-4 sm:p-6 xl:p-10", childrenClassName)}>
        {children}
      </div>
    </div>
  );
}
