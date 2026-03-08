import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, Home, Briefcase, ClipboardCheck,
  BookOpen, Euro, LogOut, ArrowRight, Calendar, Users,
  CheckCircle, Clock, AlertTriangle, TrendingUp, FileText, Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DemoDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignup: () => void;
}

const TABS = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "logements", label: "Logements", icon: Home },
  { id: "missions", label: "Missions", icon: Briefcase },
  { id: "inspections", label: "États des lieux", icon: ClipboardCheck },
  { id: "livrets", label: "Livrets", icon: BookOpen },
  { id: "finance", label: "Finance", icon: Euro },
];

export function DemoDashboard({ activeTab, onTabChange, onSignup }: DemoDashboardProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/brand/logo-wlekom-icon.png" alt="MyWelkom" className="h-7" />
          <Badge variant="outline" className="text-accent border-accent/30 text-[10px]">
            Démo
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onSignup} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary text-xs font-semibold">
            Créer mon compte
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-4 sm:px-6 overflow-x-auto sticky top-14 z-40">
        <div className="flex gap-1 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {activeTab === "dashboard" && <DemoDashboardTab />}
        {activeTab === "logements" && <DemoLogementsTab />}
        {activeTab === "missions" && <DemoMissionsTab />}
        {activeTab === "inspections" && <DemoInspectionsTab />}
        {activeTab === "livrets" && <DemoLivretsTab />}
        {activeTab === "finance" && <DemoFinanceTab />}
      </main>
    </div>
  );
}

