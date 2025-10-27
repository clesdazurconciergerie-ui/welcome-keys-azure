import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Edit, Trash2, ExternalLink, Plus, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface NearbySectionProps {
  bookletId?: string;
}

interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  description?: string;
  distance?: string;
  maps_link?: string;
  image_url?: string;
  website_url?: string;
}

export default function NearbySection({ bookletId }: NearbySectionProps) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (bookletId) {
      loadPlaces();
    }
  }, [bookletId]);

  const loadPlaces = async () => {
    if (!bookletId) return;

    try {
      const { data, error } = await supabase
        .from("nearby_places")
        .select("*")
        .eq("booklet_id", bookletId)
        .order("created_at");

      if (error) throw error;
      setPlaces(data || []);
    } catch (error) {
      console.error("Error loading nearby places:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les lieux",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("nearby_places")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPlaces(places.filter(p => p.id !== id));
      toast({
        title: "Lieu supprimé",
        description: "Le lieu a été retiré de la liste"
      });
    } catch (error) {
      console.error("Error deleting place:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le lieu",
        variant: "destructive"
      });
    }
  };

  const goToWizard = () => {
    navigate(`/booklets/${bookletId}/wizard?section=nearby`);
  };

  if (loading) {
    return (
      <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">À proximité</h2>
          <p className="text-sm text-[#64748B]">
            Commerces, restaurants et lieux d'intérêt autour de votre propriété
          </p>
        </div>
        <Button onClick={goToWizard} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Gérer
        </Button>
      </div>

      {places.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#E6EDF2] rounded-xl">
          <MapPin className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
          <p className="text-[#64748B] mb-4">
            Aucun lieu ajouté pour le moment
          </p>
          <Button onClick={goToWizard} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter des lieux
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {places.map((place) => (
            <Card key={place.id} className="p-4">
              <div className="flex gap-4">
                {place.image_url ? (
                  <img
                    src={place.image_url}
                    alt={place.name}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{place.name}</h3>
                    <Badge variant="secondary" className="flex-shrink-0">{place.type}</Badge>
                  </div>
                  {place.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {place.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-sm">
                    {place.distance && (
                      <span className="text-muted-foreground">📍 {place.distance}</span>
                    )}
                    {place.website_url && (
                      <a
                        href={place.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Site web
                      </a>
                    )}
                    {place.maps_link && (
                      <a
                        href={place.maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Itinéraire
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToWizard}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(place.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
