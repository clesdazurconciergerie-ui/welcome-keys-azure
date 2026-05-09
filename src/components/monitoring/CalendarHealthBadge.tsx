// MODULE — Badge de santé d'un calendrier iCal
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  score: number | null | undefined;
  className?: string;
}

export function CalendarHealthBadge({ score, className }: Props) {
  const s = score ?? 1;
  let label = "Excellent";
  let Icon = CheckCircle2;
  let cls = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-800";

  if (s < 0.5) {
    label = "Critique";
    Icon = XCircle;
    cls = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-800";
  } else if (s < 0.7) {
    label = "Moyen";
    Icon = AlertCircle;
    cls = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 border-orange-200 dark:border-orange-800";
  } else if (s < 0.9) {
    label = "Bon";
    Icon = AlertTriangle;
    cls = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800";
  }

  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", cls, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label} · {Math.round(s * 100)}%
    </Badge>
  );
}
