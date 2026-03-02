import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, MessageSquarePlus, MessageCircle, Send, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const categoryLabels: Record<string, string> = {
  maintenance: "Maintenance", question: "Question", admin: "Administratif", other: "Autre",
};

interface Request {
  id: string;
  title: string | null;
  category: string;
  status: string;
  created_at: string;
  property_id: string | null;
}

interface Message {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export default function OwnerRequestsPage() {
  const { ownerId, conciergeUserId } = useIsOwner();
  const [requests, setRequests] = useState<Request[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState<Request | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  // Form state
  const [category, setCategory] = useState("other");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    const load = async () => {
      const { data: links } = await (supabase as any)
        .from("owner_properties").select("property_id").eq("owner_id", ownerId);
      const ids = (links || []).map((l: any) => l.property_id);
      if (ids.length > 0) {
        const { data } = await (supabase as any)
          .from("properties").select("id, name").in("id", ids);
        setProperties(data || []);
      }

      const { data: reqs } = await (supabase as any)
        .from("owner_requests").select("id, title, category, status, created_at, property_id")
        .eq("owner_id", ownerId).order("created_at", { ascending: false });
      setRequests(reqs || []);
      setLoading(false);
    };
    load();
  }, [ownerId]);

  const handleSubmit = async () => {
    if (!message.trim() || !ownerId || !conciergeUserId) return;
    setSubmitting(true);
    const { data, error } = await (supabase as any)
      .from("owner_requests").insert({
        owner_id: ownerId,
        user_id: conciergeUserId,
        category,
        title: title.trim() || null,
        property_id: propertyId || null,
        status: "open",
      }).select("id").single();

    if (error) { toast.error("Erreur lors de la création"); setSubmitting(false); return; }

    await (supabase as any).from("owner_request_messages").insert({
      request_id: data.id,
      sender_role: "owner",
      message: message.trim(),
    });

    toast.success("Demande envoyée");
    setNewOpen(false);
    setTitle(""); setMessage(""); setCategory("other"); setPropertyId("");
    setSubmitting(false);
    // Refresh
    const { data: reqs } = await (supabase as any)
      .from("owner_requests").select("id, title, category, status, created_at, property_id")
      .eq("owner_id", ownerId).order("created_at", { ascending: false });
    setRequests(reqs || []);
  };

  const openThread = async (req: Request) => {
    setThreadOpen(req);
    setMsgLoading(true);
    const { data } = await (supabase as any)
      .from("owner_request_messages").select("id, sender_role, message, created_at")
      .eq("request_id", req.id).order("created_at", { ascending: true });
    setMessages(data || []);
    setMsgLoading(false);
  };

  const sendReply = async () => {
    if (!reply.trim() || !threadOpen) return;
    setSubmitting(true);
    await (supabase as any).from("owner_request_messages").insert({
      request_id: threadOpen.id,
      sender_role: "owner",
      message: reply.trim(),
    });
    setReply("");
    setSubmitting(false);
    const { data } = await (supabase as any)
      .from("owner_request_messages").select("id, sender_role, message, created_at")
      .eq("request_id", threadOpen.id).order("created_at", { ascending: true });
    setMessages(data || []);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mes demandes</h1>
            <p className="text-muted-foreground mt-1">Communiquez avec votre conciergerie</p>
          </div>
          <Button onClick={() => setNewOpen(true)} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        </div>
      </motion.div>

      {requests.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucune demande</h3>
            <p className="text-muted-foreground">Créez une demande pour contacter votre conciergerie.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => openThread(r)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.status === "open" ? "bg-blue-100" : "bg-emerald-100"}`}>
                      {r.status === "open" ? <Clock className="w-4 h-4 text-blue-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.title || categoryLabels[r.category] || "Demande"}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabels[r.category]} • {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={r.status === "open" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                    {r.status === "open" ? "Ouverte" : "Fermée"}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* New request dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle demande</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {properties.length > 0 && (
              <div>
                <Label>Bien concerné (optionnel)</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Objet (optionnel)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Fuite robinet salle de bain" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez votre demande..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!message.trim() || submitting}
              className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Thread dialog */}
      <Dialog open={!!threadOpen} onOpenChange={() => setThreadOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{threadOpen?.title || categoryLabels[threadOpen?.category || ""] || "Demande"}</span>
              <Badge variant="outline" className={threadOpen?.status === "open" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}>
                {threadOpen?.status === "open" ? "Ouverte" : "Fermée"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[200px]">
            {msgLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> :
              messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === "owner" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_role === "owner" ? "bg-[hsl(var(--gold))]/10 text-foreground" : "bg-muted text-foreground"}`}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{m.sender_role === "owner" ? "Vous" : "Conciergerie"}</p>
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
          </div>
          {threadOpen?.status === "open" && (
            <div className="flex gap-2 pt-2 border-t">
              <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Votre réponse..." rows={2} className="flex-1" />
              <Button size="icon" onClick={sendReply} disabled={!reply.trim() || submitting}
                className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] shrink-0 self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
