import {
  Factory,
  Lightbulb,
  Megaphone,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité TRICOSHOES"
      />

      <main className="flex-1 space-y-6 p-4 md:p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Chiffre d'affaires"
            value="—"
            delta="+0%"
            trend="up"
            caption="vs mois précédent"
            icon={TrendingUp}
          />
          <KpiCard
            label="Commandes en cours"
            value="—"
            caption="production active"
            icon={Package}
          />
          <KpiCard
            label="Nouveaux leads"
            value="—"
            delta="+0%"
            trend="up"
            caption="ce mois-ci"
            icon={Users}
          />
          <KpiCard
            label="Idées capturées"
            value="—"
            caption="boîte à idées"
            icon={Lightbulb}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prochaines étapes</CardTitle>
              <CardDescription>
                Modules à configurer dans Supabase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Connecter le projet Supabase (.env.local)",
                "Définir les tables produits et fournisseurs",
                "Activer la boîte à idées vocale (Whisper)",
                "Configurer l'envoi RFQ (Resend)",
              ].map((step) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm"
                >
                  <Badge variant="secondary">À faire</Badge>
                  <span>{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modules CRM</CardTitle>
              <CardDescription>
                Accès rapide aux espaces de travail
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Idéation", href: "/ideation", icon: Lightbulb },
                { label: "Fournisseurs", href: "/suppliers", icon: Factory },
                { label: "Marketing", href: "/marketing", icon: Megaphone },
                { label: "Clients", href: "/clients", icon: Users },
              ].map(({ label, href, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-accent"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </a>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
