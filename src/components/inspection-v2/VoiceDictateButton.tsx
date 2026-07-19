// MODULE — Bouton flottant de dictée vocale pour état des lieux
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  items: Array<{ id: string; room_name: string; item_name: string }>;
  onApply: (updates: Array<{ item_id: string; condition: string; notes: string }>) => void;
}

export function VoiceDictateButton({ items, onApply }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<{
    transcript: string;
    updates: Array<{ item_id: string; condition: string; notes: string }>;
  } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 1000) {
          toast.error("Enregistrement trop court");
          return;
        }
        await transcribe(blob);
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast.error("Microphone inaccessible : " + (e.message ?? "vérifie les permissions"));
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
    setProcessing(true);
  };

  const transcribe = async (blob: Blob) => {
    try {
      const form = new FormData();
      form.append("file", blob, "dictate.webm");
      form.append("items", JSON.stringify(items.map((i) => ({ id: i.id, room_name: i.room_name, item_name: i.item_name }))));

      const { data, error } = await supabase.functions.invoke("transcribe-inspection-voice", {
        body: form,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPreview({ transcript: data.transcript ?? "", updates: data.updates ?? [] });
    } catch (e: any) {
      toast.error("Transcription échouée : " + (e.message ?? "erreur"));
    } finally {
      setProcessing(false);
    }
  };

  const apply = () => {
    if (preview) onApply(preview.updates);
    setPreview(null);
    toast.success(`${preview?.updates.length ?? 0} item(s) mis à jour`);
  };

  return (
    <>
      <Button
        size="lg"
        onClick={recording ? stop : start}
        disabled={processing}
        className="fixed bottom-6 right-6 h-16 w-16 shadow-lg z-40"
        variant={recording ? "destructive" : "default"}
        aria-label="Dictée vocale"
      >
        {processing ? <Loader2 className="h-6 w-6 animate-spin" /> :
          recording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </Button>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dictée reconnue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Transcription</p>
              <p className="text-sm p-3 bg-muted/50 whitespace-pre-wrap">{preview?.transcript}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Modifications proposées ({preview?.updates.length ?? 0})
              </p>
              {preview?.updates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun item identifié — reformule.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {preview?.updates.map((u, i) => {
                    const it = items.find((x) => x.id === u.item_id);
                    return (
                      <li key={i} className="border p-2 text-sm">
                        <strong>{it?.room_name} · {it?.item_name}</strong>
                        {" → "}<span className="uppercase">{u.condition}</span>
                        {u.notes && <p className="text-xs text-muted-foreground mt-0.5">{u.notes}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Annuler</Button>
            <Button onClick={apply} disabled={!preview || preview.updates.length === 0}>
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
