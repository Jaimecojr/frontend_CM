import React from "react";
import { Navbar } from "@/components/web/Navbar";
import { Footer } from "@/components/web/Footer";

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white font-sans text-[#0b1c30] min-h-screen flex flex-col">
      <link
        href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <Navbar />
      <div className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
}