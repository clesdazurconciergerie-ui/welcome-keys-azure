import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Wifi, Phone, Mail, Clock, ArrowLeft, Package, Trash2, MapPinIcon, HelpCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ChatWidget from "@/components/ChatWidget";
import GalleryView from "@/components/gallery/GalleryView";

interface Step {
  id: string;
  text: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  steps?: Step[];
  manual_url?: string;
}

interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  distance?: string;
  maps_link?: string;
  description?: string;
  image_url?: string;
  website_url?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order_index?: number;
  is_favorite: boolean;
}

interface WifiCredentials {
  id: string;
  ssid: string;
  password: string;
  has_wifi?: boolean;
}

interface Contacts {
  contact_phone?: string;
  contact_email?: string;
}

interface AppearanceConfig {
  colors: {
    background: string;
    surface: string;
    accent: string;
    text: string;
    muted: string;
  };
  typography?: {
    font_family: string;
    base_size: number;
  };
  header?: {
    hero_overlay: number;
    title_align: string;
    show_location: boolean;
  };
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
  wifi_credentials?: WifiCredentials | null;
  equipment: Equipment[];
  waste_location?: string;
  sorting_instructions?: string;
  cleaning_rules?: string;
  cleaning_tips?: string;
  nearby_places?: NearbyPlace[];
  nearby?: any;
  contacts?: Contacts | null;
  faq: FAQ[];
  airbnb_license?: string;
  safety_instructions?: string;
  gdpr_notice?: string;
  disclaimer?: string;
  gallery?: any[];
  status?: string;
  show_logo?: boolean;
  appearance?: AppearanceConfig;
  gallery_enabled?: boolean;
  gallery_items?: any[];
}