/* ─── Dashboard Tab ─── */
function DemoDashboardTab() {
  const kpis = [
    { label: "Missions aujourd'hui", value: "4", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Logements actifs", value: "12", icon: Home, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "En validation", value: "2", icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Revenus ce mois", value: "3 240 €", icon: Euro, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, Marie 👋</h1>
        <p className="text-muted-foreground text-sm">Voici votre activité du jour.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpi.bg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Missions du jour
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Ménage — Villa Émeraude", time: "10:00", status: "En cours", statusColor: "bg-blue-100 text-blue-700" },
              { name: "Check-in — Appt Riviera", time: "14:00", status: "Planifié", statusColor: "bg-muted text-muted-foreground" },
              { name: "Ménage — Studio Mimosa", time: "16:00", status: "Planifié", statusColor: "bg-muted text-muted-foreground" },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.time}</p>
                </div>
                <Badge variant="secondary" className={m.statusColor}>{m.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Prochaines réservations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { guest: "Jean Dupont", property: "Villa Émeraude", dates: "12 — 18 mars" },
              { guest: "Sarah Martin", property: "Appt Riviera", dates: "14 — 17 mars" },
              { guest: "Famille Garcia", property: "Studio Mimosa", dates: "15 — 22 mars" },
            ].map((r) => (
              <div key={r.guest} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.guest}</p>
                  <p className="text-xs text-muted-foreground">{r.property} · {r.dates}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Logements Tab ─── */
function DemoLogementsTab() {
  const properties = [
    { name: "Villa Émeraude", address: "12 Chemin des Oliviers, Nice", rooms: 4, status: "Occupé" },
    { name: "Appt Riviera", address: "8 Promenade des Anglais, Nice", rooms: 2, status: "Libre" },
    { name: "Studio Mimosa", address: "5 Rue du Mimosa, Cannes", rooms: 1, status: "Occupé" },
    { name: "Mas Provençal", address: "Route de Grasse, Mougins", rooms: 5, status: "Libre" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logements</h1>
          <p className="text-sm text-muted-foreground">Gérez vos biens et leurs paramètres.</p>
        </div>
        <DemoButton label="Ajouter un logement" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p) => (
          <Card key={p.name} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <Badge variant={p.status === "Occupé" ? "default" : "secondary"} className={p.status === "Occupé" ? "bg-emerald-100 text-emerald-700 border-0" : ""}>
                  {p.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{p.address}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.rooms} pièces</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Missions Tab ─── */
function DemoMissionsTab() {
  const missions = [
    { title: "Ménage (check-out) — Villa Émeraude", provider: "Sophie D.", date: "8 mars 10:00", status: "in_progress", statusLabel: "En cours" },
    { title: "Check-in — Appt Riviera", provider: "Julien M.", date: "8 mars 14:00", status: "draft", statusLabel: "Planifié" },
    { title: "Ménage — Studio Mimosa", provider: "Marie L.", date: "8 mars 16:00", status: "draft", statusLabel: "Planifié" },
    { title: "Intervention plomberie — Mas Provençal", provider: "Thomas R.", date: "9 mars 09:00", status: "confirmed", statusLabel: "Confirmé" },
    { title: "Ménage (check-out) — Appt Riviera", provider: "Sophie D.", date: "10 mars 10:00", status: "open", statusLabel: "Ouvert" },
  ];

  const statusColors: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-700",
    draft: "bg-muted text-muted-foreground",
    confirmed: "bg-emerald-100 text-emerald-700",
    open: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Missions</h1>
          <p className="text-sm text-muted-foreground">Planification et suivi des interventions.</p>
        </div>
        <DemoButton label="Créer une mission" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {missions.map((m) => (
              <div key={m.title} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.provider} · {m.date}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={statusColors[m.status]}>{m.statusLabel}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Inspections Tab ─── */
function DemoInspectionsTab() {
  const inspections = [
    { property: "Villa Émeraude", type: "Entrée", date: "5 mars 2026", guest: "Jean Dupont", status: "Complété" },
    { property: "Appt Riviera", type: "Sortie", date: "7 mars 2026", guest: "Alain Bernard", status: "En attente" },
    { property: "Studio Mimosa", type: "Entrée", date: "8 mars 2026", guest: "Famille Garcia", status: "Brouillon" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">États des lieux</h1>
          <p className="text-sm text-muted-foreground">Entrées, sorties et inspections documentées.</p>
        </div>
        <DemoButton label="Nouvel état des lieux" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {inspections.map((insp) => (
          <Card key={insp.property + insp.type} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{insp.type}</Badge>
                <Badge variant="secondary" className={
                  insp.status === "Complété" ? "bg-emerald-100 text-emerald-700 border-0" :
                  insp.status === "En attente" ? "bg-amber-100 text-amber-700 border-0" :
                  ""
                }>{insp.status}</Badge>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{insp.property}</h3>
                <p className="text-xs text-muted-foreground mt-1">Voyageur : {insp.guest}</p>
                <p className="text-xs text-muted-foreground">{insp.date}</p>
              </div>
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Livrets Tab ─── */
function DemoLivretsTab() {
  const booklets = [
    { name: "Livret Villa Émeraude", views: 34, status: "Publié", code: "VILL-EM23" },
    { name: "Livret Appt Riviera", views: 12, status: "Publié", code: "APPT-RV08" },
    { name: "Livret Studio Mimosa", views: 0, status: "Brouillon", code: "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Livrets d'accueil</h1>
          <p className="text-sm text-muted-foreground">Livrets digitaux personnalisés pour vos voyageurs.</p>
        </div>
        <DemoButton label="Créer un livret" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {booklets.map((b) => (
          <Card key={b.name} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-accent" />
                </div>
                <Badge variant={b.status === "Publié" ? "default" : "secondary"} className={b.status === "Publié" ? "bg-emerald-100 text-emerald-700 border-0" : ""}>
                  {b.status}
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{b.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{b.views} vues · Code : {b.code}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Finance Tab ─── */
function DemoFinanceTab() {
  const kpis = [
    { label: "Revenus du mois", value: "8 420 €", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Dépenses", value: "2 180 €", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Factures en attente", value: "3", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Paiements prestataires", value: "1 450 €", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground">Vue consolidée de vos revenus et dépenses.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpi.bg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dernières transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { desc: "Commission — Villa Émeraude (J. Dupont)", amount: "+680 €", color: "text-emerald-600" },
            { desc: "Ménage — Sophie D.", amount: "-85 €", color: "text-red-600" },
            { desc: "Commission — Appt Riviera (S. Martin)", amount: "+420 €", color: "text-emerald-600" },
            { desc: "Intervention plomberie — Thomas R.", amount: "-120 €", color: "text-red-600" },
          ].map((t) => (
            <div key={t.desc} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <p className="text-sm text-foreground truncate">{t.desc}</p>
              <span className={cn("text-sm font-semibold whitespace-nowrap ml-3", t.color)}>{t.amount}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Demo Button (disabled action) ─── */
function DemoButton({ label }: { label: string }) {
  return (
    <Button
      size="sm"
      className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold opacity-90"
      onClick={(e) => {
        e.preventDefault();
        // No action in demo
      }}
    >
      {label}
    </Button>
  );
}
