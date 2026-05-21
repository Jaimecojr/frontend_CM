# Contacto Médico — Frontend

Panel administrativo y sitio web público construidos con **Next.js 15** y **TypeScript**.

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js     | 18             |
| npm         | 9              |

---

## Instalación local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de variables de entorno
cp .env.example .env.local   # o crear .env.local manualmente
```

### Variables de entorno (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<tu_site_key_de_recaptcha_v2>
```

> `NEXT_PUBLIC_API_URL` apunta a la API Laravel. En local debe estar corriendo en el puerto 8000 (`php artisan serve`).

```bash
# 3. Iniciar el servidor de desarrollo
npm run dev
```

El panel queda disponible en `http://localhost:3000`.

---

## Scripts disponibles

| Comando             | Descripción                                        |
|---------------------|----------------------------------------------------|
| `npm run dev`       | Servidor de desarrollo con hot-reload              |
| `npm run dev:clean` | Dev con caché limpia                               |
| `npm run build`     | Compilar para producción                           |
| `npm run start`     | Iniciar servidor de producción (después de build)  |
| `npm run lint`      | Verificar código con ESLint                        |

---

## Estructura relevante

```
src/app/4dnn1n/    → Panel administrativo (ruta protegida)
src/app/web/       → Sitio web público (guía médica, afiliarse, etc.)
src/lib/api.ts     → Cliente HTTP centralizado
src/services/      → Servicios de consumo de la API
src/components/    → Componentes reutilizables
```

---

## Configuración de producción

### 1. Variables de entorno en el servidor

```env
NEXT_PUBLIC_API_URL=https://api.contactomedico.net
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site_key_de_produccion>
```

> Las variables `NEXT_PUBLIC_*` se incrustan en el bundle al momento del build — deben estar definidas **antes** de ejecutar `npm run build`.

### 2. Build y arranque

```bash
npm run build
npm run start
```

O con PM2 para mantenerlo activo en segundo plano:

```bash
pm2 start npm --name "frontend-cm" -- start
pm2 save
```

### 3. reCAPTCHA

- Crear una clave en [Google reCAPTCHA](https://www.google.com/recaptcha/admin) tipo **v2 "No soy un robot"**.
- Registrar el dominio `contactomedico.net` en la consola de reCAPTCHA.
- Usar la **Site Key** en `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.

### 4. Dominio

El proceso Next.js corre por defecto en el puerto **3000**. El administrador del servidor debe apuntar el dominio `contactomedico.net` a ese puerto mediante el proxy inverso que tenga configurado (Nginx, Apache, panel de hosting, etc.).

---

## Notas adicionales

- El panel administrativo vive bajo la ruta `/4dnn1n` — no modificar esa ruta sin actualizar también los guards de autenticación.
- **CORS:** el backend permite solicitudes del origen configurado en `FRONTEND_URL` (variable del backend). Si el dominio del frontend cambia, actualizar esa variable en el `.env` de la API.
