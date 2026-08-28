// Stay grouping utilities: turn raw iCal / booking events into continuous "stays"
// (check-in -> check-out) that can be drawn as one bar across the month grid.

import { resolveBookingPlatform, type BookingPlatform, getPlatformLabel } from "@/lib/booking-platforms";

export interface RawStayEvent {
  id: string;
  start_date: string; // YYYY-MM-DD (DTSTART / check-in)
  end_date: string;   // YYYY-MM-DD exclusive (DTEND / check-out)
  platform?: string | null;
  source?: string | null;
  summary?: string | null;
  event_type?: string | null;
  property_id?: string | null;
}

export type StayKind = "reservation" | "block";

export interface Stay {
  id: string;
  start: string;       // check-in, inclusive
  end: string;         // check-out, exclusive
  nights: number;
  kind: StayKind;
  platform: BookingPlatform;
  platformLabel: string;
  propertyId?: string | null;
  propertyName?: string | null;
}

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseDateKey = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (s: string, n: number) => {
  const d = parseDateKey(s);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};

export const nightsBetween = (start: string, end: string) =>
  Math.max(0, Math.round((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / 86400000));

/**
 * Group raw events into unique stays.
 * - Normalizes dates to YYYY-MM-DD
 * - Deduplicates events sharing the same property + start + end (iCal + bookings mirror)
 * - Keeps the most informative platform when duplicates collide
 */
export function buildStays(
  events: RawStayEvent[],
  opts: { propertyNameById?: Record<string, string> } = {}
): Stay[] {
  const map = new Map<string, Stay>();

  for (const ev of events) {
    if (!ev?.start_date || !ev?.end_date) continue;
    const start = ev.start_date.slice(0, 10);
    let end = ev.end_date.slice(0, 10);
    if (end <= start) end = addDays(start, 1); // guard against same-day / malformed DTEND

    const type = (ev.event_type || "").toLowerCase();
    const kind: StayKind =
      type === "reservation" || type === "booking" ? "reservation" : "block";

    const platform = resolveBookingPlatform({
      platform: ev.platform,
      source: ev.source,
      summary: ev.summary,
    });

    const key = `${ev.property_id || "_"}|${start}|${end}|${kind}`;
    const existing = map.get(key);
    if (existing) {
      // Prefer a known platform over "other"
      if (existing.platform === "other" && platform !== "other") {
        existing.platform = platform;
        existing.platformLabel = getPlatformLabel(platform);
      }
      continue;
    }

    map.set(key, {
      id: ev.id,
      start,
      end,
      nights: nightsBetween(start, end),
      kind,
      platform,
      platformLabel: getPlatformLabel(platform),
      propertyId: ev.property_id ?? null,
      propertyName: ev.property_id ? opts.propertyNameById?.[ev.property_id] ?? null : null,
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => a.start.localeCompare(b.start) || b.nights - a.nights
  );
}

export interface StaySegment {
  stay: Stay;
  weekIndex: number;
  colStart: number;   // 0..6
  colEnd: number;     // 0..6 (inclusive cell where the bar visually ends)
  startsHere: boolean; // true when the check-in day is inside this segment
  endsHere: boolean;   // true when the check-out day is inside this segment
  lane: number;
}

/**
 * Split stays into per-week segments and assign non-overlapping lanes.
 * `weeks` is an array of 7-day arrays (Date | null) as produced by the month grid.
 */
export function layoutStays(weeks: (Date | null)[][], stays: Stay[]): StaySegment[] {
  const segments: StaySegment[] = [];

  weeks.forEach((week, weekIndex) => {
    const days = week.map((d) => (d ? toDateKey(d) : null));
    const firstKey = days.find((d): d is string => !!d);
    const lastKey = [...days].reverse().find((d): d is string => !!d);
    if (!firstKey || !lastKey) return;

    const weekSegs: Omit<StaySegment, "lane">[] = [];

    for (const stay of stays) {
      // Bar spans check-in day -> check-out day (inclusive of the checkout cell)
      const barStart = stay.start;
      const barEnd = stay.end; // checkout day cell
      if (barEnd < firstKey || barStart > lastKey) continue;

      const clampedStart = barStart < firstKey ? firstKey : barStart;
      const clampedEnd = barEnd > lastKey ? lastKey : barEnd;

      const colStart = days.indexOf(clampedStart);
      const colEnd = days.indexOf(clampedEnd);
      if (colStart < 0 || colEnd < 0 || colEnd < colStart) continue;

      weekSegs.push({
        stay,
        weekIndex,
        colStart,
        colEnd,
        startsHere: barStart >= firstKey,
        endsHere: barEnd <= lastKey,
      });
    }

    // Lane assignment: greedy, first free lane
    const lanes: number[] = []; // lanes[i] = last occupied column
    weekSegs
      .sort((a, b) => a.colStart - b.colStart || b.colEnd - a.colEnd)
      .forEach((seg) => {
        let lane = lanes.findIndex((lastCol) => lastCol < seg.colStart);
        if (lane === -1) {
          lane = lanes.length;
          lanes.push(seg.colEnd);
        } else {
          lanes[lane] = seg.colEnd;
        }
        segments.push({ ...seg, lane });
      });
  });

  return segments;
}

export interface DayOps {
  checkIn: boolean;
  checkOut: boolean;
  turnover: boolean; // check-out and check-in the same day => cleaning
}

/** Operational flags per day (concierge only). */
export function computeDayOps(stays: Stay[]): Record<string, DayOps> {
  const map: Record<string, DayOps> = {};
  const ensure = (k: string) => (map[k] ??= { checkIn: false, checkOut: false, turnover: false });

  for (const s of stays) {
    if (s.kind !== "reservation") continue;
    ensure(s.start).checkIn = true;
    ensure(s.end).checkOut = true;
  }
  for (const k of Object.keys(map)) {
    map[k].turnover = map[k].checkIn && map[k].checkOut;
  }
  return map;
}

/** Build a month grid split into weeks (Mon-first). */
export function buildMonthWeeks(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const offset = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
