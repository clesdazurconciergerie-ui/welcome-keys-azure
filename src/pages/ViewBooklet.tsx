import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Wifi, Phone, Mail, Clock } from "lucide-react";
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
}

export default function ViewBooklet() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBooklet = async () => {
      if (!code) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          'get-booklet-by-pin',
          {
            body: { code },
          }
        );

        if (error || !data?.booklet) {
          setError(true);
        } else {
          setBooklet(data.booklet);
        }
      } catch (err) {
        console.error('Error fetching booklet:', err);
        setError(true);
        toast({
          title: "Erreur",
          description: "Impossible de charger le livret",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBooklet();
  }, [code]);

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

  if (error || !booklet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Livret introuvable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Ce livret est introuvable ou n'est plus actif.
            </p>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || place)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue hover:underline flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      {place.name || place}
                    </a>
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
                <a href={`tel:${booklet.contact_phone}`} className="text-brand-blue hover:underline">
                  {booklet.contact_phone}
                </a>
              </div>
            )}
            {booklet.contact_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <a href={`mailto:${booklet.contact_email}`} className="text-brand-blue hover:underline">
                  {booklet.contact_email}
                </a>
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

        {/* Footer */}
        <div className="text-center py-8">
          <Button onClick={() => navigate('/')} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
