import * as Icons from "../icons";
import {
  Briefcase, // Asesores
  Stethoscope, // Médicos
  Users, // Usuarios
  Building2, // Franquicias
  CalendarDays, // Citas
  Handshake, // Convenios
  Images, // Carrusel
  LayoutDashboard, // 4dnn1nistración de contenido
  Phone, // Contactos
  FileText, // Afiliaciones
  Settings, // Configuración
} from "lucide-react";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        url: "/4dnn1n/home",
        items: [],
      },
      {
        title: "Usuarios",
        icon: Users,
        url: "/4dnn1n/affiliates",
        items: [],
      },
      {
        title: "Citas",
        icon: CalendarDays,
        url: "/4dnn1n/appointments",
        items: [],
      },
      {
        title: "Médicos",
        icon: Stethoscope,
        url: "/4dnn1n/doctors",
        items: [],
      },
      {
        title: "Convenios",
        icon: Handshake,
        url: "/4dnn1n/agreements",
        items: [],
      },
      {
        title: "Asesores",
        icon: Briefcase,
        url: "/4dnn1n/counselors",
        items: [],
      },
      {
        title: "Contactos",
        icon: Phone,
        url: "/4dnn1n/contacts",
        items: [],
      },
      {
        title: "Afiliaciones",
        icon: FileText,
        url: "/4dnn1n/membership-forms",
        items: [],
      },
      {
        title: "Franquicias",
        icon: Building2,
        url: "/4dnn1n/franchises",
        items: [],
      },
      {
        title: "Carrusel",
        icon: Images,
        url: "",
        items: [],
      },
      {
        title: "Administración de contenido",
        icon: LayoutDashboard,
        url: "/4dnn1n/content",
        items: [],
      },
      {
        title: "Configuración",
        icon: Settings,
        url: "/4dnn1n/settings",
        items: [],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Authentication",
        icon: Icons.Authentication,
        items: [
          {
            title: "Sign In",
            url: "/auth/sign-in", // esta sí queda fuera de 4dnn1n
          },
        ],
      },
    ],
  },
];
