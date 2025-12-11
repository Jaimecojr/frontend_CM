export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="p-4 bg-blue-600 text-white">
        <h1 className="text-xl font-bold">Contacto Médico</h1>
      </header>

      <main>{children}</main>

      <footer className="p-4 bg-gray-100 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Contacto Médico. Todos los derechos reservados.
      </footer>
    </>
  );
}