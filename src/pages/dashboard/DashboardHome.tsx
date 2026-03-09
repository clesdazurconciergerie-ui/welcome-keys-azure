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
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { UpcomingOperations } from "@/components/dashboard/UpcomingOperations";
import { startOfMonth, endOfMonth } from "date-fns";

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
  const { showWizard, dismissWizard, progress, completionPercent, isFullyComplete } = useOnboarding();

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
    <div className="space-y-6 max-w-6xl">
      <OnboardingWizard open={showWizard} onClose={dismissWizard} />
      <SubscriptionAlert />
      <DemoExpirationBanner />

      {!isFullyComplete && (
        <OnboardingProgress
          progress={progress}
          completionPercent={completionPercent}
          isFullyComplete={isFullyComplete}
        />
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-lg">
          Bonjour <span className="font-semibold text-foreground">{userName}</span> 👋
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">Tableau de bord</h1>
      </motion.div>

      {/* SECTION 1 — OPERATIONS */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          Opérations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/interventions')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Missions aujourd'hui</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{todayMissions.length}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200" onClick={() => navigate('/dashboard/interventions')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">À valider</span>
                  {pendingValidation.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <p className="text-3xl font-bold text-foreground">{pendingValidation.length}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/finances')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Paiements du mois</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{totalPaid}€</p>
                <p className="text-sm text-amber-600 mt-1">{totalToPay}€ à payer</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/prestataires')}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Prestataires actifs</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{activeProviders}</p>
                <p className="text-xs text-muted-foreground mt-1">aujourd'hui</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* SECTION 2 — ACTIVITÉ */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-[hsl(var(--gold))] rounded-full" />
          Activité
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/logements')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Home className="w-5 h-5 text-emerald-600" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">—</p>
                <p className="text-sm text-muted-foreground">Logements</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/proprietaires')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[hsl(var(--gold))]" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">—</p>
                <p className="text-sm text-muted-foreground">Propriétaires</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/prestataires')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-violet-600" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">—</p>
                <p className="text-sm text-muted-foreground">Prestataires</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* SECTION 3 — PERFORMANCE */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-blue-500 rounded-full" />
          Performance
        </h2>
        <PerformanceOverview
          startDate={startOfMonth(now).toISOString().slice(0, 10)}
          endDate={endOfMonth(now).toISOString().slice(0, 10)}
        />
      </div>

      {/* Upcoming Operations */}
      <UpcomingOperations />

      {/* Global Calendar */}
      <GlobalCalendar />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Actions rapides</h2>
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
