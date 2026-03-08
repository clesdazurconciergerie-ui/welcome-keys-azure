import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { useNewMissions } from "@/hooks/useNewMissions";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function UpcomingOperations() {
  const { missions, isLoading } = useNewMissions('concierge');
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="text-lg">Opérations à venir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const todayMissions = missions.filter(m => m.start_at && isToday(new Date(m.start_at)));
  const tomorrowMissions = missions.filter(m => m.start_at && isTomorrow(new Date(m.start_at)));
  const overdueMissions = missions.filter(
    m => m.start_at && isPast(new Date(m.start_at)) && m.status !== 'done' && m.status !== 'approved'
  );

  const sections = [
    {
      title: "En retard",
      missions: overdueMissions,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-100",
      count: overdueMissions.length,
    },
    {
      title: "Aujourd'hui",
      missions: todayMissions,
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10",
      count: todayMissions.length,
    },
    {
      title: "Demain",
      missions: tomorrowMissions,
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      count: tomorrowMissions.length,
    },
  ];

  const totalCount = overdueMissions.length + todayMissions.length + tomorrowMissions.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Opérations à venir
          {totalCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune mission urgente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) =>
              section.count > 0 ? (
                <div key={section.title} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <section.icon className={`w-4 h-4 ${section.color}`} />
                    <h4 className="text-sm font-semibold">{section.title}</h4>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {section.count}
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-6">
                    {section.missions.slice(0, 3).map((mission) => (
                      <button
                        key={mission.id}
                        onClick={() => navigate("/dashboard/missions")}
                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{mission.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {mission.start_at
                                ? format(new Date(mission.start_at), "HH:mm", { locale: fr })
                                : "—"}
                            </p>
                          </div>
                          <Badge variant={mission.status === "open" ? "default" : "secondary"} className="text-xs">
                            {mission.status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                    {section.count > 3 && (
                      <p className="text-xs text-muted-foreground pl-3">
                        +{section.count - 3} autre{section.count - 3 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
