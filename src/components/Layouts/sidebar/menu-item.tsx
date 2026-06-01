import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useSidebarContext } from "./sidebar-context";

const menuItemBaseStyles = cva(
  "rounded-lg px-3.5 font-medium text-dark-4 transition-all duration-200 dark:text-dark-6",
  {
    variants: {
      isActive: {
        true: "bg-[rgba(87,80,241,0.07)] text-primary hover:bg-[rgba(87,80,241,0.07)] dark:bg-[#FFFFFF1A] dark:text-white",
        false:
          "hover:bg-gray-100 hover:text-dark hover:dark:bg-[#FFFFFF1A] hover:dark:text-white",
      },
    },
    defaultVariants: { isActive: false },
  },
);

type BaseProps = {
  className?: string;
  children: React.ReactNode;
  isActive: boolean;
  title?: string; // ✅ nuevo (tooltip nativo)
};

type ButtonProps = { as?: "button"; onClick: () => void };
type LinkProps = { as: "link"; href: string };

export function MenuItem(props: BaseProps & (ButtonProps | LinkProps)) {
  const { toggleSidebar, isMobile } = useSidebarContext();

  if (props.as === "link") {
    return (
      <Link
        href={props.href}
        title={props.title} // ✅
        onClick={() => isMobile && toggleSidebar()}
        className={cn(
          menuItemBaseStyles({
            isActive: props.isActive,
            className: "relative block py-2",
          }),
          props.className,
        )}
      >
        {props.children}
      </Link>
    );
  }

  return (
    <button
      onClick={props.onClick}
      title={props.title}
      aria-expanded={props.isActive}
      className={cn(
        menuItemBaseStyles({
          isActive: props.isActive,
          className: "flex w-full items-center gap-3 py-3",
        }),
        props.className, // ✅ ahora sí aplica
      )}
    >
      {props.children}
    </button>
  );
}
