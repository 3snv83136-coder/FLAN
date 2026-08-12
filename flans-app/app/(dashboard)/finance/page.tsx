import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function FinancePage() {
  return (
    <>
      <DashboardHeader
        title="Finance"
        description="Marges, coûts, prévisions et tableaux de bord"
      />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Business plan & finance</CardTitle>
            <CardDescription>Module en cours de construction</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Calculateur de marges par paire</li>
              <li>Prévisions de ventes</li>
              <li>Suivi des dépenses par catégorie</li>
              <li>KPI financiers (CA, rentabilité, trésorerie)</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
