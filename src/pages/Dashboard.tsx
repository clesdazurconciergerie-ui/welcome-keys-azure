import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, 
  LogOut, 
  Edit, 
  Eye, 
  Copy, 
  Trash2,
  FileText,
  Waves,
  Loader2,
  QrCode,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Pin {
  pin_code: string;
  status: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [booklets, setBooklets] = useState<any[]>([]);
  const [pins, setPins] = useState<Record<string, Pin>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    checkAuth();
    fetchBooklets();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserEmail(session.user.email || "");
  };

  const fetchBooklets = async () => {
    try {
      const { data, error } = await supabase
        .from("booklets")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setBooklets(data || []);

      // Fetch PINs for published booklets
      const publishedIds = data?.filter(b => b.status === 'published').map(b => b.id) || [];
      if (publishedIds.length > 0) {
        const { data: pinsData } = await supabase
          .from("pins")
          .select("booklet_id, pin_code, status")
          .in("booklet_id", publishedIds)
          .eq("status", "active");

        if (pinsData) {
          const pinsMap: Record<string, Pin> = {};
          pinsData.forEach(pin => {
            pinsMap[pin.booklet_id] = pin;
          });
          setPins(pinsMap);
        }
      }
    } catch (error) {
      console.error("Error fetching booklets:", error);
      toast.error("Erreur lors du chargement des livrets");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce livret ?")) return;

    try {
      const { error } = await supabase
        .from("booklets")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Livret supprimé");
      fetchBooklets();
    } catch (error) {
      console.error("Error deleting booklet:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDuplicate = async (booklet: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const newBooklet = {
        property_name: booklet.property_name ? `${booklet.property_name} (copie)` : `${booklet.title || 'Livret'} (copie)`,
        property_address: booklet.property_address || "",
        user_id: user.id,
      };

      const { error } = await supabase
        .from("booklets")
        .insert([newBooklet]);

      if (error) throw error;
      toast.success("Livret dupliqué");
      fetchBooklets();
    } catch (error) {
      console.error("Error duplicating booklet:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const handlePreview = (id: string) => {
    window.open(`/preview/${id}`, '_blank');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié !");
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/view/${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  };

  const handleGenerateQR = async (code: string, propertyName: string) => {
    try {
      const link = `${window.location.origin}/view/${code}`;
      // Using QR Server API for QR code generation
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
      
      // Download the QR code
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${propertyName.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("QR Code téléchargé !");
    } catch (error) {
      console.error("Error generating QR:", error);
      toast.error("Erreur lors de la génération du QR code");
    }
  };

  const handleRegeneratePin = async (bookletId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir régénérer le code PIN ? L'ancien code sera désactivé.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expirée");
        return;
      }

      const response = await fetch(
        `https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/regenerate-pin/${bookletId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la régénération');
      }

      const data = await response.json();
      toast.success(`Nouveau code généré : ${data.pin_code}`);
      fetchBooklets(); // Refresh the list
    } catch (error) {
      console.error("Error regenerating PIN:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la régénération du code");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Waves className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Clés d'Azur</h1>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Mes livrets d'accueil</h2>
            <p className="text-muted-foreground">
              Créez et gérez vos livrets numériques
            </p>
          </div>
          <Button onClick={() => navigate("/booklets/new")} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Nouveau livret
          </Button>
        </div>

        {booklets.length === 0 ? (
          <Card className="glass shadow-premium border-0 text-center py-12">
            <CardContent className="pt-6">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Aucun livret pour le moment</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre premier livret d'accueil pour commencer
              </p>
              <Button onClick={() => navigate("/booklets/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Créer mon premier livret
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {booklets.map((booklet) => {
              const pin = pins[booklet.id];
              
              return (
                <Card key={booklet.id} className="glass shadow-md border-0 transition-smooth hover:shadow-premium">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1 truncate">
                          {booklet.title || booklet.property_name || "Sans titre"}
                        </CardTitle>
                        {(booklet.subtitle || booklet.welcome_message) && (
                          <CardDescription className="text-sm line-clamp-2">
                            {booklet.subtitle || booklet.welcome_message}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={booklet.status === 'published' ? 'default' : 'secondary'} className="flex-shrink-0">
                        {booklet.status === 'published' ? 'Publié' : 'Brouillon'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* PIN Display for published booklets */}
                      {booklet.status === 'published' && pin && (
                        <div className="p-3 bg-primary/5 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Code PIN</span>
                            <code className="text-sm font-bold text-primary">{pin.pin_code}</code>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs min-w-[70px]"
                              onClick={() => handleCopyCode(pin.pin_code)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Code
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs min-w-[70px]"
                              onClick={() => handleCopyLink(pin.pin_code)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Lien
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs min-w-[60px]"
                              onClick={() => handleGenerateQR(pin.pin_code, booklet.property_name || 'livret')}
                            >
                              <QrCode className="w-3 h-3 mr-1" />
                              QR
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => handleRegeneratePin(booklet.id)}
                          >
                            Régénérer le code PIN
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Vues: {booklet.views_count || 0}</span>
                        <span className="truncate ml-2">
                          {formatDistanceToNow(new Date(booklet.updated_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-[100px]"
                          onClick={() => navigate(`/booklets/${booklet.id}/wizard`)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(booklet.id)}
                          title="Prévisualiser (créateur)"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(booklet)}
                          title="Dupliquer"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(booklet.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
