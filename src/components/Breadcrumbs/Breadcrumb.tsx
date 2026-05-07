import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

interface BreadcrumbProps {
  pageName?: string; // fallback simple
  items?: Crumb[];   // multinivel
  showTitle?: boolean; // ✅ nuevo
  className?: string;
}

const Breadcrumb = ({
  pageName,
  items,
  showTitle = false, // ✅ por defecto NO muestra el h2
  className = "",
}: BreadcrumbProps) => {
  const defaultItems: Crumb[] = [
    { label: "Dashboard", href: "/4dnn1n/home" },
    { label: pageName ?? "" },
  ].filter((i) => i.label);

  const crumbs = items?.length ? items : defaultItems;
  const lastLabel = crumbs[crumbs.length - 1]?.label;

  return (
    <div
      className={`mb-6 flex items-center justify-end ${className}`}
    >
      {/* ✅ Solo mostramos título si lo piden */}
      {showTitle && (
        <h2 className="mr-auto text-[26px] font-bold leading-[30px] text-dark dark:text-white">
          {lastLabel}
        </h2>
      )}

      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;

            return (
              <li
                key={`${crumb.label}-${index}`}
                className="flex items-center gap-2"
              >
                {crumb.href && !isLast ? (
                  <Link className="font-medium hover:text-primary" href={crumb.href}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={`font-medium ${isLast ? "text-primary" : ""}`}>
                    {crumb.label}
                  </span>
                )}

                {!isLast && <span>/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
