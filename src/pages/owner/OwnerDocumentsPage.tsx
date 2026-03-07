import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { Loader2, FileText, Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const documentTypes: Record<string, string> = {
  id_card: "Carte d'identité",
  passport: "Passeport",
  proof_of_address: "Justificatif de domicile",
  insurance: "Attestation d'assurance",
  rib: "RIB / IBAN",
  kbis: "Extrait KBIS",
  lease: "Bail / Contrat",
  diagnostic: "Diagnostic",
  other: "Autre",
};

interface Document {
  id: string;
  name: string;
  type: string;
  file_url: string;
  uploaded_at: string;
}

export default function OwnerDocumentsPage() {
  const { ownerId, conciergeUserId } = useIsOwner();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState("other");
  const [docName, setDocName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load owner's property IDs
  useEffect(() => {
    if (!ownerId) return;
    (async () => {
      const { data: links } = await (supabase as any)
        .from("owner_properties").select("property_id").eq("owner_id", ownerId);
      setPropertyIds((links || []).map((l: any) => l.property_id));
    })();
  }, [ownerId]);

  const loadDocs = async () => {
    if (!ownerId) return;
    const { data } = await (supabase as any)
      .from("owner_documents")
      .select("id, name, type, file_url, uploaded_at")
      .eq("owner_id", ownerId)
      .order("uploaded_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, [ownerId]);

  const handleUpload = async () => {
    if (!file || !ownerId || !conciergeUserId) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    // Use concierge user_id scope in path for tenant isolation
    const path = `${conciergeUserId}/${ownerId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("owner-documents").upload(path, file);

    if (uploadErr) {
      toast.error("Erreur d'upload: " + uploadErr.message);
      setUploading(false);
      return;
    }

    // Store the file path (not public URL) — bucket is private, we'll use signed URLs
    const { error: dbErr } = await (supabase as any)
      .from("owner_documents").insert({
        owner_id: ownerId,
        concierge_user_id: conciergeUserId,
        property_id: propertyIds[0] || null,
        name: docName.trim() || file.name,
        type: docType,
        file_url: path,
      });

    if (dbErr) {
      toast.error("Erreur: " + dbErr.message);
    } else {
      toast.success("Document ajouté");
      setUploadOpen(false);
      setDocType("other"); setDocName(""); setFile(null);
      loadDocs();
    }
    setUploading(false);
  };

  const handleDelete = async (doc: Document) => {
    const { error } = await (supabase as any)
      .from("owner_documents").delete().eq("id", doc.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Document supprimé");
    loadDocs();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">Vos documents personnels et partagés</p>
          </div>
          <Button onClick={() => setUploadOpen(true)}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold gap-2">
            <Upload className="h-4 w-4" />
            Ajouter un document
          </Button>
        </div>
      </motion.div>

      {documents.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun document</h3>
            <p className="text-muted-foreground">Ajoutez vos documents pour les partager avec votre conciergerie.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {documentTypes[doc.type] || doc.type} • {new Date(doc.uploaded_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                    <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={async () => {
                      const { data, error } = await supabase.storage.from("owner-documents").createSignedUrl(doc.file_url, 300);
                      if (error || !data?.signedUrl) { toast.error("Impossible d'ouvrir le fichier : " + (error?.message || "URL introuvable")); return; }
                      window.open(data.signedUrl, "_blank");
                    }}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(doc)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de document</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom du document (optionnel)</Label>
              <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Ex: CNI recto-verso" />
            </div>
            <div>
              <Label>Fichier</Label>
              <div className="relative mt-1">
                <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{file ? file.name : "Choisir un fichier"}</span>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button>
            <Button onClick={handleUpload} disabled={!file || uploading}
              className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
