import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type KpiCardProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  caption?: string;
  icon?: LucideIcon;
  className?: string;
};

export function KpiCard({
  label,
  value,
  delta,
  trend = "flat",
  caption,
  icon: Icon,
  className,
}: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          {Icon ? (
            <div className="rounded-full bg-muted p-2">
              <Icon className="size-4 text-muted-foreground" />
            </div>
          ) : null}
        </div>

        {(delta || caption) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {delta ? (
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1 font-medium",
                  trend === "up" && "text-emerald-700 dark:text-emerald-400",
                  trend === "down" && "text-rose-700 dark:text-rose-400",
                )}
              >
                {trend !== "flat" ? <TrendIcon className="size-3" /> : null}
                {delta}
              </Badge>
            ) : null}
            {caption ? (
              <span className="text-muted-foreground">{caption}</span>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
