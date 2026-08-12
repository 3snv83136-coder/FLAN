import {
  Lightbulb,
  Factory,
  Wallet,
  Megaphone,
  Users,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const mainNav: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
    description: "Vue d'ensemble de l'activité",
  },
  {
    title: "Idéation",
    href: "/ideation",
    icon: Lightbulb,
    description: "Idées, produits et tendances",
  },
  {
    title: "Fournisseurs",
    href: "/suppliers",
    icon: Factory,
    description: "Sourcing, échantillons et production",
  },
  {
    title: "Finance",
    href: "/finance",
    icon: Wallet,
    description: "Marges, coûts et prévisions",
  },
  {
    title: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    description: "Contenus et réseaux sociaux",
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
    description: "Leads, commandes et support",
  },
];
