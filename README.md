<h1 align="center">Contacto Médico — Frontend</h1>

<p align="center">
  Admin panel and public website for <strong>Contacto Médico</strong>,
  a medical affiliation platform — fully migrated from a legacy system to modern infrastructure.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.x-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Laravel_API-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel API"/>
</p>

---

## Overview

This project is the frontend layer of Contacto Médico — split into two distinct surfaces:

- **Admin Panel** (`/4dnn1n`) — internal tool for managing affiliates, appointments, doctors, counselors, franchises, agreements, and platform settings. Protected by token-based authentication.
- **Public Website** (`/web`) — patient-facing pages: medical guide, affiliation request form, and contact form. No authentication required.

Both surfaces consume the same Laravel REST API backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Tables | TanStack React Table 8 |
| Charts | ApexCharts + react-apexcharts |
| Alerts | SweetAlert2 |
| Date handling | Day.js |
| Date picker | Flatpickr |
| Icons | Lucide React |
| Theme | next-themes (dark/light) |
| Forms | react-google-recaptcha |
| Progress bar | nextjs-toploader |

---

## Prerequisites

| Tool | Min. version |
|---|---|
| Node.js | 18 |
| npm | 9 |

---

## Local Installation

```bash
# 1. Clone the repo
git clone <repo-url>
cd frontend-cm

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# or create .env.local manually (see section below)

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# URL of the Laravel backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google reCAPTCHA v2 site key (used on public forms)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

> `NEXT_PUBLIC_*` variables are embedded into the bundle **at build time** — they must be defined before running `npm run build`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot-reload |
| `npm run dev:clean` | Development server with cleared cache |
| `npm run build` | Production build |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint |

---

## Pages & Features

### Public Website (`/web`)

| Route | Description |
|---|---|
| `/web` | Homepage |
| `/web/guia-medica` | Medical guide — searchable doctor directory by specialty and city |
| `/web/afiliarse` | Affiliation request form (sends data to API, no auth required) |
| `/web/contactenos` | Contact form with reCAPTCHA validation |

### Admin Panel (`/4dnn1n`) — *requires authentication*

| Route | Description |
|---|---|
| `/4dnn1n/home` | Dashboard — daily appointments, stats, monthly charts |
| `/4dnn1n/affiliates` | Affiliate management — list, create, edit, renew, send carnet via WhatsApp |
| `/4dnn1n/appointments` | Appointment management — filter by period, WhatsApp notification on save |
| `/4dnn1n/doctors` | Doctor registry — linked to specialties |
| `/4dnn1n/counselors` | Counselor management |
| `/4dnn1n/franchises` | Franchise (user) management |
| `/4dnn1n/agreements` | Medical agreements / convenios |
| `/4dnn1n/membership-forms` | Pending affiliation requests from the public form |
| `/4dnn1n/contacts` | Contact messages submitted via the public website |
| `/4dnn1n/content/allies` | Strategic allies content — editable, reorderable |
| `/4dnn1n/content/specialists` | Specialists content — editable, reorderable |
| `/4dnn1n/settings` | WhatsApp Cloud API settings (token, template names, phone number ID) |
| `/4dnn1n/profile` | Current user profile |
| `/4dnn1n/account` | Account settings |

### Authentication

| Route | Description |
|---|---|
| `/auth/signin` | Login page |

---

## Folder Structure

```
src/
├── app/
│   ├── 4dnn1n/                 # Admin panel (protected routes)
│   │   ├── home/               # Dashboard
│   │   ├── affiliates/         # Affiliate CRUD + renewals + carnet
│   │   ├── appointments/       # Appointment management
│   │   ├── doctors/            # Doctor registry
│   │   ├── counselors/         # Counselor management
│   │   ├── franchises/         # Franchise / user management
│   │   ├── agreements/         # Agreements
│   │   ├── membership-forms/   # Pending affiliation requests
│   │   ├── contacts/           # Contact form messages
│   │   ├── content/            # Website content (allies, specialists)
│   │   └── settings/           # WhatsApp & system settings
│   ├── auth/
│   │   └── signin/             # Login page
│   └── web/
│       ├── page.tsx            # Public homepage
│       ├── guia-medica/        # Doctor directory
│       ├── afiliarse/          # Affiliation request
│       └── contactenos/        # Contact form
├── components/
│   ├── Auth/                   # Login form UI
│   ├── Breadcrumbs/            # Navigation breadcrumbs
│   ├── Charts/                 # ApexCharts wrappers
│   ├── data-table/             # TanStack Table setup
│   ├── FormElements/           # Reusable form inputs
│   ├── Layouts/                # Admin and public layout wrappers
│   ├── ui/                     # Base UI primitives
│   ├── web/                    # Public website sections (AlliesSection, DoctorsSection, etc.)
│   ├── LoadingOverlay.tsx      # Global loading overlay (logo-branded, theme-aware)
│   ├── FormPageSkeleton.tsx    # Skeleton for form pages
│   └── period-picker.tsx       # Date range picker for appointment filters
├── lib/
│   └── api.ts                  # Centralized HTTP client (reads NEXT_PUBLIC_API_URL)
└── services/                   # One file per API resource (affiliates, doctors, etc.)
```

---

## Production Deployment

### 1. Environment variables

```env
NEXT_PUBLIC_API_URL=https://api.contactomedico.net
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<production_site_key>
```

### 2. Build and start

```bash
npm run build
npm run start
```

Or with PM2 to keep it running in the background:

```bash
pm2 start npm --name "frontend-cm" -- start
pm2 save
```

### 3. Reverse proxy

The Next.js process runs on port **3000** by default. Point the domain `contactomedico.net` to that port via your server's reverse proxy (Nginx, Apache, hosting panel, etc.).

### 4. reCAPTCHA

- Create a **v2 "I'm not a robot"** key at [Google reCAPTCHA](https://www.google.com/recaptcha/admin).
- Register the production domain `contactomedico.net` in the reCAPTCHA console.
- Set the Site Key in `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.

### 5. Public section cache (ISR)

`AlliesSection.tsx` and `DoctorsSection.tsx` use `cache: "no-store"` during development. Before the production build, switch to ISR revalidation:

```ts
// Development
cache: "no-store"

// Production
next: { revalidate: 3600 }
```

Files to update:
- `src/components/web/AlliesSection.tsx`
- `src/components/web/DoctorsSection.tsx`

---

## Notes

- **Admin panel route** lives under `/4dnn1n` — do not rename this path without updating authentication guards accordingly.
- **CORS:** the backend reads the allowed origin from its `FRONTEND_URL` environment variable. If the frontend domain changes, update that variable in the API's `.env` and clear its config cache.
- **Dark / Light theme** is supported globally via `next-themes` — the loading overlay and all UI components are theme-aware.
- **`NEXT_PUBLIC_*` variables** are baked into the bundle at build time. If they change in production, a full rebuild (`npm run build`) is required.
