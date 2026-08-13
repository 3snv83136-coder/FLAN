import { ColorContainer, type ContainerTone } from "@/components/ui/color-container";

export function ModuleShell({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: ContainerTone;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gris">
          Espace équipe
        </p>
        <h1 className="font-display text-3xl text-white">{title}</h1>
        <p className="text-sm text-gris">{subtitle}</p>
      </header>
      <ColorContainer tone={tone} title={title} subtitle="À remplir">
        <p className="text-sm opacity-80">
          Ce container est posé. On le remplira ensuite.
        </p>
      </ColorContainer>
    </div>
  );
}
