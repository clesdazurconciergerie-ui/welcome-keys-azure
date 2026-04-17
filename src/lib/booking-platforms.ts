// Centralized booking-platform identification + theming.
// Colors are referenced via design tokens (--platform-*) defined in src/index.css.

export type BookingPlatform = "airbnb" | "booking" | "vrbo" | "direct" | "other";

export const BOOKING_PLATFORMS: BookingPlatform[] = ["airbnb", "booking", "vrbo", "direct", "other"];

export const PLATFORM_LABELS: Record<BookingPlatform, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  vrbo: "VRBO / Abritel",
  direct: "Direct",
  other: "Autre",
};

/**
 * Tailwind class strings for each platform.
 * Uses the `platform-*` color family declared in tailwind.config.ts (HSL tokens).
 */
export const PLATFORM_CLASSES: Record<BookingPlatform, {
  badge: string;
  dot: string;
  border: string;
  bg: string;
  text: string;
}> = {
  airbnb: {
    badge: "bg-platform-airbnb/10 text-platform-airbnb border-platform-airbnb/30",
    dot: "bg-platform-airbnb",
    border: "border-l-platform-airbnb",
    bg: "bg-platform-airbnb/10",
    text: "text-platform-airbnb",
  },
  booking: {
    badge: "bg-platform-booking/10 text-platform-booking border-platform-booking/30",
    dot: "bg-platform-booking",
    border: "border-l-platform-booking",
    bg: "bg-platform-booking/10",
    text: "text-platform-booking",
  },
  vrbo: {
    badge: "bg-platform-vrbo/10 text-platform-vrbo border-platform-vrbo/30",
    dot: "bg-platform-vrbo",
    border: "border-l-platform-vrbo",
    bg: "bg-platform-vrbo/10",
    text: "text-platform-vrbo",
  },
  direct: {
    badge: "bg-platform-direct/10 text-platform-direct border-platform-direct/30",
    dot: "bg-platform-direct",
    border: "border-l-platform-direct",
    bg: "bg-platform-direct/10",
    text: "text-platform-direct",
  },
  other: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-platform-other",
    border: "border-l-platform-other",
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
};

/**
 * Map any platform / source / iCal URL string to the canonical platform key.
 */
export function resolveBookingPlatform(input?: {
  platform?: string | null;
  source?: string | null;
  url?: string | null;
  summary?: string | null;
} | string | null): BookingPlatform {
  if (!input) return "other";

  const candidates: string[] = [];
  if (typeof input === "string") {
    candidates.push(input);
  } else {
    if (input.platform) candidates.push(input.platform);
    if (input.source) candidates.push(input.source);
    if (input.url) candidates.push(input.url);
    if (input.summary) candidates.push(input.summary);
  }

  const haystack = candidates.join(" ").toLowerCase();
  if (!haystack.trim()) return "other";

  if (haystack.includes("airbnb")) return "airbnb";
  if (haystack.includes("booking")) return "booking";
  if (haystack.includes("vrbo") || haystack.includes("abritel") || haystack.includes("homeaway") || haystack.includes("expedia")) return "vrbo";
  if (haystack.includes("direct") || haystack.includes("manual") || haystack.includes("perso")) return "direct";

  return "other";
}

export function getPlatformLabel(platform?: string | null): string {
  const key = resolveBookingPlatform(platform);
  return PLATFORM_LABELS[key];
}

export function getPlatformClasses(platform?: string | null) {
  const key = resolveBookingPlatform(platform);
  return PLATFORM_CLASSES[key];
}

/**
 * Build a default human-readable iCal source name from a platform key.
 */
export function getDefaultSourceName(platform: BookingPlatform): string {
  switch (platform) {
    case "airbnb": return "Airbnb iCal";
    case "booking": return "Booking Sync";
    case "vrbo": return "VRBO iCal";
    case "direct": return "Réservation directe";
    default: return "iCal externe";
  }
}
