import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { useMissions, type Mission } from "@/hooks/useMissions";

const statusColors: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-amber-100 text-amber-800",
  validated: "bg-emerald-100 text-emerald-800",
  refused: "bg-red-100 text-red-800",
  redo: "bg-orange-100 text-orange-800",
};

const missionTypeEmoji: Record<string, string> = {
  cleaning: "🧹",
  checkin: "🔑",
  checkout: "🚪",
  maintenance: "🔧",
};

export default function SPPlanningPage() {
  const { missions, isLoading } = useMissions('service_provider');
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  const getMissionsForDay = (date: Date): Mission[] => {
    return missions.filter(m => {
      const d = new Date(m.scheduled_date);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });
  };

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Planning</h1>
        <p className="text-muted-foreground mt-1">Vue calendrier de vos missions</p>
      </motion.div>

      <Card>
        <CardContent className="pt-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold capitalize">{monthName}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="min-h-[80px]" />;

              const dayMissions = getMissionsForDay(date);
              const todayClass = isToday(date) ? "ring-2 ring-primary" : "";

              return (
                <div key={date.toISOString()} className={`min-h-[80px] p-1 rounded-lg border border-border/50 ${todayClass} hover:bg-muted/30 transition-colors`}>
                  <p className={`text-xs font-medium mb-1 ${isToday(date) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dayMissions.slice(0, 3).map(m => (
                      <div
                        key={m.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${statusColors[m.status] || 'bg-muted'}`}
                        title={`${m.property?.name} - ${m.mission_type}`}
                      >
                        {missionTypeEmoji[m.mission_type] || '📋'} {m.property?.name?.substring(0, 10) || '...'}
                      </div>
                    ))}
                    {dayMissions.length > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{dayMissions.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
            {[
              { label: 'Assignée', color: 'bg-muted' },
              { label: 'En cours', color: 'bg-blue-100' },
              { label: 'En attente', color: 'bg-amber-100' },
              { label: 'Validée', color: 'bg-emerald-100' },
              { label: 'Refusée', color: 'bg-red-100' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
