import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Wifi, Phone, Mail, Clock, Eye, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Booklet {
  id: string;
  property_name: string;
  property_address: string;
  property_type?: string;
  welcome_message?: string;
  cover_image_url?: string;
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

interface WifiCredentials {
  ssid: string;
  password: string;
}

export default function ViewBooklet() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [error, setError] = useState(false);
  const [wifiCredentials, setWifiCredentials] = useState<WifiCredentials | null>(null);
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [loadingWifi, setLoadingWifi] = useState(false);

  useEffect(() => {
    const fetchBooklet = async () => {
      if (!code) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        // Normalize code: trim, remove spaces, uppercase
        const normalizedCode = code.replace(/\s+/g, '').toUpperCase();
        
        // Call the edge function with code in path
        const response = await fetch(
          `https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/get-booklet-by-pin/${normalizedCode}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError(true);
            toast({
              title: "Code invalide",
              description: "Ce code n'existe pas ou a été désactivé.",
              variant: "destructive",
            });
          } else {
            setError(true);
            toast({
              title: "Erreur",
              description: "Problème temporaire. Réessayez dans une minute.",
              variant: "destructive",
            });
          }
        } else {
          const data = await response.json();
          if (data?.booklet) {
            setBooklet(data.booklet);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        console.error('Error fetching booklet:', err);
        setError(true);
        toast({
          title: "Erreur",
          description: "Problème de connexion. Vérifiez votre réseau.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBooklet();
  }, [code]);

  const handleShowWifiPassword = async () => {
    if (!code || loadingWifi || wifiCredentials) return;

    setLoadingWifi(true);
    try {
      const normalizedCode = code.replace(/\s+/g, '').toUpperCase();
      const response = await fetch(
        `https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/get-wifi-by-pin/${normalizedCode}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les identifiants WiFi",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();
      setWifiCredentials(data);
      setShowWifiPassword(true);
    } catch (err) {
      console.error('Error fetching WiFi credentials:', err);
      toast({
        title: "Erreur",
        description: "Problème de connexion",
        variant: "destructive",
      });
    } finally {
      setLoadingWifi(false);
    }
  };

  const handleCopyWifiPassword = () => {
    if (wifiCredentials?.password) {
      navigator.clipboard.writeText(wifiCredentials.password);
      toast({
        title: "Copié !",
        description: "Mot de passe WiFi copié dans le presse-papiers",
      });
    }
  };

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
            
            {/* WiFi Section - Secure */}
            <div className="flex items-start gap-3 border-t pt-4">
              <Wifi className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                {wifiCredentials ? (
                  <>
                    <p><strong>WiFi :</strong> {wifiCredentials.ssid}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="flex-1">
                        <strong>Mot de passe :</strong>{' '}
                        {showWifiPassword ? wifiCredentials.password : '••••••••'}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowWifiPassword(!showWifiPassword)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {showWifiPassword && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyWifiPassword}
                        >
                          Copier
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-2">
                      Les identifiants WiFi sont disponibles pour les voyageurs
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowWifiPassword}
                      disabled={loadingWifi}
                    >
                      {loadingWifi ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Afficher les identifiants WiFi
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
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
