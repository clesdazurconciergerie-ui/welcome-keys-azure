import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import BookletCard from "@/components/dashboard/BookletCard";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Pin {
  pin_code: string;
  status: string;
}

const LivretsPage = () => {
  const navigate = useNavigate();
  const [booklets, setBooklets] = useState<any[]>([]);
  const [pins, setPins] = useState<Record<string, Pin>>({});
  const [loading, setLoading] = useState(true);
  const { primaryRole: userRole } = useUserRoles();

  useEffect(() => {
    fetchBooklets();
  }, []);

  const fetchBooklets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("booklets")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setBooklets(data || []);

      const publishedIds = data?.filter(b => b.status === 'published').map(b => b.id) || [];
      if (publishedIds.length > 0) {
        const { data: pinsData } = await supabase
          .from("pins")
          .select("booklet_id, pin_code, status")
          .in("booklet_id", publishedIds)
          .eq("status", "active");

        if (pinsData) {
          const pinsMap: Record<string, Pin> = {};
          pinsData.forEach(pin => { pinsMap[pin.booklet_id] = pin; });
          setPins(pinsMap);
        }
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des livrets");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce livret ?")) return;
    try {
      const { error } = await supabase.from("booklets").delete().eq("id", id);
      if (error) throw error;
      toast.success("Livret supprimé");
      fetchBooklets();
    } catch { toast.error("Erreur lors de la suppression"); }
  };

  const handleDuplicate = async (booklet: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("booklets").insert([{
        property_name: `${booklet.property_name || booklet.title || 'Livret'} (copie)`,
        property_address: booklet.property_address || "",
        user_id: user.id,
      }]);
      if (error) throw error;
      toast.success("Livret dupliqué");
      fetchBooklets();
    } catch { toast.error("Erreur lors de la duplication"); }
  };

  const handlePreview = (id: string) => window.open(`/preview/${id}`, '_blank');
  const handleCopyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("Code copié !"); };
  const handleCopyLink = (code: string) => { navigator.clipboard.writeText(`${window.location.origin}/view/${code}`); toast.success("Lien copié !"); };

  const handleGenerateQR = async (code: string, name: string) => {
    const link = `${window.location.origin}/view/${code}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
    const response = await fetch(qrUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `qr-${name.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("QR Code téléchargé !");
  };

  const handleRegeneratePin = async (bookletId: string) => {
    if (!confirm("Régénérer le code PIN ? L'ancien sera désactivé.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/regenerate-pin/${bookletId}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
      );
      if (!response.ok) throw new Error('Erreur');
      const data = await response.json();
      toast.success(`Nouveau code : ${data.pin_code}`);
      fetchBooklets();
    } catch { toast.error("Erreur lors de la régénération"); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mes livrets</h1>
          <p className="text-muted-foreground mt-1">Créez et gérez vos livrets d'accueil numériques</p>
        </div>
        <Button onClick={() => navigate("/booklets/new")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau livret
        </Button>
      </div>

      {booklets.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun livret</h3>
            <p className="text-muted-foreground mb-6">Créez votre premier livret d'accueil</p>
            <Button onClick={() => navigate("/booklets/new")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Créer mon premier livret
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {booklets.map((booklet, index) => (
            <BookletCard
              key={booklet.id}
              booklet={booklet}
              pin={pins[booklet.id]}
              index={index}
              onEdit={(id) => navigate(`/booklets/${id}/wizard`)}
              onPreview={handlePreview}
              onCopyCode={handleCopyCode}
              onCopyLink={handleCopyLink}
              onGenerateQR={handleGenerateQR}
              onRegeneratePin={handleRegeneratePin}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LivretsPage;
