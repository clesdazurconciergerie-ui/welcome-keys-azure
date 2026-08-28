import { useMemo, useState } from "react";
import { CalendarDays, LogIn, LogOut, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildMonthWeeks,
  layoutStays,
  computeDayOps,
  toDateKey,
  parseDateKey,
  type Stay,
} from "@/lib/stay-utils";
import type { BookingPlatform } from "@/lib/booking-platforms";

const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const LANE_H = 22;
const LANE_GAP = 3;
const HEADER_H = 22;

const platformBar: Record<BookingPlatform | "block", { bg: string; fg: string; mark: string }> = {
  airbnb: { bg: "bg-platform-airbnb", fg: "text-white", mark: "A" },
  booking: { bg: "bg-platform-booking", fg: "text-white", mark: "B" },
  vrbo: { bg: "bg-[hsl(258_70%_55%)]", fg: "text-white", mark: "V" },
  direct: { bg: "bg-foreground", fg: "text-background", mark: "D" },
  other: { bg: "bg-muted-foreground", fg: "text-white", mark: "" },
  block: { bg: "bg-muted-foreground/40", fg: "text-foreground", mark: "" },
};

export interface DayState {
  disabled?: boolean;
  selected?: boolean;
  className?: string;
}

interface Props {
  year: number;
  month: number;
  stays: Stay[];
  /** Concierge-only operational pictograms (check-in / check-out / turnover). */
  showOperations?: boolean;
  onDayClick?: (date: Date) => void;
  getDayState?: (date: Date) => DayState;
  compact?: boolean;
}

function StayTooltipContent({ stay }: { stay: Stay }) {
  const fmt = (s: string) =>
    parseDateKey(s).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
  return (
    <div className="space-y-1.5 text-sm">
      {stay.propertyName && <p className="font-semibold leading-tight">{stay.propertyName}</p>}
      <p className="text-xs text-muted-foreground">
        {stay.kind === "reservation" ? stay.platformLabel : "Date bloquée"}
      </p>
      <div className="pt-1 text-xs space-y-0.5">
        <p><span className="text-muted-foreground">Arrivée :</span> {fmt(stay.start)}</p>
        <p><span className="text-muted-foreground">Départ :</span> {fmt(stay.end)}</p>
        <p><span className="text-muted-foreground">Nuits :</span> {stay.nights}</p>
      </div>
    </div>
  );
}

export function StayMonthGrid({
  year,
  month,
  stays,
  showOperations = false,
  onDayClick,
  getDayState,
  compact = false,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month]);
  const segments = useMemo(() => layoutStays(weeks, stays), [weeks, stays]);
  const dayOps = useMemo(() => (showOperations ? computeDayOps(stays) : {}), [stays, showOperations]);

  const todayKey = toDateKey(new Date());
  const cellW = 100 / 7;

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const weekSegs = segments.filter((s) => s.weekIndex === wi);
          const lanes = weekSegs.reduce((m, s) => Math.max(m, s.lane + 1), 0);
          const minH = HEADER_H + Math.max(lanes, compact ? 1 : 2) * (LANE_H + LANE_GAP) + 6;

          return (
            <div key={wi} className="relative">
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {week.map((date, di) => {
                  if (!date) return <div key={`e-${di}`} style={{ minHeight: minH }} />;
                  const key = toDateKey(date);
                  const state = getDayState?.(date) || {};
                  const ops = dayOps[key];
                  return (
                    <div
                      key={key}
                      style={{ minHeight: minH }}
                      onClick={() => !state.disabled && onDayClick?.(date)}
                      role={onDayClick && !state.disabled ? "button" : undefined}
                      aria-label={
                        onDayClick && !state.disabled
                          ? `Sélectionner le ${date.toLocaleDateString("fr-FR")}`
                          : undefined
                      }
                      className={[
                        "rounded-xl border transition-colors p-1",
                        key === todayKey ? "ring-2 ring-primary ring-offset-1" : "",
                        state.selected
                          ? "bg-primary/15 border-primary"
                          : state.disabled
                            ? "border-border/40 opacity-60"
                            : `border-border/40 ${onDayClick ? "hover:bg-primary/5 hover:border-primary/40 cursor-pointer" : "hover:bg-muted/20"}`,
                        state.className || "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`text-[11px] font-medium ${key === todayKey ? "text-primary font-bold" : "text-muted-foreground"}`}
                        >
                          {date.getDate()}
                        </span>
                        {showOperations && ops && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            {ops.turnover ? (
                              <span
                                title="Ménage / rotation"
                                className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-foreground text-background"
                              >
                                <Sparkles className="h-2.5 w-2.5" strokeWidth={1.5} />
                              </span>
                            ) : (
                              <>
                                {ops.checkOut && (
                                  <LogOut
                                    className="h-3 w-3 text-muted-foreground/70"
                                    strokeWidth={1.5}
                                    aria-label="Départ"
                                  />
                                )}
                                {ops.checkIn && (
                                  <LogIn
                                    className="h-3 w-3 text-muted-foreground/70"
                                    strokeWidth={1.5}
                                    aria-label="Arrivée"
                                  />
                                )}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stay bars layer */}
              <div className="absolute inset-0 pointer-events-none">
                {weekSegs.map((seg) => {
                  const left = (seg.colStart + (seg.startsHere ? 0.5 : 0)) * cellW;
                  const right = (seg.colEnd + (seg.endsHere ? 0.5 : 1)) * cellW;
                  const style = platformBar[seg.stay.kind === "block" ? "block" : seg.stay.platform];
                  const id = `${seg.stay.id}-${seg.weekIndex}`;
                  return (
                    <Popover
                      key={id}
                      open={openId === id}
                      onOpenChange={(o) => setOpenId(o ? id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          title={`${seg.stay.kind === "reservation" ? seg.stay.platformLabel : "Date bloquée"} · ${seg.stay.nights} nuit(s)`}
                          onMouseEnter={() => setOpenId(id)}
                          onMouseLeave={() => setOpenId((c) => (c === id ? null : c))}
                          className={[
                            "absolute pointer-events-auto flex items-center gap-1 px-1.5 overflow-hidden text-left",
                            "text-[10px] font-medium shadow-sm hover:brightness-110 transition-[filter]",
                            style.bg,
                            style.fg,
                            seg.stay.kind === "block" ? "border border-dashed border-foreground/30" : "",
                            seg.startsHere ? "rounded-l-full" : "rounded-l-none",
                            seg.endsHere ? "rounded-r-full" : "rounded-r-none",
                          ].join(" ")}
                          style={{
                            left: `calc(${left}% + 2px)`,
                            width: `calc(${right - left}% - 4px)`,
                            top: HEADER_H + seg.lane * (LANE_H + LANE_GAP),
                            height: LANE_H - 4,
                          }}
                        >
                          {seg.startsHere && (
                            <span className="inline-flex items-center justify-center h-3.5 w-3.5 shrink-0 rounded-full bg-white/25 text-[8px] font-bold">
                              {style.mark || <CalendarDays className="h-2.5 w-2.5" strokeWidth={1.5} />}
                            </span>
                          )}
                          <span className="truncate">
                            {seg.stay.kind === "reservation"
                              ? seg.stay.propertyName || seg.stay.platformLabel
                              : "Bloqué"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-60 p-3">
                        <StayTooltipContent stay={seg.stay} />
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
