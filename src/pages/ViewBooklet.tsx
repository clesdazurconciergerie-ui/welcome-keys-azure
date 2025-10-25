import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Wifi, Clock, Eye, Loader2, Package, Trash2, MapPinIcon, Phone, HelpCircle, DoorOpen, LogIn, LogOut, Car, FileText, Shield, Recycle, Calendar, Menu, X, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ChatWidget from "@/components/ChatWidget";
import FreeTrialWatermark from "@/components/FreeTrialWatermark";
import { supabase } from "@/integrations/supabase/client";

interface Photo {
  url: string;
  alt?: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  instructions?: string;
  manual_url?: string;
  photos?: Photo[];
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
  user_id?: string;
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
  concierge_name?: string;
  logo_url?: string;
  background_color?: string;
  accent_color?: string;
  text_color?: string;
  appearance?: AppearanceConfig;
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
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
  const [ownerRole, setOwnerRole] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowMenu(false);
    }
  };

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
            
            // Récupérer le rôle du propriétaire du livret
            if (data.booklet.user_id) {
              const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.booklet.user_id)
                .single();
              
              if (userData) {
                setOwnerRole(userData.role);
              }
            }
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

  // Inject CSS variables dynamically when booklet appearance changes
  useEffect(() => {
    if (!booklet) return;

    const appearance: AppearanceConfig = booklet?.appearance || {
      colors: {
        background: booklet?.background_color || '#ffffff',
        surface: '#ffffff',
        accent: booklet?.accent_color || '#18c0df',
        text: booklet?.text_color || '#1a1a1a',
        muted: '#6b7280'
      },
      typography: {
        font_family: 'Inter',
        base_size: 16
      }
    };

    const root = document.documentElement;
    const colors = appearance.colors;
    const typography = appearance.typography;

    // Apply CSS variables to document root
    root.style.setProperty('--booklet-bg', colors.background);
    root.style.setProperty('--booklet-surface', colors.surface);
    root.style.setProperty('--booklet-accent', colors.accent);
    root.style.setProperty('--booklet-text', colors.text);
    root.style.setProperty('--booklet-muted', colors.muted);
    root.style.setProperty('--booklet-font', typography?.font_family === 'System' 
      ? 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
      : typography?.font_family || 'Inter');
    root.style.setProperty('--booklet-size', `${typography?.base_size || 16}px`);
  }, [booklet]);

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

  const menuItems = [
    { id: 'welcome', label: 'Bienvenue', icon: DoorOpen },
    { id: 'practical', label: 'Infos pratiques', icon: Clock },
    ...(booklet?.wifi_ssid ? [{ id: 'wifi', label: 'WiFi', icon: Wifi }] : []),
    { id: 'equipment', label: 'Équipements', icon: Package },
    { id: 'cleaning', label: 'Ménage & Tri', icon: Trash2 },
    { id: 'nearby', label: 'À proximité', icon: MapPinIcon },
    { id: 'faq', label: 'Questions', icon: HelpCircle },
    { id: 'legal', label: 'Informations légales', icon: Shield },
  ];

  // Get appearance config or fallback to legacy colors
  const appearance: AppearanceConfig = booklet?.appearance || {
    colors: {
      background: booklet?.background_color || '#ffffff',
      surface: '#ffffff',
      accent: booklet?.accent_color || '#18c0df',
      text: booklet?.text_color || '#1a1a1a',
      muted: '#6b7280'
    },
    typography: {
      font_family: 'Inter',
      base_size: 16
    },
    header: {
      hero_overlay: 0.65,
      title_align: 'left',
      show_location: true
    }
  };

  const bgColor = appearance.colors.background;
  const accentColor = appearance.colors.accent;
  const textColor = appearance.colors.text;
  const mutedColor = appearance.colors.muted;
  const surfaceColor = appearance.colors.surface;
  const fontFamily = appearance.typography?.font_family === 'System' 
    ? 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
    : appearance.typography?.font_family || 'Inter';
  const fontSize = appearance.typography?.base_size || 16;
  const heroOverlay = appearance.header?.hero_overlay || 0.65;

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-secondary/30 to-background"
      style={{
        '--booklet-bg': bgColor,
        '--booklet-surface': surfaceColor,
        '--booklet-accent': accentColor,
        '--booklet-text': textColor,
        '--booklet-muted': mutedColor,
        '--booklet-font': fontFamily,
        '--booklet-size': `${fontSize}px`,
      } as React.CSSProperties}
    >
      {/* Floating Navigation Menu */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setShowMenu(!showMenu)}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        {showMenu && (
          <div className="absolute top-16 right-0 w-64 bg-card border border-border rounded-2xl shadow-xl p-3 space-y-1 animate-in slide-in-from-top-5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-all text-left group"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hero Section with Enhanced Gradient */}
      <div 
        className="relative h-72 md:h-80 bg-gradient-to-br from-primary to-primary/80 flex items-end"
        style={booklet.cover_image_url ? {
          backgroundImage: `url(${booklet.cover_image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" 
          style={{ opacity: heroOverlay }}
        />
        <div className="relative z-10 w-full px-4 md:px-8 pb-8 text-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-4 mb-3">
              {booklet.logo_url && (
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl overflow-hidden bg-white/90 p-2 flex-shrink-0">
                  <img 
                    src={booklet.logo_url} 
                    alt={booklet.concierge_name || 'Logo'} 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">{booklet.property_name}</h1>
                {booklet.concierge_name && (
                  <p className="text-xs md:text-sm text-white/70 mb-2">
                    by {booklet.concierge_name}
                  </p>
                )}
              </div>
            </div>
            {booklet.tagline && (
              <p className="text-lg md:text-xl mb-3 text-white/90">{booklet.tagline}</p>
            )}
            <p className="text-sm md:text-base flex items-center gap-2 text-white/80">
              <MapPin className="h-4 w-4" />
              {booklet.property_address}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8">
        {/* Welcome Message */}
        {booklet.welcome_message && (
          <Card id="welcome" className="shadow-lg border-0 bg-gradient-to-br from-card to-secondary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-primary/10">
                  <DoorOpen className="h-6 w-6 text-primary" />
                </div>
                <span>Bienvenue</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap ai-description text-base leading-relaxed">{booklet.welcome_message}</p>
            </CardContent>
          </Card>
        )}

        {/* Practical Info - Enhanced Grid Layout */}
        <Card id="practical" className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-xl bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <span>Informations pratiques</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Check-in/out times */}
              {(booklet.check_in_time || booklet.check_out_time) && (
                <>
                  {booklet.check_in_time && (
                    <div className="bg-secondary/50 p-5 rounded-xl border border-border/50 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <LogIn className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Arrivée</h3>
                      </div>
                      <p className="text-2xl font-bold text-primary">{booklet.check_in_time}</p>
                    </div>
                  )}
                  {booklet.check_out_time && (
                    <div className="bg-secondary/50 p-5 rounded-xl border border-border/50 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <LogOut className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Départ</h3>
                      </div>
                      <p className="text-2xl font-bold text-primary">{booklet.check_out_time}</p>
                    </div>
                  )}
                </>
              )}
              
              {/* Access code */}
              {booklet.access_code && (
                <div className="bg-secondary/50 p-5 rounded-xl border border-border/50 hover:shadow-md transition-shadow md:col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Code d'accès</h3>
                  </div>
                  <p className="whitespace-pre-wrap mt-1 font-mono text-lg">{booklet.access_code}</p>
                </div>
              )}
            </div>

            {/* Full-width sections */}
            <div className="space-y-5 mt-6">
              {booklet.google_maps_link && (
                <div className="bg-secondary/30 p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <strong className="text-base">Localisation</strong>
                  </div>
                  <a 
                    href={booklet.google_maps_link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline font-medium inline-flex items-center gap-2"
                  >
                    Voir sur Google Maps
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              )}

              {booklet.checkin_procedure && (
                <div className="bg-secondary/30 p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <LogIn className="h-5 w-5 text-primary" />
                    <strong className="text-base">Procédure d'arrivée</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description">{booklet.checkin_procedure}</p>
                </div>
              )}

              {booklet.checkout_procedure && (
                <div className="bg-secondary/30 p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <LogOut className="h-5 w-5 text-primary" />
                    <strong className="text-base">Procédure de départ</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description">{booklet.checkout_procedure}</p>
                </div>
              )}

              {booklet.parking_info && (
                <div className="bg-secondary/30 p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Car className="h-5 w-5 text-primary" />
                    <strong className="text-base">Stationnement</strong>
                  </div>
                  <p className="whitespace-pre-wrap">{booklet.parking_info}</p>
                </div>
              )}

              {booklet.manual_pdf_url && (
                <div className="bg-secondary/30 p-5 rounded-xl border border-border/50">
                  <a 
                    href={booklet.manual_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline font-medium inline-flex items-center gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    Télécharger le manuel complet
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              )}

              {booklet.safety_tips && (
                <div className="bg-secondary/30 p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <strong className="text-base">Conseils de sécurité</strong>
                  </div>
                  <p className="whitespace-pre-wrap">{booklet.safety_tips}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* WiFi Section */}
        {booklet.wifi_ssid && (
          <Card id="wifi" className="shadow-lg border-0 bg-gradient-to-br from-card to-blue-50/30 dark:to-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Wifi className="h-6 w-6 text-blue-600" />
                </div>
                <span>WiFi</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wifiCredentials ? (
                <div className="space-y-4">
                  <div className="bg-background p-4 rounded-xl border border-blue-200/50">
                    <strong className="text-sm text-muted-foreground">Réseau</strong>
                    <p className="text-lg font-semibold mt-1">{wifiCredentials.ssid}</p>
                  </div>
                  <div className="bg-background p-4 rounded-xl border border-blue-200/50">
                    <div className="flex items-center justify-between mb-2">
                      <strong className="text-sm text-muted-foreground">Mot de passe</strong>
                      <div className="flex gap-2">
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
                    <p className="text-lg font-mono font-semibold">{showWifiPassword ? wifiCredentials.password : '••••••••'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-background p-4 rounded-xl border border-blue-200/50">
                    <strong className="text-sm text-muted-foreground">Réseau</strong>
                    <p className="text-lg font-semibold mt-1">{booklet.wifi_ssid}</p>
                  </div>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleShowWifiPassword}
                    disabled={loadingWifi}
                    className="w-full"
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
          <Card id="equipment" className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <span>Équipements & Modes d'emploi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                {booklet.equipment.map((item, index) => (
                  <AccordionItem key={item.id} value={`item-${index}`} className="border-b border-border/50">
                    <AccordionTrigger className="hover:no-underline hover:bg-secondary/50 px-4 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <strong className="text-base">{item.name}</strong>
                        <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-3 pb-4 space-y-4">
                      {item.instructions && (
                        <p className="whitespace-pre-wrap text-muted-foreground">{item.instructions}</p>
                      )}
                      
                      {item.photos && item.photos.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {item.photos.map((photo, photoIndex) => (
                            <button
                              key={photoIndex}
                              onClick={() => setLightboxImage({ url: photo.url, alt: photo.alt || item.name })}
                              className="group relative rounded-lg overflow-hidden aspect-square hover:ring-2 hover:ring-primary transition-all"
                            >
                              <img
                                src={photo.url}
                                alt={photo.alt || `${item.name} ${photoIndex + 1}`}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {item.manual_url && (
                        <a 
                          href={item.manual_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline inline-flex items-center gap-2 font-medium"
                        >
                          <FileText className="h-4 w-4" />
                          Voir le manuel
                          <ChevronRight className="h-4 w-4" />
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
          <Card id="cleaning" className="shadow-lg border-0 bg-gradient-to-br from-card to-green-50/30 dark:to-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <Recycle className="h-6 w-6 text-green-600" />
                </div>
                <span>Ménage & Tri des déchets</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {booklet.sorting_instructions && (
                <div className="bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/30 p-5 rounded-xl border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <strong className="text-base">Collecte des déchets</strong>
                  </div>
                  <div className="whitespace-pre-wrap ai-description space-y-2">
                    {booklet.sorting_instructions.split('\n').map((line, i) => {
                      if (line.trim()) {
                        return (
                          <p key={i} className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-1">•</span>
                            <span>{line}</span>
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
              {booklet.waste_location && (
                <div className="bg-background p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <strong className="text-base">Accès aux containers</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description">{booklet.waste_location}</p>
                </div>
              )}
              {booklet.cleaning_rules && (
                <div className="bg-background p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <strong className="text-base">Règles de nettoyage</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description">{booklet.cleaning_rules}</p>
                </div>
              )}
              {booklet.cleaning_tips && (
                <div className="bg-background p-5 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <strong className="text-base">Conseils d'entretien</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description">{booklet.cleaning_tips}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* House Rules */}
        {booklet.house_rules && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <span>Règlement intérieur</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap ai-description leading-relaxed">{booklet.house_rules}</p>
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
            <Card id="nearby" className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <MapPinIcon className="h-6 w-6 text-primary" />
                  </div>
                  <span>À proximité</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-5 md:grid-cols-2">
                  {sortedPlaces.map((place: any) => (
                    <div 
                      key={place.id} 
                      className="bg-secondary/30 p-5 rounded-xl border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{place.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {place.category}
                          </Badge>
                        </div>
                      </div>
                      {place.distance && (
                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {place.distance}
                        </p>
                      )}
                      {place.note && (
                        <p className="text-sm mb-3 text-foreground/80">{place.note}</p>
                      )}
                      {place.mapsUrl && (
                        <a
                          href={place.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-2 font-medium"
                        >
                          Voir l'itinéraire
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}


        {/* FAQ */}
        {booklet.faq && booklet.faq.length > 0 && (
          <Card id="faq" className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-primary/10">
                  <HelpCircle className="h-6 w-6 text-primary" />
                </div>
                <span>Questions fréquentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                {booklet.faq.map((item, index) => (
                  <AccordionItem key={item.id} value={`faq-${index}`} className="border-b border-border/50">
                    <AccordionTrigger className="hover:no-underline hover:bg-secondary/50 px-4 rounded-lg transition-colors text-left">
                      <span className="font-semibold">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-3 pb-4 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Legal & Safety */}
        {(booklet.airbnb_license || booklet.safety_instructions || booklet.gdpr_notice || booklet.disclaimer) && (
          <Card id="legal" className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <span>Informations légales & Sécurité</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm pt-6">
              {booklet.airbnb_license && (
                <div className="bg-secondary/30 p-4 rounded-xl">
                  <strong className="text-base">Numéro de licence</strong>
                  <p className="mt-1">{booklet.airbnb_license}</p>
                </div>
              )}
              {booklet.safety_instructions && (
                <div className="bg-secondary/30 p-4 rounded-xl">
                  <strong className="text-base">Consignes de sécurité</strong>
                  <p className="whitespace-pre-wrap mt-2">{booklet.safety_instructions}</p>
                </div>
              )}
              {booklet.gdpr_notice && (
                <div className="bg-secondary/30 p-4 rounded-xl">
                  <strong className="text-base">RGPD</strong>
                  <p className="whitespace-pre-wrap mt-2">{booklet.gdpr_notice}</p>
                </div>
              )}
              {booklet.disclaimer && (
                <div className="bg-secondary/30 p-4 rounded-xl">
                  <strong className="text-base">Clause de non-responsabilité</strong>
                  <p className="whitespace-pre-wrap mt-2">{booklet.disclaimer}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gallery */}
        {booklet.gallery && booklet.gallery.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <span>Galerie</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {booklet.gallery.map((image: any, index: number) => (
                  <div key={index} className="relative overflow-hidden rounded-xl aspect-video group">
                    <img
                      src={image.url || image}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="py-10 space-y-6">
          {booklet.concierge_name && (
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {booklet.logo_url && (
                <img 
                  src={booklet.logo_url} 
                  alt={booklet.concierge_name} 
                  className="h-6 w-6 object-contain"
                />
              )}
              <span>Conciergerie {booklet.concierge_name}</span>
            </div>
          )}
          <div className="text-center">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              size="lg"
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <Home className="mr-2 h-5 w-5" />
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>

      {/* Chatbot Widget */}
      <ChatWidget pin={code || ''} locale={booklet.language || 'fr'} />

      {/* Free Trial Watermark */}
      <FreeTrialWatermark userRole={ownerRole || undefined} />

      {/* Lightbox for Equipment Photos */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.alt}
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
