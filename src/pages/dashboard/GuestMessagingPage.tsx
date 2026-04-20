// MODULE 1 — Voyageur Messaging Engine
// Page principale : 3 onglets (Templates, Historique, Bibliothèque).

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MessageCircle, Mail, Trash2, Pencil, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import {
  useGuestMessageTemplates,
  useGuestScheduledMessages,
  TRIGGER_LABELS,
  type GuestMessageTemplate,
  type MessageStatus,
} from "@/hooks/useGuestMessages";
import { GuestMessageTemplateDialog } from "@/components/messaging/GuestMessageTemplateDialog";
import { LIBRARY_TEMPLATES } from "@/lib/guest-message-library";
import { toast } from "sonner";

const STATUS_LABELS: Record<MessageStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  sent: { label: "Envoyé", cls: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30", icon: CheckCircle2 },
  pending: { label: "En attente", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: Clock },
  failed: { label: "Échec", cls: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  cancelled: { label: "Annulé", cls: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

export default function GuestMessagingPage() {
  const { templates, isLoading, create, update, remove, toggleActive } = useGuestMessageTemplates();
  const { data: history = [] } = useGuestScheduledMessages({ limit: 100 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GuestMessageTemplate | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (t: GuestMessageTemplate) => { setEditing(t); setDialogOpen(true); };

  const handleSave = (payload: Partial<GuestMessageTemplate>) => {
    if (editing) update({ id: editing.id, ...payload });
    else create(payload);
  };

  const handleDelete = (t: GuestMessageTemplate) => {
    if (confirm(`Supprimer le modèle "${t.name}" ?`)) remove(t.id);
  };

  const handleAddFromLibrary = (libIdx: number) => {
    const lib = LIBRARY_TEMPLATES[libIdx];
    create({
      name: lib.name,
      trigger_type: lib.trigger_type,
      channel: "email",
      subject: lib.subject,
      body_markdown: lib.body_markdown,
      send_at_time: `${lib.send_at_time}:00`,
      is_active: true,
    });
  };

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
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Mes modèles ({templates.length})</TabsTrigger>
          <TabsTrigger value="history">Historique ({history.length})</TabsTrigger>
          <TabsTrigger value="library">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Bibliothèque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : templates.length === 0 ? (
            <Card className="p-12 text-center rounded-xl border-border">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-foreground">Aucun modèle pour le moment</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Créez votre premier modèle ou activez-en un depuis la bibliothèque.
              </p>
              <Button onClick={openNew} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Créer un modèle
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <Card
                  key={t.id}
                  className="p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-foreground line-clamp-2">{t.name}</h3>
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(v) => toggleActive({ id: t.id, is_active: v })}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className="text-xs">{TRIGGER_LABELS[t.trigger_type]}</Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t.send_at_time?.slice(0, 5)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                    {t.body_markdown.slice(0, 150)}…
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)} className="flex-1">
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Modifier
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(t)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {history.length === 0 ? (
            <Card className="p-12 text-center rounded-xl border-border">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucun message programmé pour le moment.
              </p>
            </Card>
          ) : (
            <Card className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Déclencheur</TableHead>
                    <TableHead>Programmé</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((m) => {
                    const s = STATUS_LABELS[m.status];
                    const Icon = s.icon;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{m.recipient_email ?? "—"}</TableCell>
                        <TableCell className="text-xs">{TRIGGER_LABELS[m.trigger_type]}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(m.scheduled_at).toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${s.cls}`}>
                            <Icon className="w-3 h-3" />
                            {s.label}
                          </Badge>
                          {m.error_message && (
                            <p className="text-xs text-destructive mt-1 line-clamp-1">{m.error_message}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <p className="text-sm text-muted-foreground mb-4">
            6 modèles français pré-rédigés, prêts à activer. Vous pourrez les personnaliser ensuite.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIBRARY_TEMPLATES.map((lib, idx) => (
              <Card
                key={idx}
                className="p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
              >
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <h3 className="font-semibold text-foreground">{lib.name}</h3>
                </div>
                <Badge variant="outline" className="text-xs mb-3">{TRIGGER_LABELS[lib.trigger_type]}</Badge>
                <p className="text-xs text-muted-foreground line-clamp-4 mb-4">
                  {lib.body_markdown.slice(0, 200)}…
                </p>
                <Button size="sm" variant="outline" onClick={() => handleAddFromLibrary(idx)} className="w-full">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Activer ce modèle
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <GuestMessageTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editing}
        onSave={handleSave}
      />
    </div>
  );
}
