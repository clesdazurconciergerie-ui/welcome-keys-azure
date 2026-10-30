// MODULE — Badge de santé d'un calendrier iCal
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock3, PauseCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getICalFreshness } from "@/lib/icalFreshness";

interface Props {
  lastSuccessAt: string | null | undefined;
  isActive: boolean;
  className?: string;
}

export function CalendarHealthBadge({ lastSuccessAt, isActive, className }: Props) {
  const freshness = getICalFreshness(lastSuccessAt, isActive);
  let label = freshness.label;
  let Icon = CheckCircle2;
  let cls = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-800";

  if (freshness.state === "stale") {
    Icon = XCircle;
    cls = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-800";
  } else if (freshness.state === "attention") {
    Icon = AlertTriangle;
    cls = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 border-orange-200 dark:border-orange-800";
  } else if (freshness.state === "never") {
    Icon = Clock3;
    cls = "bg-muted text-muted-foreground border-border";
  } else if (freshness.state === "paused") {
    Icon = PauseCircle;
    cls = "bg-muted text-muted-foreground border-border";
  }

  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", cls, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
