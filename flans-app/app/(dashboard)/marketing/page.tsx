import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MarketingPage() {
  return (
    <>
      <DashboardHeader
        title="Marketing"
        description="Contenus, calendrier éditorial et réseaux sociaux"
      />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Social Media Hub</CardTitle>
            <CardDescription>Module en cours de construction</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Bibliothèque médias produits</li>
              <li>Calendrier éditorial multi-plateformes</li>
              <li>Suggestions IA (légendes, hashtags)</li>
              <li>Publication Instagram, TikTok, YouTube</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
