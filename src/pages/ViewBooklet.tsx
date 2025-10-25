import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Wifi, Clock, Eye, Loader2, Package, Trash2, MapPinIcon, Phone, HelpCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Equipment {
  id: string;
  name: string;
  category: string;
  instructions?: string;
  manual_url?: string;
}

interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  distance?: string;
  maps_link?: string;
  description?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order_index?: number;
}

interface Booklet {
  id: string;
  property_name: string;
  tagline?: string;
  property_address: string;
  welcome_message?: string;
  cover_image_url?: string;
  language?: string;
  google_maps_link?: string;
  access_code?: string;
  check_in_time?: string;
  check_out_time?: string;
  checkin_procedure?: string;
  checkout_procedure?: string;
  parking_info?: string;
  house_rules?: string;
  manual_pdf_url?: string;
  safety_tips?: string;
  wifi_ssid?: string;
  equipment: Equipment[];
  waste_location?: string;
  sorting_instructions?: string;
  cleaning_rules?: string;
  cleaning_tips?: string;
  nearby_places?: NearbyPlace[];
  nearby?: any;
  faq: FAQ[];
  airbnb_license?: string;
  safety_instructions?: string;
  gdpr_notice?: string;
  disclaimer?: string;
  gallery?: any[];
  show_logo?: boolean;
  updated_at?: string;
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
        const normalizedCode = code.replace(/\s+/g, '').toUpperCase();
        
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
          {booklet.tagline && (
            <p className="text-lg md:text-xl mb-2">{booklet.tagline}</p>
          )}
          <p className="text-lg flex items-center justify-center gap-2">
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Informations pratiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booklet.google_maps_link && (
              <div>
                <strong>Localisation :</strong>{' '}
                <a href={booklet.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Voir sur Google Maps
                </a>
              </div>
            )}
            
            {booklet.access_code && (
              <div>
                <strong>Code d'accès :</strong>
                <p className="whitespace-pre-wrap mt-1">{booklet.access_code}</p>
              </div>
            )}

            {(booklet.check_in_time || booklet.check_out_time) && (
              <div className="grid grid-cols-2 gap-4">
                {booklet.check_in_time && (
                  <div>
                    <strong>Arrivée :</strong>
                    <p>{booklet.check_in_time}</p>
                  </div>
                )}
                {booklet.check_out_time && (
                  <div>
                    <strong>Départ :</strong>
                    <p>{booklet.check_out_time}</p>
                  </div>
                )}
              </div>
            )}

            {booklet.checkin_procedure && (
              <div>
                <strong>Procédure d'arrivée :</strong>
                <p className="whitespace-pre-wrap mt-1">{booklet.checkin_procedure}</p>
              </div>
            )}

            {booklet.checkout_procedure && (
              <div>
                <strong>Procédure de départ :</strong>
                <p className="whitespace-pre-wrap mt-1">{booklet.checkout_procedure}</p>
              </div>
            )}

            {booklet.parking_info && (
              <div>
                <strong>Stationnement :</strong>
                <p className="whitespace-pre-wrap mt-1">{booklet.parking_info}</p>
              </div>
            )}

