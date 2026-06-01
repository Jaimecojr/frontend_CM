import darkLogoPng from "@/assets/logos/logo.png";
import logoPng from "@/assets/logos/logo.png";
import logoIconPng from "@/assets/logos/logo-icon.png";
import Image from "next/image";

export function Logo() {
  return (
    <div className="flex w-[260px] items-center justify-center">
      <Image
        src={logoPng}
        alt="Logo"
        width={260}
        height={60} // 3.75rem = 60px
        className="h-[3.75rem] w-auto object-contain dark:hidden"
        priority
      />
      <Image
        src={darkLogoPng}
        alt="Logo"
        width={260}
        height={60}
        className="hidden h-[3.75rem] w-auto object-contain dark:block"
        priority
      />
    </div>
  );
}

export function LogoIcon({ size = 30 }: { size?: number }) {
  return (
    <Image
      src={logoIconPng}
      width={size}
      height={size}
      alt="Logo"
      role="presentation"
      priority
    />
  );
}
