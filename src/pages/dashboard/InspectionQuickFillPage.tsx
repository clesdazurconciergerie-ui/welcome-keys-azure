// MODULE — Page mobile-first pour remplir un état des lieux ultra-rapidement
import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Check, AlertTriangle, X, Camera, ChevronDown, ChevronRight,
  Sparkles, Send, Loader2,
} from "lucide-react";
import { useInspectionDetail, type InspectionItem } from "@/hooks/usePropertyInspections";
import { useCleaningPhotosForInspection } from "@/hooks/useCleaningPhotosForInspection";
import { VoiceDictateButton } from "@/components/inspection-v2/VoiceDictateButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

const STATE_MAP: Record<string, { label: string; color: string }> = {
  good: { label: "OK", color: "text-emerald-700" },
  damaged: { label: "Défaut", color: "text-amber-700" },
  broken: { label: "Cassé", color: "text-rose-700" },
};

export default function InspectionQuickFillPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { inspection, items, updateItem, uploadPhoto, updateInspection } = useInspectionDetail(id);
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  const insp = inspection.data;

  const cleaning = useCleaningPhotosForInspection(insp?.property_id, insp?.official_date);

  const grouped = useMemo(() => {
    return (items.data ?? []).reduce<Record<string, InspectionItem[]>>((acc, it) => {
      (acc[it.room_name] ||= []).push(it);
      return acc;
    }, {});
  }, [items.data]);

  const rooms = Object.keys(grouped);
  const totalItems = items.data?.length ?? 0;
  const filledItems = (items.data ?? []).filter((i) => i.condition !== "good" || i.notes).length
    + (items.data ?? []).filter((i) => i.condition === "good").length;
  const percent = totalItems ? Math.round((filledItems / totalItems) * 100) : 0;

  if (inspection.isLoading || items.isLoading) {
    return <div className="p-4 space-y-3"><Skeleton className="h-12" /><Skeleton className="h-64" /></div>;
  }
  if (!insp) return <p className="p-6 text-muted-foreground">Introuvable</p>;

  const applyVoiceUpdates = (updates: Array<{ item_id: string; condition: string; notes: string }>) => {
    updates.forEach((u) => {
      updateItem.mutate({
        itemId: u.item_id,
        patch: { condition: u.condition, notes: u.notes || null } as any,
      });
    });
  };

  const goToDetail = () => navigate(`/dashboard/etats-des-lieux/${id}`);

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEOHead title="Remplir l'état des lieux" description="" />

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="icon" onClick={goToDetail}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {insp.inspection_type === "entry" ? "État d'entrée" : "État de sortie"}
            </p>
            <h1 className="text-sm font-semibold truncate">{insp.property?.name}</h1>
          </div>
          <Badge variant="outline" className="text-xs">{percent}%</Badge>
        </div>
        <Progress value={percent} className="h-1 rounded-none" />
      </header>

      {/* Photos ménage héritées */}
      {cleaning.data && cleaning.data.photos.length > 0 && (
        <section className="p-3 border-b border-border bg-muted/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {cleaning.data.photos.length} photos du dernier ménage
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
            {cleaning.data.photos.slice(0, 12).map((p) => (
              <img
                key={p.id}
                src={p.url}
                alt="Photo ménage"
                className="h-20 w-20 object-cover shrink-0 snap-start border border-border"
              />
            ))}
          </div>
        </section>
      )}

      {/* Rooms accordion */}
      <div className="divide-y divide-border">
        {rooms.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucun item — <Button variant="link" onClick={goToDetail}>ouvrir la vue complète</Button>
          </div>
        )}
        {rooms.map((room) => {
          const list = grouped[room];
          const roomDone = list.filter((i) => i.condition !== "good" || i.notes).length + list.filter((i) => i.condition === "good").length;
          const isOpen = openRoom === room || openRoom === null;
          return (
            <div key={room}>
              <button
                onClick={() => setOpenRoom(isOpen ? "__none__" : room)}
                className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">{room}</span>
                </div>
                <span className="text-xs text-muted-foreground">{roomDone}/{list.length}</span>
              </button>
              {isOpen && (
                <ul className="pb-2">
                  {list.map((item) => (
                    <QuickItemRow
                      key={item.id}
                      item={item}
                      onUpdate={(patch) => updateItem.mutate({ itemId: item.id, patch })}
                      onAttachPhoto={(file) => uploadPhoto.mutate({ file, roomName: item.room_name, caption: item.item_name, itemId: item.id })}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes + compteurs bloc unique en bas */}
      <section className="p-4 space-y-3 border-t border-border mt-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Notes finales</p>
        <Textarea
          defaultValue={insp.notes ?? ""}
          placeholder="Remarques générales..."
          rows={3}
          onBlur={(e) => e.target.value !== (insp.notes ?? "") && updateInspection.mutate({ notes: e.target.value })}
        />
      </section>

      {/* Sticky action */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur p-3">
        <Button className="w-full h-12" size="lg" onClick={goToDetail}>
          <Send className="h-4 w-4 mr-2" />
          Continuer → signatures &amp; envoi
        </Button>
      </div>

      {/* Voice dictate */}
      <VoiceDictateButton
        items={(items.data ?? []).map((i) => ({ id: i.id, room_name: i.room_name, item_name: i.item_name }))}
        onApply={applyVoiceUpdates}
      />
    </div>
  );
}

function QuickItemRow({
  item, onUpdate, onAttachPhoto,
}: {
  item: InspectionItem;
  onUpdate: (patch: Partial<InspectionItem>) => void;
  onAttachPhoto: (file: File) => void;
}) {
  const [expanded, setExpanded] = useState(item.condition !== "good" || !!item.notes);
  const state = STATE_MAP[item.condition] ?? STATE_MAP.good;

  const set = (condition: string) => {
    onUpdate({ condition } as any);
    if (condition !== "good") setExpanded(true);
  };

  const inputId = `photo-${item.id}`;

  return (
    <li className="px-3 py-2 flex flex-col gap-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm">{item.item_name}</span>
        <span className={cn("text-[10px] uppercase tracking-wider font-semibold", state.color)}>
          {state.label}
        </span>
      </div>
      <div className="flex gap-2">
        <TouchButton active={item.condition === "good"} onClick={() => set("good")} variant="ok">
          <Check className="h-5 w-5" />
        </TouchButton>
        <TouchButton active={item.condition === "damaged"} onClick={() => set("damaged")} variant="warn">
          <AlertTriangle className="h-5 w-5" />
        </TouchButton>
        <TouchButton active={item.condition === "broken"} onClick={() => set("broken")} variant="bad">
          <X className="h-5 w-5" />
        </TouchButton>
        <label htmlFor={inputId} className="flex-1 h-14 border border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground active:bg-muted cursor-pointer">
          <Camera className="h-5 w-5" /> Photo
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ opacity: 0, position: "absolute", pointerEvents: "none", width: 0, height: 0 }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachPhoto(f); e.target.value = ""; }}
        />
      </div>
      {expanded && (
        <Input
          defaultValue={item.notes ?? ""}
          placeholder="Commentaire (facultatif)"
          onBlur={(e) => e.target.value !== (item.notes ?? "") && onUpdate({ notes: e.target.value } as any)}
        />
      )}
    </li>
  );
}

function TouchButton({
  active, onClick, variant, children,
}: {
  active: boolean;
  onClick: () => void;
  variant: "ok" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const colors = {
    ok: active ? "bg-emerald-600 text-white border-emerald-600" : "border-border text-emerald-700",
    warn: active ? "bg-amber-500 text-white border-amber-500" : "border-border text-amber-700",
    bad: active ? "bg-rose-600 text-white border-rose-600" : "border-border text-rose-700",
  }[variant];
  return (
    <button
      onClick={onClick}
      className={cn("h-14 w-14 border flex items-center justify-center active:scale-95 transition", colors)}
    >
      {children}
    </button>
  );
}