            {booklet.manual_pdf_url && (
              <div>
                <a href={booklet.manual_pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  📄 Télécharger le manuel complet
                </a>
              </div>
            )}

            {booklet.safety_tips && (
              <div>
                <strong>Conseils de sécurité :</strong>
                <p className="whitespace-pre-wrap mt-1">{booklet.safety_tips}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WiFi Section */}
        {booklet.wifi_ssid && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                WiFi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wifiCredentials ? (
                <div className="space-y-3">
                  <div>
                    <strong>Réseau :</strong> {wifiCredentials.ssid}
                  </div>
                  <div className="flex items-center gap-2">
                    <strong>Mot de passe :</strong>
                    <span className="flex-1 font-mono">{showWifiPassword ? wifiCredentials.password : '••••••••'}</span>
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
                </div>
              ) : (
                <div className="space-y-3">
                  <p><strong>Réseau :</strong> {booklet.wifi_ssid}</p>
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
                        Afficher le mot de passe
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Equipment */}
        {booklet.equipment && booklet.equipment.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Équipements & Modes d'emploi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {booklet.equipment.map((item, index) => (
                  <AccordionItem key={item.id} value={`item-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <strong>{item.name}</strong>
                        <span className="text-sm text-muted-foreground">({item.category})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {item.instructions && (
                        <p className="whitespace-pre-wrap mb-2">{item.instructions}</p>
                      )}
                      {item.manual_url && (
                        <a href={item.manual_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          📄 Voir le manuel
                        </a>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Cleaning & Waste */}
        {(booklet.waste_location || booklet.sorting_instructions || booklet.cleaning_rules || booklet.cleaning_tips) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Ménage & Tri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booklet.waste_location && (
                <div>
                  <strong>Emplacement des poubelles :</strong>
                  <p className="whitespace-pre-wrap mt-1">{booklet.waste_location}</p>
                </div>
              )}
              {booklet.sorting_instructions && (
                <div>
                  <strong>Instructions de tri :</strong>
                  <p className="whitespace-pre-wrap mt-1">{booklet.sorting_instructions}</p>
                </div>
              )}
              {booklet.cleaning_rules && (
                <div>
                  <strong>Règles de nettoyage :</strong>
                  <p className="whitespace-pre-wrap mt-1">{booklet.cleaning_rules}</p>
                </div>
              )}
              {booklet.cleaning_tips && (
                <div>
                  <strong>Conseils d'entretien :</strong>
                  <p className="whitespace-pre-wrap mt-1">{booklet.cleaning_tips}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Nearby Places */}
        {(() => {
          const nearbyPlaces = (() => {
            try {
              if (Array.isArray(booklet.nearby)) return booklet.nearby;
              if (typeof booklet.nearby === 'string') return JSON.parse(booklet.nearby);
              return [];
            } catch {
              return [];
            }
          })();

          const validPlaces = nearbyPlaces.filter((p: any) => 
            p.name && p.name.trim().length >= 2 && p.category
          );

          const sortedPlaces = validPlaces.sort((a: any, b: any) => {
            if (a.distance && b.distance) {
              const distA = parseInt(a.distance);
              const distB = parseInt(b.distance);
              if (!isNaN(distA) && !isNaN(distB)) return distA - distB;
            }
            return a.name.localeCompare(b.name);
          });

          return sortedPlaces.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  À proximité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {sortedPlaces.map((place: any) => (
                    <Card key={place.id} className="p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="font-semibold flex-1">{place.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {place.category}
                        </Badge>
                      </div>
                      {place.distance && (
                        <p className="text-sm text-muted-foreground mb-2">
                          • {place.distance}
                        </p>
                      )}
                      {place.note && (
                        <p className="text-sm mb-2">{place.note}</p>
                      )}
                      {place.mapsUrl && (
                        <a
                          href={place.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          Itinéraire →
                        </a>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}

        {/* FAQ */}
        {booklet.faq && booklet.faq.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Questions fréquentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {booklet.faq.map((item, index) => (
                  <AccordionItem key={item.id} value={`faq-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>
                      <p className="whitespace-pre-wrap">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Legal & Safety */}
        {(booklet.airbnb_license || booklet.safety_instructions || booklet.gdpr_notice || booklet.disclaimer) && (
          <Card>
            <CardHeader>
              <CardTitle>Informations légales & Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {booklet.airbnb_license && (
                <div>
                  <strong>Numéro de licence :</strong>
                  <p>{booklet.airbnb_license}</p>
                </div>
              )}
              {booklet.safety_instructions && (
                <div>
                  <strong>Consignes de sécurité :</strong>
                  <p className="whitespace-pre-wrap mt-1">{booklet.safety_instructions}</p>
                </div>
              )}
              {booklet.gdpr_notice && (
                <div>
                  <strong>RGPD :</strong>
                  <p className="whitespace-pre-wrap mt-1">{booklet.gdpr_notice}</p>
                </div>
              )}
              {booklet.disclaimer && (
                <div>
                  <strong>Clause de non-responsabilité :</strong>
                  <p className="whitespace-pre-wrap mt-1">{booklet.disclaimer}</p>
                </div>
              )}
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
