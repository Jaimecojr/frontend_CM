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
        url: "",
        items: [],
      },
      {
        title: "Afiliaciones",
        icon: FileText,
        url: "",
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
        url: "",
        items: [],
      },
      {
        title: "Configuración",
        icon: Settings,
        url: "/4dnn1n/settings",
        items: [],
      },
      {
        title: "Calendar",
        url: "/4dnn1n/calendar", // antes "/calendar"
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "Profile",
        url: "/4dnn1n/profile", // antes "/profile"
        icon: Icons.User,
        items: [],
      },
      {
        title: "Forms",
        icon: Icons.Alphabet,
        items: [
          {
            title: "Form Elements",
            url: "/4dnn1n/forms/form-elements",
          },
          {
            title: "Form Layout",
            url: "/4dnn1n/forms/form-layout",
          },
        ],
      },
      {
        title: "Tables",
        url: "/4dnn1n/tables",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "Pages",
        icon: Icons.Alphabet,
        items: [
          {
            title: "Settings",
            url: "/4dnn1n/pages/settings",
          },
        ],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Charts",
        icon: Icons.PieChart,
        items: [
          {
            title: "Basic Chart",
            url: "/4dnn1n/charts/basic-chart",
          },
        ],
      },
      {
        title: "UI Elements",
        icon: Icons.FourCircle,
        items: [
          {
            title: "Alerts",
            url: "/4dnn1n/ui-elements/alerts",
          },
          {
            title: "Buttons",
            url: "/4dnn1n/ui-elements/buttons",
          },
        ],
      },
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
