import Link from "next/link";
import { Button } from "@/components/ui-elements/button";

export function CreateToolbarButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link href={href} className="shrink-0">
      <Button
        variant="primary"
        size="small"
        shape="rounded"
        className="h-9 w-9 px-0 sm:w-auto sm:px-3"
        title={label}
        aria-label={label}
      >
        <span className="text-lg leading-none sm:hidden">+</span>
        <span className="hidden sm:inline">+ {label}</span>
      </Button>
    </Link>
  );
}
