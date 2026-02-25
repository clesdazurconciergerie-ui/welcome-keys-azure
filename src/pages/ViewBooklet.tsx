import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Wifi, Clock, Eye, Loader2, Package, Trash2, MapPinIcon, Phone, HelpCircle, DoorOpen, LogIn, LogOut, Car, FileText, Shield, Recycle, Calendar, Menu, X, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ChatWidget from "@/components/ChatWidget";
import FreeTrialWatermark from "@/components/FreeTrialWatermark";
import { supabase } from "@/integrations/supabase/client";
import { extractThemeFromBooklet } from "@/lib/theme-db";
import ThemeScope from "@/components/ThemeScope";
import { Theme } from "@/types/theme";
import GalleryView from "@/components/gallery/GalleryView";

interface Photo {
  url: string;
  alt?: string;
}

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
  photos?: Photo[];
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
  is_favorite?: boolean;
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
  gallery_enabled?: boolean;
  gallery_items?: any[];
}

interface WifiCredentials {
  ssid: string;
  password: string;
  has_wifi?: boolean;
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
  const [theme, setTheme] = useState<Theme | null>(null);

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

  // Apply theme on booklet load - inject CSS variables immediately
  useEffect(() => {
    if (!booklet) return;
    
    const extractedTheme = extractThemeFromBooklet(booklet);
    setTheme(extractedTheme);
    
    // Inject theme CSS variables immediately into document root to prevent flash
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', extractedTheme.primaryHex);
    root.style.setProperty('--theme-accent', extractedTheme.accentHex || extractedTheme.primaryHex);
    root.style.setProperty('--theme-bg', extractedTheme.bgHex || '#ffffff');
    root.style.setProperty('--theme-text', extractedTheme.textHex || '#0F172A');
    root.style.setProperty('--theme-muted', extractedTheme.mutedHex || '#64748B');
    
    const fontFamilyMap: Record<string, string> = {
      'Inter': "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
      'Poppins': "'Poppins', ui-sans-serif, system-ui, -apple-system, sans-serif",
      'Montserrat': "'Montserrat', ui-sans-serif, system-ui, -apple-system, sans-serif",
      'System': "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
    };
    
    const fontSizeMap: Record<string, string> = {
      'sm': '14px',
      'md': '16px',
      'lg': '18px',
      'xl': '20px'
    };
    
    root.style.setProperty('--theme-font-family', fontFamilyMap[extractedTheme.fontFamily] || fontFamilyMap.Inter);
    root.style.setProperty('--theme-font-size', fontSizeMap[extractedTheme.baseFontSize] || '16px');
    
    // Also set legacy booklet variables for backward compatibility
    root.style.setProperty('--booklet-bg', extractedTheme.bgHex || '#ffffff');
    root.style.setProperty('--booklet-accent', extractedTheme.primaryHex);
    root.style.setProperty('--booklet-text', extractedTheme.textHex || '#0F172A');
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

  // Use theme for primary color in UI
  const primaryColor = theme?.primaryHex || '#071552';
  const accentColor = theme?.accentHex || theme?.primaryHex || '#18c0df';

  // If no theme loaded yet, show loading
  if (!theme) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-48 w-full max-w-4xl" />
      </div>
    );
  }

