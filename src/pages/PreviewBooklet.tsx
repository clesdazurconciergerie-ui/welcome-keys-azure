import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Wifi, Phone, Mail, Clock, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Booklet {
  id: string;
  property_name: string;
  property_address: string;
  property_type?: string;
  welcome_message?: string;
  cover_image_url?: string;
  wifi_name?: string;
  wifi_password?: string;
  check_in_time?: string;
  check_out_time?: string;
  house_rules?: string;
  emergency_contacts?: string;
  contact_phone?: string;
  contact_email?: string;
  amenities?: any[];
  nearby?: any[];
  gallery?: any[];
  chatbot_enabled?: boolean;
  chatbot_config?: any;
  status?: string;
}

export default function PreviewBooklet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booklet, setBooklet] = useState<Booklet | null>(null);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      if (!id) {
        navigate('/dashboard');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          'preview-booklet',
          {
            body: { id },
          }
        );

        if (error || !data?.booklet) {
          toast({
            title: "Erreur",
            description: "Impossible de charger la prévisualisation",
            variant: "destructive",
          });
          navigate('/dashboard');
        } else {
          setBooklet(data.booklet);
        }
      } catch (err) {
        console.error('Error fetching preview:', err);
        toast({
          title: "Erreur",
          description: "Impossible de charger la prévisualisation",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!booklet) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Badge */}
      <div className="bg-amber-500 text-white py-2 px-4 text-center sticky top-0 z-50 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="text-white hover:text-white hover:bg-amber-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Badge variant="secondary" className="bg-white text-amber-700">
          Aperçu créateur - Non public
        </Badge>
        <div className="w-24" /> {/* Spacer for centering */}
      </div>

      {/* Hero Section */}
      <div 
        className="relative h-64 md:h-80 bg-gradient-to-br from-brand-blue to-brand-blue-dark flex items-center justify-center"
        style={booklet.cover_image_url ? {
          backgroundImage: `url(${booklet.cover_image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">{booklet.property_name}</h1>
          <p className="text-lg md:text-xl flex items-center justify-center gap-2">
            <MapPin className="h-5 w-5" />
            {booklet.property_address}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge variant={booklet.status === 'published' ? 'default' : 'secondary'}>
            {booklet.status === 'published' ? 'Publié' : 'Brouillon'}
          </Badge>
        </div>

        {/* Welcome Message */}
        {booklet.welcome_message && (
          <Card>
            <CardHeader>
              <CardTitle>Bienvenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{booklet.welcome_message}</p>
            </CardContent>
          </Card>
        )}

        {/* Practical Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations pratiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(booklet.check_in_time || booklet.check_out_time) && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  {booklet.check_in_time && <p><strong>Arrivée :</strong> {booklet.check_in_time}</p>}
                  {booklet.check_out_time && <p><strong>Départ :</strong> {booklet.check_out_time}</p>}
                </div>
              </div>
            )}
            
            {(booklet.wifi_name || booklet.wifi_password) && (
              <div className="flex items-start gap-3">
                <Wifi className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  {booklet.wifi_name && <p><strong>WiFi :</strong> {booklet.wifi_name}</p>}
                  {booklet.wifi_password && <p><strong>Mot de passe :</strong> {booklet.wifi_password}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* House Rules */}
        {booklet.house_rules && (
          <Card>
            <CardHeader>
              <CardTitle>Règlement intérieur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{booklet.house_rules}</p>
            </CardContent>
          </Card>
        )}

        {/* Amenities */}
        {booklet.amenities && booklet.amenities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Équipements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-2">
                {booklet.amenities.map((amenity: any, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-brand-blue">•</span>
                    {amenity.name || amenity}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Nearby */}
        {booklet.nearby && booklet.nearby.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>À proximité</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {booklet.nearby.map((place: any, index: number) => (
                  <li key={index}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand-blue" />
                      {place.name || place}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booklet.contact_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{booklet.contact_phone}</span>
              </div>
            )}
            {booklet.contact_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>{booklet.contact_email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        {booklet.emergency_contacts && (
          <Card>
            <CardHeader>
              <CardTitle>Contacts d'urgence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{booklet.emergency_contacts}</p>
            </CardContent>
          </Card>
        )}

        {/* Gallery */}
        {booklet.gallery && booklet.gallery.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Galerie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {booklet.gallery.map((image: any, index: number) => (
                  <img
                    key={index}
                    src={image.url || image}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
