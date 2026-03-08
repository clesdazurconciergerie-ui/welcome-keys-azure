import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageCircle, Send, Clock, CheckCircle, Filter, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const categoryLabels: Record<string, string> = {
  maintenance: "Maintenance", question: "Question", admin: "Administratif", other: "Autre",
};

interface OwnerRequest {
  id: string;
  title: string | null;
  category: string;
  status: string;
  created_at: string;
  property_id: string | null;
  owner: { first_name: string; last_name: string } | null;
  property: { name: string } | null;
}

interface Message {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export default function OwnerRequestsAdminPage() {
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [threadOpen, setThreadOpen] = useState<OwnerRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OwnerRequest | null>(null);

  const loadRequests = async () => {
    const { data } = await (supabase as any)
      .from("owner_requests")
      .select("id, title, category, status, created_at, property_id, owner:owner_id(first_name, last_name), property:property_id(name)")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, []);

  const filtered = requests.filter(r => statusFilter === "all" || r.status === statusFilter);

  const openThread = async (req: OwnerRequest) => {
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
      sender_role: "concierge",
      message: reply.trim(),
    });
    setReply("");
    setSubmitting(false);
    const { data } = await (supabase as any)
      .from("owner_request_messages").select("id, sender_role, message, created_at")
      .eq("request_id", threadOpen.id).order("created_at", { ascending: true });
    setMessages(data || []);
    toast.success("Réponse envoyée");
  };

  const toggleStatus = async (req: OwnerRequest) => {
    const newStatus = req.status === "open" ? "closed" : "open";
    await (supabase as any).from("owner_requests").update({ status: newStatus }).eq("id", req.id);
    toast.success(newStatus === "closed" ? "Demande fermée" : "Demande réouverte");
    loadRequests();
    if (threadOpen?.id === req.id) setThreadOpen({ ...req, status: newStatus });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const openCount = requests.filter(r => r.status === "open").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Demandes propriétaires
              {openCount > 0 && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">{openCount} ouverte{openCount > 1 ? "s" : ""}</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gérez les demandes de vos propriétaires</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><Filter className="w-3.5 h-3.5 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="open">Ouvertes</SelectItem>
              <SelectItem value="closed">Fermées</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Aucune demande</h3>
            <p className="text-sm text-muted-foreground">Les demandes de vos propriétaires apparaîtront ici.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => (
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
                        {r.owner ? `${r.owner.first_name} ${r.owner.last_name}` : "Propriétaire"}
                        {r.property ? ` • ${r.property.name}` : ""}
                        {" • "}{categoryLabels[r.category]}
                        {" • "}{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
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

      {/* Thread dialog */}
      <Dialog open={!!threadOpen} onOpenChange={() => setThreadOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span>{threadOpen?.title || categoryLabels[threadOpen?.category || ""] || "Demande"}</span>
                <Badge variant="outline" className={threadOpen?.status === "open" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}>
                  {threadOpen?.status === "open" ? "Ouverte" : "Fermée"}
                </Badge>
              </div>
              {threadOpen && (
                <Button variant="outline" size="sm" onClick={() => toggleStatus(threadOpen)}>
                  {threadOpen.status === "open" ? "Fermer" : "Réouvrir"}
                </Button>
              )}
            </DialogTitle>
            {threadOpen && (
              <p className="text-xs text-muted-foreground">
                {threadOpen.owner ? `${threadOpen.owner.first_name} ${threadOpen.owner.last_name}` : ""}
                {threadOpen.property ? ` • ${threadOpen.property.name}` : ""}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[200px]">
            {msgLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> :
              messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === "concierge" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_role === "concierge" ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"}`}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{m.sender_role === "concierge" ? "Vous" : "Propriétaire"}</p>
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
          </div>
          {threadOpen?.status === "open" && (
            <div className="flex gap-2 pt-2 border-t">
              <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Votre réponse..." rows={2} className="flex-1" />
              <Button size="icon" onClick={sendReply} disabled={!reply.trim() || submitting} className="shrink-0 self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
