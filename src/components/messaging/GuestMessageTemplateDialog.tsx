// MODULE 1 — Voyageur Messaging Engine
// Dialog d'édition / création d'un template.

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Send, Eye, Variable } from "lucide-react";
import {
  type GuestMessageTemplate,
  type MessageTrigger,
  TRIGGER_LABELS,
  TRIGGER_DESCRIPTIONS,
  AVAILABLE_VARIABLES,
  sendTestMessage,
} from "@/hooks/useGuestMessages";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: GuestMessageTemplate | null;
  onSave: (payload: Partial<GuestMessageTemplate>) => void;
}

const TRIGGERS: MessageTrigger[] = [
  "booking_confirmed",
  "three_days_before",
  "day_before_arrival",
  "check_in_day",
  "mid_stay",
  "day_before_checkout",
  "one_day_after",
];

export function GuestMessageTemplateDialog({ open, onOpenChange, template, onSave }: Props) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<MessageTrigger>("three_days_before");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendAt, setSendAt] = useState("10:00");
  const [active, setActive] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setTrigger(template.trigger_type);
      setSubject(template.subject ?? "");
      setBody(template.body_markdown);
      setSendAt(template.send_at_time?.slice(0, 5) ?? "10:00");
      setActive(template.is_active);
    } else {
      setName("");
      setTrigger("three_days_before");
      setSubject("");
      setBody("");
      setSendAt("10:00");
      setActive(true);
    }
  }, [template, open]);

  // Pré-remplir l'email de test avec celui du concierge
  useEffect(() => {
    if (open && !testEmail) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setTestEmail(data.user.email);
      });
    }
  }, [open, testEmail]);

  const insertVariable = (key: string) => {
    setBody((prev) => prev + `{{${key}}}`);
  };

  const handleSubmit = () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Nom et corps de message obligatoires");
      return;
    }
    onSave({
      name: name.trim(),
      trigger_type: trigger,
      channel: "email",
      subject: subject.trim() || null,
      body_markdown: body,
      send_at_time: `${sendAt}:00`,
      is_active: active,
    });
    onOpenChange(false);
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Renseignez un email de test");
      return;
    }
    if (!body.trim()) {
      toast.error("Le corps du message est vide");
      return;
    }
    setSending(true);
    try {
      await sendTestMessage({
        subject: subject || null,
        body_markdown: body,
        recipient_email: testEmail.trim(),
      });
      toast.success(`Email de test envoyé à ${testEmail}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom du modèle</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: J-3 infos pratiques" />
            </div>
            <div>
              <Label htmlFor="trigger">Déclencheur</Label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as MessageTrigger)}>
                <SelectTrigger id="trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRIGGER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{TRIGGER_DESCRIPTIONS[trigger]}</p>
            </div>
            <div>
              <Label htmlFor="sendAt">Heure d'envoi</Label>
              <Input id="sendAt" type="time" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={active} onCheckedChange={setActive} id="active" />
              <Label htmlFor="active">Modèle actif</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Objet de l'email</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Bienvenue à {{property_name}}" />
          </div>

          <Tabs defaultValue="edit" className="w-full">
            <div className="flex items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="edit">Édition</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Aperçu
                </TabsTrigger>
              </TabsList>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Variable className="w-3.5 h-3.5 mr-1.5" />
                    Insérer une variable
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-80 overflow-y-auto bg-popover">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <DropdownMenuItem key={v.key} onClick={() => insertVariable(v.key)}>
                      <code className="text-xs text-accent mr-2">{`{{${v.key}}}`}</code>
                      <span className="text-xs text-muted-foreground">{v.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <TabsContent value="edit">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Bonjour {{guest_first_name}}..."
                rows={14}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Markdown supporté : **gras**, *italique*, `code`, listes (-), liens [texte](url), titres ##.
              </p>
            </TabsContent>
            <TabsContent value="preview">
              <div className="border border-border rounded-lg p-6 bg-muted/30 min-h-[300px] whitespace-pre-wrap text-sm">
                {body || <span className="text-muted-foreground">Le contenu apparaîtra ici…</span>}
              </div>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border border-border p-4 bg-muted/20">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-accent" />
              Envoyer un test à mon email
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Les variables seront remplies avec des données d'exemple (Sophie Martin, Villa Azur, etc.).
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="votre-email@domaine.com"
              />
              <Button onClick={handleTest} disabled={sending} variant="outline">
                {sending ? "Envoi…" : "Envoyer le test"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit}>
            <Plus className="w-4 h-4 mr-2" />
            {template ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
