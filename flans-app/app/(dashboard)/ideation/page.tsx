import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModulePageProps = {
  title: string;
  description: string;
  features: string[];
};

function ModulePage({ title, description, features }: ModulePageProps) {
  return (
    <>
      <DashboardHeader title={title} description={description} />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Module en cours de construction</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

export default function IdeationPage() {
  return (
    <ModulePage
      title="Idéation & Design"
      description="Boîte à idées vocale, fiches produit et tendances"
      features={[
        "Enregistrement vocal avec transcription Whisper",
        "Fiches produit avec largeurs de pied",
        "Upload croquis et prototypes",
        "Flux de tendances mode",
      ]}
    />
  );
}
