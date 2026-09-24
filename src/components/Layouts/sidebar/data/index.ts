import type { ComponentType, SVGProps } from "react";
import * as Icons from "../icons";
import {
  Briefcase, // Asesores
  Stethoscope, // Médicos
  Users, // Usuarios
  Building2, // Franquicias
  CalendarDays, // Citas
  Handshake, // Convenios
  LayoutDashboard, // 4dnn1nistración de contenido
  Phone, // Contactos
  FileText, // Afiliaciones
  Settings, // Configuración
  BarChart3, // Reportes
} from "lucide-react";

// Explicit shape so `items: []` (no nav item currently has subitems) doesn't
// collapse to `never[]` and break `subItem.title`/`subItem.url` access in Sidebar.
type NavSubItem = { title: string; url: string };
type NavItem = {
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  url: string;
  items: NavSubItem[];
  superAdminOnly?: boolean;
};
type NavSection = { label: string; items: NavItem[] };

export const NAV_DATA: NavSection[] = [
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
        title: "Reportes",
        icon: BarChart3,
        url: "/4dnn1n/reports",
        items: [],
      },
      {
        title: "Administración de contenido",
        icon: LayoutDashboard,
        url: "/4dnn1n/content",
        items: [],
        superAdminOnly: true,
      },
      {
        title: "Configuración",
        icon: Settings,
        url: "/4dnn1n/settings",
        items: [],
        superAdminOnly: true,
      },
    ],
  },
];
