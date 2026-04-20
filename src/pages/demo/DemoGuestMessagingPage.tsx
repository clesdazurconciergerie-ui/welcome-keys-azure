// MODULE 1 — Voyageur Messaging Engine (DEMO mock)

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Mail, Plus, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { LIBRARY_TEMPLATES } from "@/lib/guest-message-library";
import { TRIGGER_LABELS } from "@/hooks/useGuestMessages";
import { toast } from "sonner";

const MOCK_TEMPLATES = LIBRARY_TEMPLATES.slice(0, 4).map((t, i) => ({ ...t, id: `demo-${i}`, is_active: i < 3 }));

const MOCK_HISTORY = [
  { id: "1", recipient: "sophie.martin@email.com", trigger: "three_days_before" as const, scheduled: "12/06/2026 10:00", status: "sent" as const },
  { id: "2", recipient: "lucas.dubois@email.com", trigger: "day_before_arrival" as const, scheduled: "14/06/2026 11:00", status: "sent" as const },
  { id: "3", recipient: "marie.bernard@email.com", trigger: "check_in_day" as const, scheduled: "20/04/2026 15:30", status: "pending" as const },
];

export default function DemoGuestMessagingPage() {
  const notify = () => toast.info("Mode démo — création désactivée. Inscrivez-vous pour activer cette fonctionnalité.");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Messages voyageurs</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Automatisez vos communications pré-séjour, pendant le séjour et post-départ.
          </p>
        </div>
        <Button onClick={notify} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Mes modèles ({MOCK_TEMPLATES.length})</TabsTrigger>
          <TabsTrigger value="history">Historique ({MOCK_HISTORY.length})</TabsTrigger>
          <TabsTrigger value="library">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Bibliothèque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_TEMPLATES.map((t) => (
              <Card key={t.id} className="p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent/30 transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-foreground line-clamp-2">{t.name}</h3>
                  <Switch checked={t.is_active} onCheckedChange={notify} />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className="text-xs">{TRIGGER_LABELS[t.trigger_type]}</Badge>
                  <Badge variant="outline" className="text-xs gap-1"><Mail className="w-3 h-3" />Email</Badge>
                  <Badge variant="outline" className="text-xs">{t.send_at_time}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{t.body_markdown.slice(0, 150)}…</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="rounded-xl border border-border p-6">
            <div className="space-y-3">
              {MOCK_HISTORY.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.recipient}</p>
                    <p className="text-xs text-muted-foreground">{TRIGGER_LABELS[m.trigger]} • {m.scheduled}</p>
                  </div>
                  <Badge variant="outline" className={m.status === "sent"
                    ? "bg-green-500/10 text-green-700 border-green-500/30"
                    : "bg-amber-500/10 text-amber-700 border-amber-500/30"}>
                    {m.status === "sent" ? <><CheckCircle2 className="w-3 h-3 mr-1" />Envoyé</> : <><Clock className="w-3 h-3 mr-1" />En attente</>}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <p className="text-sm text-muted-foreground mb-4">6 modèles français pré-rédigés, prêts à activer.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIBRARY_TEMPLATES.map((lib, idx) => (
              <Card key={idx} className="p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent/30 transition-all">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <h3 className="font-semibold text-foreground">{lib.name}</h3>
                </div>
                <Badge variant="outline" className="text-xs mb-3">{TRIGGER_LABELS[lib.trigger_type]}</Badge>
                <p className="text-xs text-muted-foreground line-clamp-4 mb-4">{lib.body_markdown.slice(0, 200)}…</p>
                <Button size="sm" variant="outline" onClick={notify} className="w-full">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Activer ce modèle
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