export default function PreviewBooklet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [pin, setPin] = useState<string>('');

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
          
          // Récupérer le PIN actif pour le chatbot
          if (data.booklet.id) {
            const { data: pinData } = await supabase
              .from('pins')
              .select('pin_code')
              .eq('booklet_id', data.booklet.id)
              .eq('status', 'active')
              .maybeSingle();
            
            if (pinData?.pin_code) {
              setPin(pinData.pin_code);
            }
          }
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

  // Inject CSS variables dynamically when booklet appearance changes
  useEffect(() => {
    if (!booklet?.appearance) return;

    const root = document.documentElement;
    const colors = booklet.appearance.colors;
    const typography = booklet.appearance.typography;

    // Apply CSS variables to document root
    if (colors) {
      root.style.setProperty('--booklet-bg', colors.background || '#ffffff');
      root.style.setProperty('--booklet-surface', colors.surface || '#ffffff');
      root.style.setProperty('--booklet-accent', colors.accent || '#18c0df');
      root.style.setProperty('--booklet-text', colors.text || '#1a1a1a');
      root.style.setProperty('--booklet-muted', colors.muted || '#6b7280');
    }

    if (typography) {
      root.style.setProperty('--booklet-font', typography.font_family === 'System' 
        ? 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
        : typography.font_family || 'Inter');
      root.style.setProperty('--booklet-size', `${typography.base_size || 16}px`);
    }
  }, [booklet]);

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
          Aperçu créateur - Peut contenir des infos privées
        </Badge>
        <div className="w-24" />
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
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge variant={booklet.status === 'published' ? 'default' : 'secondary'}>
            {booklet.status === 'published' ? 'Publié' : 'Brouillon'}
          </Badge>
        </div>

        {/* Gallery - All Photos */}
        {(() => {
          const allImages = [];
          
          // Add cover image first if it exists
          if (booklet.cover_image_url) {
            allImages.push({
              id: 'cover',
              url: booklet.cover_image_url,
              alt: `Photo principale - ${booklet.property_name}`,
              caption: null,
              order: -1
            });
          }
          
          // Add gallery items
          if (booklet.gallery_items && Array.isArray(booklet.gallery_items)) {
            allImages.push(...booklet.gallery_items);
          }
          
          return allImages.length > 0 ? (
            <GalleryView 
              items={allImages} 
              enabled={booklet.gallery_enabled ?? true} 
            />
          ) : null;
        })()}

        {/* Welcome Message */}
        {booklet.welcome_message && (
          <Card>
            <CardHeader>
              <CardTitle>Bienvenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap ai-description">{booklet.welcome_message}</p>
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
                <p className="whitespace-pre-wrap mt-1 ai-description">{booklet.checkin_procedure}</p>
              </div>
            )}

            {booklet.checkout_procedure && (
              <div>
                <strong>Procédure de départ :</strong>
                <p className="whitespace-pre-wrap mt-1 ai-description">{booklet.checkout_procedure}</p>
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

        {/* WiFi (with password for creator) */}
        {booklet.wifi_credentials && booklet.wifi_credentials.has_wifi && booklet.wifi_credentials.ssid && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                WiFi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <strong>Réseau :</strong> {booklet.wifi_credentials.ssid}
              </div>
              <div>
                <strong>Mot de passe :</strong> <span className="font-mono">{booklet.wifi_credentials.password}</span>
              </div>
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
                      {item.steps && item.steps.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold mb-2">Mode d'emploi :</p>
                          <ol className="list-decimal pl-5 space-y-1">
                            {item.steps.map((step) => (
                              <li key={step.id} className="text-sm text-muted-foreground">
                                {step.text}
                              </li>
                            ))}
                          </ol>
                        </div>
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
                  <p className="whitespace-pre-wrap mt-1 ai-description">{booklet.waste_location}</p>
                </div>
              )}
              {booklet.sorting_instructions && (
                <div>
                  <strong>Instructions de tri :</strong>
                  <p className="whitespace-pre-wrap mt-1 ai-description">{booklet.sorting_instructions}</p>
                </div>
              )}
              {booklet.cleaning_rules && (
                <div>
                  <strong>Règles de nettoyage :</strong>
                  <p className="whitespace-pre-wrap mt-1 ai-description">{booklet.cleaning_rules}</p>
                </div>
              )}
              {booklet.cleaning_tips && (
                <div>
                  <strong>Conseils d'entretien :</strong>
                  <p className="whitespace-pre-wrap mt-1 ai-description">{booklet.cleaning_tips}</p>
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
              <p className="whitespace-pre-wrap ai-description">{booklet.house_rules}</p>
            </CardContent>
          </Card>
        )}

        {/* Nearby Places */}
        {booklet.nearby_places && booklet.nearby_places.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                À proximité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {booklet.nearby_places.map((place) => (
                  <Card key={place.id} className="p-4">
                    {place.image_url && (
                      <img src={place.image_url} alt={place.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                    )}
                    <div className="flex items-start gap-2 mb-2">
                      <h3 className="font-semibold flex-1">{place.name}</h3>
                      <Badge variant="secondary" className="text-xs">{place.type}</Badge>
                    </div>
                    {place.description && (
                      <p className="text-sm text-muted-foreground mb-2">{place.description}</p>
                    )}
                    {place.distance && (
                      <p className="text-sm text-muted-foreground mb-2">📍 {place.distance}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {place.website_url && (
                        <a href={place.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Visiter le site
                        </a>
                      )}
                      {place.maps_link && (
                        <a href={place.maps_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Itinéraire
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts (visible to creator) */}
        {booklet.contacts && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">Privé - Créateur uniquement</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booklet.contacts.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>{booklet.contacts.contact_phone}</span>
                </div>
              )}
              {booklet.contacts.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span>{booklet.contacts.contact_email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        {booklet.faq && booklet.faq.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Questions fréquentes
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                ⭐ = Visible publiquement • ⚙️ = Réservée au chatbot
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {booklet.faq
                  .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0))
                  .map((item, index) => (
                  <AccordionItem key={item.id} value={`faq-${index}`}>
                    <AccordionTrigger className="flex items-center gap-2">
                      <span className="flex-1 text-left flex items-center gap-2">
                        {item.is_favorite ? "⭐" : "⚙️"}
                        {item.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="whitespace-pre-wrap">{item.answer}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.is_favorite ? (
                          <span className="text-green-600">✅ Visible dans le livret public</span>
                        ) : (
                          <span className="text-orange-600">⚙️ Utilisée uniquement par le chatbot</span>
                        )}
                      </p>
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
      </div>

      {/* Chatbot Widget */}
      {pin && <ChatWidget pin={pin} locale={booklet.language || 'fr'} />}
    </div>
  );
}
