import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BookOpen, Users, Home, Wrench, Plus, ArrowRight, Clock, CheckCircle, AlertTriangle, DollarSign, Target, Phone, Calendar, Mail, Copy, User } from "lucide-react";
import GlobalCalendar from "@/components/dashboard/GlobalCalendar";
import { motion } from "framer-motion";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCleaningInterventions, type CleaningIntervention } from "@/hooks/useCleaningInterventions";
import { useProspectFollowups } from "@/hooks/useProspects";
import { useNewMissions, type NewMission } from "@/hooks/useNewMissions";
import SubscriptionAlert from "@/components/SubscriptionAlert";
import DemoExpirationBanner from "@/components/DemoExpirationBanner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const DashboardHome = () => {
  const navigate = useNavigate();
  const [bookletCount, setBookletCount] = useState(0);
  const [userName, setUserName] = useState("");
  const [selectedMission, setSelectedMission] = useState<CleaningIntervention | null>(null);
  const [selectedNewMission, setSelectedNewMission] = useState<NewMission | null>(null);
  const { primaryRole } = useUserRoles();
  const { interventions } = useCleaningInterventions('concierge');
  const { missions: newMissions } = useNewMissions('concierge');
  const { followups, updateFollowup } = useProspectFollowups();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const name = (user.email || "").split("@")[0].split(".")[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));

      const { count } = await supabase
        .from("booklets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setBookletCount(count || 0);
    };
    init();
  }, []);

  // Mission KPIs
  const now = new Date();
  const todayStr = now.toDateString();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const inProgress = interventions.filter(i => i.status === 'in_progress');
  const pendingValidation = interventions.filter(i => i.status === 'completed');
  const todayMissions = interventions.filter(i => new Date(i.scheduled_date).toDateString() === todayStr);
  const activeProviders = new Set(todayMissions.filter(i => i.status !== 'refused' && i.service_provider_id).map(i => i.service_provider_id)).size;

  const monthlyValidated = interventions.filter(i => {
    const d = new Date(i.scheduled_date);
    return i.status === 'validated' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalToPay = monthlyValidated.filter(m => !m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);
  const totalPaid = monthlyValidated.filter(m => m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);

  const stats = [
    { label: "Livrets", value: bookletCount, icon: BookOpen, color: "text-primary", bg: "bg-primary/10", link: "/dashboard/livrets" },
    { label: "Propriétaires", value: "—", icon: Users, color: "text-[hsl(var(--gold))]", bg: "bg-[hsl(var(--gold))]/10", link: "/dashboard/proprietaires" },
    { label: "Logements", value: "—", icon: Home, color: "text-emerald-600", bg: "bg-emerald-100", link: "/dashboard/logements" },
    { label: "Prestataires", value: "—", icon: Wrench, color: "text-violet-600", bg: "bg-violet-100", link: "/dashboard/prestataires" },
  ];

  return (
    <div className="space-y-5 sm:space-y-8 max-w-6xl">
      <SubscriptionAlert />
      <DemoExpirationBanner />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-lg">
          Bonjour <span className="font-semibold text-foreground">{userName}</span> 👋
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">Tableau de bord</h1>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-border" onClick={() => navigate(stat.link)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Mission Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/interventions')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">En cours</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{inProgress.length}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200" onClick={() => navigate('/dashboard/interventions')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">À valider</span>
              {pendingValidation.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <p className="text-3xl font-bold text-foreground">{pendingValidation.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Prestataires actifs</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{activeProviders}</p>
            <p className="text-xs text-muted-foreground">aujourd'hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Paiements mois</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{totalPaid}€ <span className="text-xs font-normal text-muted-foreground">payé</span></p>
            <p className="text-sm text-amber-600">{totalToPay}€ <span className="text-xs font-normal text-muted-foreground">à payer</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Global Calendar */}
      <GlobalCalendar />

      {/* Pending validation list */}
      {pendingValidation.length > 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Missions en attente de validation ({pendingValidation.length})
            </h2>
            <div className="space-y-2">
              {pendingValidation.slice(0, 5).map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedMission(m)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{m.property?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.scheduled_date).toLocaleDateString('fr-FR')}
                      {m.service_provider
                        ? ` — Assigné à ${m.service_provider.first_name} ${m.service_provider.last_name}`
                        : " — Aucun prestataire assigné"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.service_provider?.phone && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild onClick={e => e.stopPropagation()}>
                        <a href={`tel:${m.service_provider.phone}`}><Phone className="w-3.5 h-3.5 text-emerald-600" /></a>
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">📸 {m.photos?.length || 0}</span>
                    <Badge variant="secondary">{m.mission_amount}€</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In progress list */}
      {inProgress.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Missions en cours ({inProgress.length})
            </h2>
            <div className="space-y-2">
              {inProgress.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedMission(m)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{m.property?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.service_provider
                        ? `👤 ${m.service_provider.first_name} ${m.service_provider.last_name}`
                        : "Aucun prestataire assigné"}
                      {m.actual_start_time && ` — Démarré à ${new Date(m.actual_start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.service_provider?.phone && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild onClick={e => e.stopPropagation()}>
                        <a href={`tel:${m.service_provider.phone}`}><Phone className="w-3.5 h-3.5 text-emerald-600" /></a>
                      </Button>
                    )}
                    <Badge variant="secondary">En cours</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prospect Followups Today */}
      {(() => {
        const todayFollowups = followups.filter(f => f.status === "todo" && f.scheduled_date === new Date().toISOString().split('T')[0]);
        const overdueFollowups = followups.filter(f => f.status === "todo" && new Date(f.scheduled_date) < new Date() && f.scheduled_date !== new Date().toISOString().split('T')[0]);
        return (
          <>
            {(todayFollowups.length > 0 || overdueFollowups.length > 0) && (
              <Card className="border-violet-200">
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-violet-500" />
                    Relances prospection
                    {overdueFollowups.length > 0 && <Badge variant="destructive" className="text-xs">{overdueFollowups.length} en retard</Badge>}
                  </h2>
                  <div className="space-y-2">
                    {overdueFollowups.slice(0, 3).map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                        <div>
                          <p className="font-medium text-sm">{f.prospect?.first_name} {f.prospect?.last_name}</p>
                          <p className="text-xs text-red-600">⚠️ En retard — {format(new Date(f.scheduled_date), "dd MMM", { locale: fr })}</p>
                        </div>
                        <div className="flex gap-1">
                          {f.prospect?.phone && <Button size="sm" variant="ghost" asChild><a href={`tel:${f.prospect.phone}`}><Phone className="w-3.5 h-3.5" /></a></Button>}
                          <Button size="sm" variant="outline" onClick={() => { updateFollowup.mutate({ id: f.id, status: "done", completed_date: new Date().toISOString().split('T')[0] }); toast.success("Relance marquée comme faite"); }}>Fait</Button>
                        </div>
                      </div>
                    ))}
                    {todayFollowups.slice(0, 3).map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-violet-50">
                        <div>
                          <p className="font-medium text-sm">{f.prospect?.first_name} {f.prospect?.last_name}</p>
                          <p className="text-xs text-muted-foreground">📅 Aujourd'hui{f.comment ? ` — ${f.comment}` : ""}</p>
                        </div>
                        <div className="flex gap-1">
                          {f.prospect?.phone && <Button size="sm" variant="ghost" asChild><a href={`tel:${f.prospect.phone}`}><Phone className="w-3.5 h-3.5" /></a></Button>}
                          <Button size="sm" variant="outline" onClick={() => { updateFollowup.mutate({ id: f.id, status: "done", completed_date: new Date().toISOString().split('T')[0] }); toast.success("Relance marquée comme faite"); }}>Fait</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="link" onClick={() => navigate("/dashboard/prospection")} className="mt-2 text-violet-600 p-0 h-auto">
                    Voir tous les prospects <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {/* New missions activity (assigned/confirmed with providers) */}
      {(() => {
        const activeMissions = newMissions.filter(m => ['assigned', 'confirmed', 'done'].includes(m.status));
        if (activeMissions.length === 0) return null;
        return (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[hsl(var(--gold))]" />
                Missions assignées ({activeMissions.length})
              </h2>
              <div className="space-y-2">
                {activeMissions.slice(0, 8).map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => setSelectedNewMission(m)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.property?.name} — {format(new Date(m.start_at), "dd MMM HH:mm", { locale: fr })}
                        {m.selected_provider
                          ? ` — Assigné à ${m.selected_provider.first_name} ${m.selected_provider.last_name}`
                          : " — Aucun prestataire"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.selected_provider?.phone && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild onClick={e => e.stopPropagation()}>
                          <a href={`tel:${m.selected_provider.phone}`}><Phone className="w-3.5 h-3.5 text-emerald-600" /></a>
                        </Button>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {m.status === 'assigned' ? 'Assignée' : m.status === 'confirmed' ? 'Confirmée' : 'Terminée'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Quick Actions */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Actions rapides</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
          <Button onClick={() => navigate("/dashboard/interventions")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle mission
          </Button>
          <Button onClick={() => navigate("/booklets/new")} variant="outline">
            <BookOpen className="w-4 h-4 mr-2" />
            Nouveau livret
          </Button>
          <Button onClick={() => navigate("/dashboard/prospection")} variant="outline" className="border-violet-200 text-violet-600 hover:bg-violet-50">
            <Target className="w-4 h-4 mr-2" />
            Prospecter
          </Button>
          <Button onClick={() => navigate("/dashboard/proprietaires")} variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Ajouter un propriétaire
          </Button>
        </div>
      </div>

      {/* ── Mission Detail Drawer (legacy interventions) ──── */}
      <Sheet open={!!selectedMission} onOpenChange={open => { if (!open) setSelectedMission(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-auto">
          {selectedMission && (
            <>
              <SheetHeader>
                <SheetTitle>Détail mission</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedMission.property?.name}</span>
                  </div>
                  {selectedMission.property?.address && (
                    <p className="text-sm text-muted-foreground ml-6">{selectedMission.property.address}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(selectedMission.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  {selectedMission.scheduled_start_time && (
                    <div className="flex items-center gap-2 text-sm ml-6">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{new Date(selectedMission.scheduled_start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedMission.mission_amount}€</span>
                  </div>
                  <Badge variant="secondary">{selectedMission.status}</Badge>
                </div>

                {/* Provider section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="w-4 h-4" /> Prestataire assigné
                  </h3>
                  {selectedMission.service_provider ? (
                    <>
                      <p className="font-medium">
                        {selectedMission.service_provider.first_name} {selectedMission.service_provider.last_name}
                      </p>
                      {selectedMission.service_provider.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm">{selectedMission.service_provider.phone}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedMission.service_provider!.phone!);
                              toast.success("Numéro copié");
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {selectedMission.service_provider.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedMission.service_provider.email}</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {selectedMission.service_provider.phone && (
                          <Button size="sm" asChild className="flex-1">
                            <a href={`tel:${selectedMission.service_provider.phone}`}>
                              <Phone className="w-3.5 h-3.5 mr-1" /> Appeler
                            </a>
                          </Button>
                        )}
                        {selectedMission.service_provider.email && (
                          <Button size="sm" variant="outline" asChild className="flex-1">
                            <a href={`mailto:${selectedMission.service_provider.email}`}>
                              <Mail className="w-3.5 h-3.5 mr-1" /> Email
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Aucun prestataire assigné</p>
                  )}
                </div>

                {/* Photos */}
                {selectedMission.photos && selectedMission.photos.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">📸 Photos ({selectedMission.photos.length})</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedMission.photos.map(p => (
                        <div key={p.id} className="aspect-square rounded-lg overflow-hidden border">
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={() => { setSelectedMission(null); navigate('/dashboard/interventions'); }} variant="outline" className="w-full">
                  Voir dans Interventions <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── New Mission Detail Drawer ──── */}
      <Sheet open={!!selectedNewMission} onOpenChange={open => { if (!open) setSelectedNewMission(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-auto">
          {selectedNewMission && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedNewMission.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedNewMission.property?.name}</span>
                  </div>
                  {selectedNewMission.property?.address && (
                    <p className="text-sm text-muted-foreground ml-6">{selectedNewMission.property.address}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(selectedNewMission.start_at), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedNewMission.payout_amount}€</span>
                  </div>
                  <Badge variant="secondary">
                    {selectedNewMission.status === 'assigned' ? 'Assignée' : selectedNewMission.status === 'confirmed' ? 'Confirmée' : selectedNewMission.status === 'done' ? 'Terminée' : selectedNewMission.status}
                  </Badge>
                </div>

                {selectedNewMission.instructions && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Instructions :</p>
                    <p className="whitespace-pre-wrap">{selectedNewMission.instructions}</p>
                  </div>
                )}

                {/* Provider section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="w-4 h-4" /> Prestataire assigné
                  </h3>
                  {selectedNewMission.selected_provider ? (
                    <>
                      <p className="font-medium">
                        {selectedNewMission.selected_provider.first_name} {selectedNewMission.selected_provider.last_name}
                      </p>
                      {selectedNewMission.selected_provider.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm">{selectedNewMission.selected_provider.phone}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedNewMission.selected_provider!.phone!);
                              toast.success("Numéro copié");
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {selectedNewMission.selected_provider.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{selectedNewMission.selected_provider.email}</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {selectedNewMission.selected_provider.phone && (
                          <Button size="sm" asChild className="flex-1">
                            <a href={`tel:${selectedNewMission.selected_provider.phone}`}>
                              <Phone className="w-3.5 h-3.5 mr-1" /> Appeler
                            </a>
                          </Button>
                        )}
                        {selectedNewMission.selected_provider.email && (
                          <Button size="sm" variant="outline" asChild className="flex-1">
                            <a href={`mailto:${selectedNewMission.selected_provider.email}`}>
                              <Mail className="w-3.5 h-3.5 mr-1" /> Email
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Aucun prestataire assigné</p>
                  )}
                </div>

                <Button onClick={() => { setSelectedNewMission(null); navigate('/dashboard/missions'); }} variant="outline" className="w-full">
                  Voir dans Missions <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DashboardHome;
