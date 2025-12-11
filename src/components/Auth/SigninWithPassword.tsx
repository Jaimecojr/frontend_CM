"use client";

import React, { useState } from "react";
import InputGroup from "../FormElements/InputGroup";
import { Checkbox } from "../FormElements/checkbox";
import { PasswordIcon } from "@/assets/icons";
import { User2Icon } from "lucide-react";
import { csrf, getXsrfToken } from "@/app/4dnn1n/home/fetch";

export default function SigninWithPassword() {
  const [data, setData] = useState({ user: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Obtener CSRF
      await csrf();

      // 2. Leer cookie XSRF-TOKEN
      const xsrf = getXsrfToken();
      if (!xsrf) {
        throw new Error("No se pudo obtener el token CSRF");
      }

      // 3. Hacer login
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrf, // 👈 CLAVE
          Accept: "application/json",
        },
        body: JSON.stringify({
          user: data.user,
          password: data.password,
        }),
      });

      if (!res.ok) {
        let msg = "Error al iniciar sesión";

        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch {
          // si viene HTML (419), dejamos el msg genérico
        }

        throw new Error(msg);
      }

      // 4. Redirigir al dashboard
      window.location.href = "/4dnn1n/home";
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <InputGroup
        type="text"
        label="Usuario"
        name="user"
        placeholder="Usuario"
        value={data.user}
        handleChange={handleChange}
        icon={<User2Icon />}
      />

      <InputGroup
        type="password"
        label="Password"
        name="password"
        placeholder="Password"
        value={data.password}
        handleChange={handleChange}
        icon={<PasswordIcon />}
      />

      <div className="my-4">
        <Checkbox
          label="Remember me"
          name="remember"
          onChange={(e) => setData({ ...data, remember: e.target.checked })}
        />
      </div>

      {error && <p className="mb-3 text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-3 text-white"
      >
        {loading ? "Cargando..." : "Ingresar"}
      </button>
    </form>
  );
}
