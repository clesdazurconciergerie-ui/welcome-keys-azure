export interface CalendarEventLike {
  event_type?: string | null;
  platform?: string | null;
  summary?: string | null;
  guest_name?: string | null;
}

const BOOKING_CLOSED_PATTERN = /^closed\s*-\s*not available$/i;
const VRBO_RESERVED_PATTERN = /^reserved\s*[-–:]\s*(.+)$/i;
const GENERIC_RESERVED_PATTERN = /^(reserved|reservation|réservation|booked)\b/i;
const GENERIC_BLOCKED_PATTERN = /^(blocked|bloqué|indisponible)\b/i;

export function normalizeCalendarPlatform(platform?: string | null): string {
  const value = (platform || "other").trim().toLowerCase();
  if (!value) return "other";
  if (value === "booking.com") return "booking";
  if (value === "homeaway") return "abritel";
  return value;
}

export function isReservationLikeCalendarEvent(event: CalendarEventLike): boolean {
  const eventType = (event.event_type || "").toLowerCase();
  const platform = normalizeCalendarPlatform(event.platform);
  const summary = (event.summary || "").trim();

  if (eventType === "reservation" || eventType === "booking") return true;

  if (platform === "booking" && BOOKING_CLOSED_PATTERN.test(summary)) {
    return true;
  }

  if ((platform === "abritel" || platform === "vrbo") && VRBO_RESERVED_PATTERN.test(summary)) {
    return true;
  }

  if ((platform === "booking" || platform === "abritel" || platform === "vrbo") && GENERIC_RESERVED_PATTERN.test(summary)) {
    return true;
  }

  return false;
}

export function getReservationDisplayLabel(event: CalendarEventLike): string {
  const guestName = (event.guest_name || "").trim();
  if (guestName) return guestName;

  const platform = normalizeCalendarPlatform(event.platform);
  const summary = (event.summary || "").trim();

  const vrboReserved = summary.match(VRBO_RESERVED_PATTERN);
  if (vrboReserved?.[1]) return vrboReserved[1].trim();

  if (platform === "booking" && BOOKING_CLOSED_PATTERN.test(summary)) {
    return "Réservation Booking.com";
  }

  if ((platform === "abritel" || platform === "vrbo") && GENERIC_RESERVED_PATTERN.test(summary)) {
    return platform === "abritel" ? "Réservation Abritel" : "Réservation VRBO";
  }

  if (!summary || GENERIC_BLOCKED_PATTERN.test(summary)) {
    if (platform === "booking") return "Réservation Booking.com";
    if (platform === "abritel") return "Réservation Abritel";
    if (platform === "vrbo") return "Réservation VRBO";
    return "Réservation";
  }

  return summary;
}

export function normalizeCalendarEvent<T extends CalendarEventLike>(event: T): T {
  const platform = normalizeCalendarPlatform(event.platform);
  const isReservation = isReservationLikeCalendarEvent({ ...event, platform });

  return {
    ...event,
    platform,
    event_type: isReservation ? "reservation" : (event.event_type || "unknown"),
    summary: isReservation ? getReservationDisplayLabel({ ...event, platform }) : (event.summary || "Date bloquée"),
  };
}
