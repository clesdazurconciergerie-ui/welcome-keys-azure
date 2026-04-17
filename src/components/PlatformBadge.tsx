import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPlatformClasses, getPlatformLabel, resolveBookingPlatform } from "@/lib/booking-platforms";

interface PlatformBadgeProps {
  platform?: string | null;
  source?: string | null;
  className?: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

/**
 * Standard badge for displaying a booking platform (Airbnb, Booking, VRBO, etc.).
 * Uses design-token colors only (no hardcoded hex).
 */
export function PlatformBadge({ platform, source, className, showDot = true, size = "sm" }: PlatformBadgeProps) {
  const key = resolveBookingPlatform({ platform, source });
  const classes = getPlatformClasses(key);
  const label = getPlatformLabel(key);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium border",
        size === "sm" ? "text-[10px] px-1.5 py-0 h-5" : "text-xs px-2 py-0.5",
        classes.badge,
        className,
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />}
      {label}
    </Badge>
  );
}
