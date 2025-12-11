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
        items: [
          {
            title: "eCommerce",
            url: "/4dnn1n/home", // antes "/"
          },
        ],
      },
      {
        title: "Asesores",
        icon: Briefcase,
        url: "",
        items: [],
      },
      {
        title: "Médicos",
        icon: Stethoscope,
        url: "",
        items: [],
      },
      {
        title: "Usuarios",
        icon: Users,
        url: "",
        items: [],
      },
      {
        title: "Franquicias",
        icon: Building2,
        url: "",
        items: [],
      },
      {
        title: "Citas",
        icon: CalendarDays,
        url: "",
        items: [],
      },
      {
        title: "Convenios",
        icon: Handshake,
        url: "",
        items: [],
      },
      {
        title: "Carrusel",
        icon: Images,
        url: "",
        items: [],
      },
      {
        title: "4dnn1nistración de contenido",
        icon: LayoutDashboard,
        url: "",
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
        title: "Configuración",
        icon: Settings,
        url: "",
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
