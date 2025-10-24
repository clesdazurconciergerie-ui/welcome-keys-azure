import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

const NewBooklet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vous devez être connecté pour créer un livret");
      navigate("/auth");
      return;
    }
    setCheckingAuth(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!propertyName.trim()) {
      toast.error("Le nom de la propriété est requis");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("booklets")
        .insert([{
          property_name: propertyName,
          property_address: propertyAddress,
          user_id: user.id,
          status: 'draft',
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Livret créé avec succès !");
      navigate(`/booklets/${data.id}/wizard`);
    } catch (error: any) {
      console.error("Error creating booklet:", error);
      toast.error("Erreur lors de la création du livret");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au dashboard
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Créer un nouveau livret</h1>
            <p className="text-muted-foreground">
              Commencez par les informations de base de votre propriété
            </p>
          </div>

          <Card className="glass shadow-premium border-0">
            <CardHeader>
              <CardTitle>Informations de base</CardTitle>
              <CardDescription>
                Ces informations pourront être modifiées plus tard dans l'éditeur
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="property-name">
                    Nom de la propriété *
                  </Label>
                  <Input
                    id="property-name"
                    placeholder="Ex: Villa Les Oliviers"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    disabled={loading}
                    required
                    className="text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    Le nom qui sera affiché en en-tête du livret
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property-address">
                    Adresse
                  </Label>
                  <Input
                    id="property-address"
                    placeholder="Ex: 123 Avenue de la Côte d'Azur, Nice"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    disabled={loading}
                    className="text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    L'adresse complète de votre propriété
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    disabled={loading}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer le livret"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 glass rounded-lg border-0">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Prochaines étapes
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Ajouter les infos pratiques (WiFi, check-in/out, parking)</li>
              <li>Lister les équipements disponibles</li>
              <li>Ajouter les lieux d'intérêt à proximité</li>
              <li>Configurer les contacts et urgences</li>
              <li>Uploader des photos dans la galerie</li>
              <li>Configurer le chatbot avec des FAQ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBooklet;
