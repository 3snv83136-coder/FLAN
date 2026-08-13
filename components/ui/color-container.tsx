import { cn } from "@/lib/utils";

const TONE_CLASS = {
  jaune: "bg-container-jaune text-brun",
  vert: "bg-container-vert text-white",
  violet: "bg-container-violet text-white",
  rose: "bg-container-rose text-white",
  orange: "bg-container-orange text-white",
  cyan: "bg-container-cyan text-brun",
  blanc: "bg-white/95 text-brun",
} as const;

export type ContainerTone = keyof typeof TONE_CLASS;

export function ColorContainer({
  title,
  subtitle,
  tone = "blanc",
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  tone?: ContainerTone;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-5 shadow-lg shadow-black/10",
        TONE_CLASS[tone],
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm opacity-80">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