  return (
    <ThemeScope theme={theme} className="min-h-screen">
      {/* Floating Navigation Menu */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setShowMenu(!showMenu)}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg border-0"
          style={{ 
            backgroundColor: 'var(--theme-accent, var(--theme-primary))',
            color: '#ffffff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 85%, black)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-accent, var(--theme-primary))';
          }}
        >
          {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        {showMenu && (
          <div 
            className="absolute top-16 right-0 w-64 rounded-2xl shadow-xl p-3 space-y-1 animate-in slide-in-from-top-5"
            style={{
              backgroundColor: 'var(--theme-bg)',
              border: '1px solid color-mix(in srgb, var(--theme-text) 20%, transparent)'
            }}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group"
                  style={{ 
                    color: 'var(--theme-text)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-primary) 10%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hero Section with Theme-based Gradient */}
      <div 
        className="relative h-72 md:h-80 flex items-end"
        style={{
          backgroundImage: booklet.cover_image_url ? `url(${booklet.cover_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: booklet.cover_image_url 
            ? `url(${booklet.cover_image_url}) center/cover`
            : `linear-gradient(135deg, var(--theme-primary) 0%, color-mix(in srgb, var(--theme-primary) 70%, black) 100%)`
        }}
      >
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.75) 100%)',
            opacity: booklet.cover_image_url ? 1 : 0.5
          }}
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
          <Card 
            id="welcome" 
            className="shadow-lg border-0"
            style={{
              background: `linear-gradient(135deg, var(--theme-bg) 0%, color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg)) 100%)`,
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <DoorOpen className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>Bienvenue</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap ai-description text-base leading-relaxed" style={{ color: 'var(--theme-text)' }}>
                {booklet.welcome_message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Practical Info - Enhanced Grid Layout */}
        <Card 
          id="practical" 
          className="shadow-lg border-0"
          style={{
            backgroundColor: 'var(--theme-bg)',
            borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
          }}
        >
          <CardHeader style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, transparent) 0%, transparent 100%)' }}>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                <Clock className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
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
                    <div 
                      className="p-5 rounded-xl transition-shadow hover:shadow-md"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-bg))',
                        border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <LogIn className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Arrivée</h3>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--theme-accent, var(--theme-primary))' }}>{booklet.check_in_time}</p>
                    </div>
                  )}
                  {booklet.check_out_time && (
                    <div 
                      className="p-5 rounded-xl transition-shadow hover:shadow-md"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-bg))',
                        border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <LogOut className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Départ</h3>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--theme-accent, var(--theme-primary))' }}>{booklet.check_out_time}</p>
                    </div>
                  )}
                </>
              )}
              
              {/* Access code */}
              {booklet.access_code && (
                <div 
                  className="p-5 rounded-xl transition-shadow hover:shadow-md md:col-span-2"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Code d'accès</h3>
                  </div>
                  <p className="whitespace-pre-wrap mt-1 font-mono text-lg" style={{ color: 'var(--theme-text)' }}>{booklet.access_code}</p>
                </div>
              )}
            </div>

            {/* Full-width sections */}
            <div className="space-y-5 mt-6">
              {booklet.google_maps_link && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Localisation</strong>
                  </div>
                  <a 
                    href={booklet.google_maps_link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:underline font-medium inline-flex items-center gap-2"
                    style={{ color: 'var(--theme-accent, var(--theme-primary))' }}
                  >
                    Voir sur Google Maps
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              )}

              {booklet.checkin_procedure && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <LogIn className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Procédure d'arrivée</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description" style={{ color: 'var(--theme-text)' }}>{booklet.checkin_procedure}</p>
                </div>
              )}

              {booklet.checkout_procedure && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <LogOut className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Procédure de départ</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description" style={{ color: 'var(--theme-text)' }}>{booklet.checkout_procedure}</p>
                </div>
              )}

              {booklet.parking_info && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Car className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Stationnement</strong>
                  </div>
                  <p className="whitespace-pre-wrap" style={{ color: 'var(--theme-text)' }}>{booklet.parking_info}</p>
                </div>
              )}

              {booklet.manual_pdf_url && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <a 
                    href={booklet.manual_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:underline font-medium inline-flex items-center gap-2"
                    style={{ color: 'var(--theme-accent, var(--theme-primary))' }}
                  >
                    <FileText className="h-5 w-5" />
                    Télécharger le manuel complet
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              )}

              {booklet.safety_tips && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Conseils de sécurité</strong>
                  </div>
                  <p className="whitespace-pre-wrap" style={{ color: 'var(--theme-text)' }}>{booklet.safety_tips}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* WiFi Section */}
        {booklet.wifi_ssid && (
          <Card 
            id="wifi" 
            className="shadow-lg border-0"
            style={{
              background: `linear-gradient(135deg, var(--theme-bg) 0%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, var(--theme-bg)) 100%)`,
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <Wifi className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>WiFi</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wifiCredentials ? (
                <div className="space-y-4">
                  <div 
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: 'var(--theme-bg)',
                      border: '1px solid color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 25%, transparent)'
                    }}
                  >
                    <strong className="text-sm" style={{ color: 'var(--theme-muted)' }}>Réseau</strong>
                    <p className="text-lg font-semibold mt-1" style={{ color: 'var(--theme-text)' }}>{wifiCredentials.ssid}</p>
                  </div>
                  <div 
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: 'var(--theme-bg)',
                      border: '1px solid color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 25%, transparent)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <strong className="text-sm" style={{ color: 'var(--theme-muted)' }}>Mot de passe</strong>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowWifiPassword(!showWifiPassword)}
                          style={{ color: 'var(--theme-accent, var(--theme-primary))' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 10%, transparent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {showWifiPassword && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyWifiPassword}
                            style={{ color: 'var(--theme-accent, var(--theme-primary))' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 10%, transparent)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            Copier
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-mono font-semibold" style={{ color: 'var(--theme-text)' }}>
                      {showWifiPassword ? wifiCredentials.password : '••••••••'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div 
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: 'var(--theme-bg)',
                      border: '1px solid color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 25%, transparent)'
                    }}
                  >
                    <strong className="text-sm" style={{ color: 'var(--theme-muted)' }}>Réseau</strong>
                    <p className="text-lg font-semibold mt-1" style={{ color: 'var(--theme-text)' }}>{booklet.wifi_ssid}</p>
                  </div>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleShowWifiPassword}
                    disabled={loadingWifi}
                    className="w-full border-0"
                    style={{
                      backgroundColor: 'var(--theme-accent, var(--theme-primary))',
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      if (!loadingWifi) {
                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 85%, black)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-accent, var(--theme-primary))';
                    }}
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
          <Card 
            id="equipment" 
            className="shadow-lg border-0"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, transparent) 0%, transparent 100%)' }}>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <Package className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>Équipements & Modes d'emploi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                {booklet.equipment.map((item, index) => (
                  <AccordionItem 
                    key={item.id} 
                    value={`item-${index}`}
                    style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-text) 15%, transparent)' }}
                  >
                    <AccordionTrigger 
                      className="hover:no-underline px-4 rounded-lg transition-colors"
                      style={{ color: 'var(--theme-text)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-primary) 8%, transparent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <strong className="text-base">{item.name}</strong>
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 12%, transparent)',
                            color: 'var(--theme-text)'
                          }}
                        >
                          {item.category}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-3 pb-4 space-y-4">
                      {item.steps && item.steps.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>Mode d'emploi :</p>
                          <ol className="list-decimal pl-5 space-y-1.5">
                            {item.steps.map((step) => (
                              <li key={step.id} className="leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
                                {step.text}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      
                      {item.photos && item.photos.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {item.photos.map((photo, photoIndex) => (
                            <button
                              key={photoIndex}
                              onClick={() => setLightboxImage({ url: photo.url, alt: photo.alt || item.name })}
                              className="group relative rounded-lg overflow-hidden aspect-square transition-all"
                              style={{
                                border: '2px solid transparent'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--theme-primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'transparent';
                              }}
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
                          className="hover:underline inline-flex items-center gap-2 font-medium"
                          style={{ color: 'var(--theme-accent, var(--theme-primary))' }}
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
          <Card 
            id="cleaning" 
            className="shadow-lg border-0"
            style={{
              background: `linear-gradient(135deg, var(--theme-bg) 0%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 6%, var(--theme-bg)) 100%)`,
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <Recycle className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>Ménage & Tri des déchets</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {booklet.sorting_instructions && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    background: `linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 10%, transparent) 0%, transparent 100%)`,
                    border: '1px solid color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 25%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Collecte des déchets</strong>
                  </div>
                  <div className="whitespace-pre-wrap ai-description space-y-2">
                    {booklet.sorting_instructions.split('\n').map((line, i) => {
                      if (line.trim()) {
                        return (
                          <p key={i} className="flex items-start gap-2">
                            <span className="font-bold mt-1" style={{ color: 'var(--theme-accent, var(--theme-primary))' }}>•</span>
                            <span style={{ color: 'var(--theme-text)' }}>{line}</span>
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
              {booklet.waste_location && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'var(--theme-bg)',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Accès aux containers</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description" style={{ color: 'var(--theme-text)' }}>{booklet.waste_location}</p>
                </div>
              )}
              {booklet.cleaning_rules && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'var(--theme-bg)',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Règles de nettoyage</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description" style={{ color: 'var(--theme-text)' }}>{booklet.cleaning_rules}</p>
                </div>
              )}
              {booklet.cleaning_tips && (
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: 'var(--theme-bg)',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-5 w-5" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                    <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Conseils d'entretien</strong>
                  </div>
                  <p className="whitespace-pre-wrap ai-description" style={{ color: 'var(--theme-text)' }}>{booklet.cleaning_tips}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* House Rules */}
        {booklet.house_rules && (
          <Card 
            className="shadow-lg border-0"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, transparent) 0%, transparent 100%)' }}>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <Shield className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>Règlement intérieur</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap ai-description leading-relaxed" style={{ color: 'var(--theme-text)' }}>
                {booklet.house_rules}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Nearby Places */}
        {booklet.nearby_places && booklet.nearby_places.length > 0 && (
          <Card 
            id="nearby" 
            className="shadow-lg border-0"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, transparent) 0%, transparent 100%)' }}>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <MapPinIcon className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>À proximité</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 px-0">
              <div className="relative group">
                {/* Left Arrow */}
                <button
                  onClick={(e) => {
                    const container = e.currentTarget.parentElement?.querySelector('.nearby-scroll') as HTMLElement;
                    if (container) container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-110 hidden md:flex"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="w-5 h-5" style={{ color: 'var(--theme-text)' }} />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={(e) => {
                    const container = e.currentTarget.parentElement?.querySelector('.nearby-scroll') as HTMLElement;
                    if (container) container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-110 hidden md:flex"
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-5 h-5" style={{ color: 'var(--theme-text)' }} />
                </button>

                {/* Horizontal Scroll Container */}
                <div
                  className="nearby-scroll flex gap-4 overflow-x-auto px-6 pb-2 scroll-smooth snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <style>{`.nearby-scroll::-webkit-scrollbar { display: none; }`}</style>
                  {booklet.nearby_places.map((place) => (
                    <div
                      key={place.id}
                      className="flex-shrink-0 snap-start rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5 w-[80vw] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[280px]"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                        border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                      }}
                    >
                      {/* Image */}
                      <div className="w-full overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
                        {place.image_url ? (
                          <img
                            src={place.image_url}
                            alt={place.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)' }}>
                            <MapPin className="w-10 h-10" style={{ color: 'color-mix(in srgb, var(--theme-primary) 40%, transparent)' }} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm line-clamp-1" style={{ color: 'var(--theme-text)' }}>{place.name}</h3>
                          <Badge
                            variant="secondary"
                            className="text-[10px] flex-shrink-0 px-2 py-0.5"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 12%, transparent)',
                              color: 'var(--theme-text)'
                            }}
                          >
                            {place.type}
                          </Badge>
                        </div>

                        {place.description && (
                          <p className="text-xs line-clamp-2" style={{ color: 'var(--theme-muted)' }}>
                            {place.description}
                          </p>
                        )}

                        {place.distance && (
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--theme-muted)' }}>
                            <Clock className="h-3 w-3" />
                            {place.distance}
                          </p>
                        )}

                        {(place.website_url || place.maps_link) && (
                          <div className="flex gap-2 pt-1">
                            {place.website_url && (
                              <a
                                href={place.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors"
                                style={{
                                  color: 'var(--theme-accent, var(--theme-primary))',
                                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)'
                                }}
                              >
                                Site web
                                <ChevronRight className="h-3 w-3" />
                              </a>
                            )}
                            {place.maps_link && (
                              <a
                                href={place.maps_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors"
                                style={{
                                  color: 'var(--theme-accent, var(--theme-primary))',
                                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)'
                                }}
                              >
                                Itinéraire
                                <ChevronRight className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* FAQ */}
        {booklet.faq && booklet.faq.length > 0 && (
          <Card 
            id="faq" 
            className="shadow-lg border-0"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, transparent) 0%, transparent 100%)' }}>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <HelpCircle className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>Questions fréquentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                {booklet.faq.map((item, index) => (
                  <AccordionItem 
                    key={item.id} 
                    value={`faq-${index}`}
                    style={{ borderBottom: '1px solid color-mix(in srgb, var(--theme-text) 15%, transparent)' }}
                  >
                    <AccordionTrigger 
                      className="hover:no-underline px-4 rounded-lg transition-colors text-left"
                      style={{ color: 'var(--theme-text)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-primary) 8%, transparent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span className="font-semibold">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-3 pb-4" style={{ color: 'var(--theme-muted)' }}>
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
          <Card 
            id="legal" 
            className="shadow-lg border-0"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, transparent) 0%, transparent 100%)' }}>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <Shield className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
                </div>
                <span>Informations légales & Sécurité</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm pt-6">
              {booklet.airbnb_license && (
                <div 
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Numéro de licence</strong>
                  <p className="mt-1" style={{ color: 'var(--theme-text)' }}>{booklet.airbnb_license}</p>
                </div>
              )}
              {booklet.safety_instructions && (
                <div 
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Consignes de sécurité</strong>
                  <p className="whitespace-pre-wrap mt-2" style={{ color: 'var(--theme-text)' }}>{booklet.safety_instructions}</p>
                </div>
              )}
              {booklet.gdpr_notice && (
                <div 
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <strong className="text-base" style={{ color: 'var(--theme-text)' }}>RGPD</strong>
                  <p className="whitespace-pre-wrap mt-2" style={{ color: 'var(--theme-text)' }}>{booklet.gdpr_notice}</p>
                </div>
              )}
              {booklet.disclaimer && (
                <div 
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg))',
                    border: '1px solid color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                  }}
                >
                  <strong className="text-base" style={{ color: 'var(--theme-text)' }}>Clause de non-responsabilité</strong>
                  <p className="whitespace-pre-wrap mt-2" style={{ color: 'var(--theme-text)' }}>{booklet.disclaimer}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gallery */}
        {booklet.gallery && booklet.gallery.length > 0 && (
          <Card 
            className="shadow-lg border-0"
            style={{
              backgroundColor: 'var(--theme-bg)',
              borderColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 20%, transparent)'
            }}
          >
            <CardHeader style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 8%, transparent) 0%, transparent 100%)' }}>
              <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: 'var(--theme-text)' }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 15%, transparent)' }}>
                  <Sparkles className="h-6 w-6" style={{ color: 'var(--theme-accent, var(--theme-primary))' }} />
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
      <ChatWidget 
        pin={code || ''} 
        locale={booklet.language || 'fr'}
      />

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
    </ThemeScope>
  );
}
