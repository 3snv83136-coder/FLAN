import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SuppliersPage() {
  return (
    <>
      <DashboardHeader
        title="Fournisseurs"
        description="Sourcing, échantillons, devis et production"
      />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestion fournisseurs</CardTitle>
            <CardDescription>Module en cours de construction</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Base de données fournisseurs</li>
              <li>Kanban échantillons (demandé → reçu → validé)</li>
              <li>Automatisation demandes de devis (RFQ)</li>
              <li>Suivi de production</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
