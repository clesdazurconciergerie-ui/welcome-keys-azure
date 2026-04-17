import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Home, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WelkomStudioSection } from "@/components/property/welkom-studio/WelkomStudioSection";

interface PropertyLite {
  id: string;
  name: string;
  city: string | null;
  hdr_count: number;
  total_count: number;
  cover_thumb: string | null;
}

export default function WelkomStudioPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [propertiesList, setPropertiesList] = useState<PropertyLite[]>([]);
  const [singleProperty, setSingleProperty] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      if (id) {
        const { data } = await supabase
          .from("properties")
          .select("id, name")
          .eq("id", id)
          .maybeSingle();
        if (data) setSingleProperty(data as any);
        setLoading(false);
        return;
      }

      const { data: props } = await supabase
        .from("properties")
        .select("id, name, city")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (!props) {
        setPropertiesList([]);
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        (props as any[]).map(async (p) => {
          const { data: photos } = await supabase
            .from("property_photos")
            .select("id, is_hdr, thumb_url, url")
            .eq("property_id", p.id)
            .order("created_at", { ascending: false })
            .limit(20);
          const hdr = (photos || []).filter((x: any) => x.is_hdr).length;
          const cover =
            (photos as any[])?.find((x) => x.thumb_url)?.thumb_url ||
            (photos as any[])?.[0]?.url ||
            null;
          return {
            id: p.id,
            name: p.name,
            city: p.city,
            hdr_count: hdr,
            total_count: photos?.length || 0,
            cover_thumb: cover,
          } as PropertyLite;
        })
      );
      setPropertiesList(enriched);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Single property mode (route /dashboard/logements/:id/studio)
  if (id && singleProperty) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/logements/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">
              Welkom Studio — {singleProperty.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Pipeline photo HDR exécuté dans votre navigateur.
            </p>
          </div>
        </div>
        <WelkomStudioSection propertyId={singleProperty.id} />
      </div>
    );
  }

  // Overview mode (route /dashboard/welkom-studio)
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Welkom Studio</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sélectionnez un bien pour gérer ses photos HDR et sa galerie premium.
          </p>
        </div>
        <Badge className="bg-accent/10 text-accent border border-accent/30 gap-1.5">
          <Sparkles className="w-3 h-3" />
          SmartFusion HDR
        </Badge>
      </div>

      {propertiesList.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Home className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-base font-semibold text-foreground">Aucun bien pour le moment</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Créez d'abord un logement pour générer des photos HDR.
          </p>
          <Button onClick={() => navigate("/dashboard/logements")}>Aller aux logements</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {propertiesList.map((p) => (
            <Link key={p.id} to={`/dashboard/logements/${p.id}/studio`}>
              <Card className="group/card overflow-hidden hover:shadow-lg hover:border-accent/40 transition-all duration-200 cursor-pointer">
                <div className="aspect-video bg-muted relative">
                  {p.cover_thumb ? (
                    <img
                      src={p.cover_thumb}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {p.hdr_count > 0 && (
                    <Badge className="absolute top-2 left-2 bg-accent text-primary text-[10px] font-bold">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {p.hdr_count} HDR
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.city || "—"} · {p.total_count} photo{p.total_count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover/card:text-accent transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
