import Signin from "@/components/Auth/Signin";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Login",
};

export default function SignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 p-4 dark:bg-dark">
      <div className="w-full max-w-[500px] rounded-2xl bg-white p-8 shadow-1 dark:bg-gray-dark dark:shadow-card sm:p-12">
        {/* LOGO CENTERED */}
        <div className="mb-8 flex justify-center">
          <Image
            className="hidden dark:block"
            src={"/images/logo/logo.png"}
            alt="Logo"
            width={220}
            height={50}
            priority
          />
          <Image
            className="dark:hidden"
            src={"/images/logo/logo.png"}
            alt="Logo"
            width={220}
            height={50}
            priority
          />
        </div>

        {/* TITLE & DESC */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-dark dark:text-white sm:text-heading-3">
            ¡Bienvenido de nuevo!
          </h1>
          <p className="text-sm font-medium text-dark-4 dark:text-dark-6">
            Inicie sesión en su cuenta completando los campos necesarios a continuación.
          </p>
        </div>

        {/* FORM */}
        <Signin />
      </div>
    </div>
  );
}
