// src/app/web/page.tsx
export default function HomePage() {
  return (
    <section className="text-center py-20">
      <h2 className="text-3xl font-bold mb-4">Bienvenido a Contacto Médico</h2>
      <p className="text-gray-600 mb-6">
        Una plataforma moderna para conectar profesionales de la salud.
      </p>
      <a
        href="/4dnn1n/home"
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Ir al panel administrativo
      </a>
    </section>
  );
}
