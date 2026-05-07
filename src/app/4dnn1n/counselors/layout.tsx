import type { ReactNode } from "react";

export default function CounselorsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6">
      <div className="mt-4">{children}</div>
    </div>
  );
}