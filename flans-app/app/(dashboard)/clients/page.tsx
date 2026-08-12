import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ClientsPage() {
  return (
    <>
      <DashboardHeader
        title="Clients"
        description="Leads, précommandes, support et feedback"
      />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Relation client</CardTitle>
            <CardDescription>Module en cours de construction</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Fiches clients avec préférences largeur de pied</li>
              <li>Suivi des précommandes</li>
              <li>Système de tickets support</li>
              <li>Collecte et analyse des retours produit</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
