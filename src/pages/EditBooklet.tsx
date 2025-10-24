import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Home,
  Info,
  Wifi,
  MapPin,
  Phone,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Wand2
} from "lucide-react";

const EditBooklet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booklet, setBooklet] = useState<any>(null);
  const [generatingWelcome, setGeneratingWelcome] = useState(false);
  const [generatingRules, setGeneratingRules] = useState(false);
  const [generatingEmergency, setGeneratingEmergency] = useState(false);

  // Form states
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState("");

  useEffect(() => {
    fetchBooklet();
  }, [id]);

  const fetchBooklet = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("booklets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setBooklet(data);
      setPropertyName(data.property_name || "");
      setPropertyAddress(data.property_address || "");
      setWelcomeMessage(data.welcome_message || "");
      setCheckInTime(data.check_in_time || "");
      setCheckOutTime(data.check_out_time || "");
      setHouseRules(data.house_rules || "");
      setContactPhone(data.contact_phone || "");
      setContactEmail(data.contact_email || "");
      setEmergencyContacts(data.emergency_contacts || "");

      // Fetch WiFi credentials from separate table
      const { data: wifiData } = await supabase
        .from("wifi_credentials")
        .select("ssid, password")
        .eq("booklet_id", id)
        .maybeSingle();

      if (wifiData) {
        setWifiName(wifiData.ssid || "");
        setWifiPassword(wifiData.password || "");
      }
    } catch (error) {
      console.error("Error fetching booklet:", error);
      toast.error("Erreur lors du chargement du livret");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    try {
      // Update booklet basic info
      const { error: bookletError } = await supabase
        .from("booklets")
        .update({
          property_name: propertyName,
          property_address: propertyAddress,
          welcome_message: welcomeMessage,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          house_rules: houseRules,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          emergency_contacts: emergencyContacts,
        })
        .eq("id", id);

      if (bookletError) throw bookletError;

      // Update or insert WiFi credentials in separate table
      if (wifiName || wifiPassword) {
        const { error: wifiError } = await supabase
          .from("wifi_credentials")
          .upsert({
            booklet_id: id,
            ssid: wifiName,
            password: wifiPassword,
          }, {
            onConflict: 'booklet_id'
          });

        if (wifiError) throw wifiError;
      }

      toast.success("Modifications sauvegardées");
      fetchBooklet();
    } catch (error) {
      console.error("Error saving booklet:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateContent = async (contentType: 'welcome_message' | 'house_rules' | 'emergency_contacts') => {
    if (!propertyName) {
      toast.error("Veuillez d'abord renseigner le nom de la propriété");
      return;
    }

    const setGeneratingState = contentType === 'welcome_message' ? setGeneratingWelcome :
                                contentType === 'house_rules' ? setGeneratingRules :
                                setGeneratingEmergency;
    
    setGeneratingState(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: {
          propertyName,
          propertyAddress: propertyAddress || '',
          contentType
        }
      });

      if (error) throw error;

      if (data.generatedText) {
        if (contentType === 'welcome_message') {
          setWelcomeMessage(data.generatedText);
        } else if (contentType === 'house_rules') {
          setHouseRules(data.generatedText);
        } else if (contentType === 'emergency_contacts') {
          setEmergencyContacts(data.generatedText);
        }
        toast.success("Description générée avec succès !");
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGeneratingState(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('publish-booklet/' + id);

      if (error) throw error;

      toast.success(`Livret publié ! Code: ${data.code}`);
      fetchBooklet();
      navigate('/dashboard');
    } catch (error) {
      console.error("Error publishing booklet:", error);
      toast.error("Erreur lors de la publication");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-semibold">{propertyName || "Sans titre"}</h1>
              <Badge variant={booklet?.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                {booklet?.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Sauvegarder
            </Button>
            {booklet?.status !== 'published' ? (
              <Button onClick={handlePublish}>
                <Sparkles className="w-4 h-4 mr-2" />
                Publier
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate(`/share/${id}`)}>
                <Eye className="w-4 h-4 mr-2" />
                Voir le partage
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="identity" className="gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Identité</span>
            </TabsTrigger>
            <TabsTrigger value="practical" className="gap-2">
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Infos</span>
            </TabsTrigger>
            <TabsTrigger value="wifi" className="gap-2">
              <Wifi className="w-4 h-4" />
              <span className="hidden sm:inline">WiFi</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Règlement</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Galerie</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <Card className="glass border-0 shadow-md">
              <CardHeader>
                <CardTitle>Identité de la propriété</CardTitle>
                <CardDescription>
                  Les informations principales qui seront affichées en en-tête
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="property-name">Nom de la propriété *</Label>
                  <Input
                    id="property-name"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="Villa Les Oliviers"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property-address">Adresse</Label>
                  <Input
                    id="property-address"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="123 Avenue de la Côte d'Azur, Nice"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="welcome-message">Message de bienvenue</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateContent('welcome_message')}
                      disabled={generatingWelcome}
                    >
                      {generatingWelcome ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Générer avec IA
                    </Button>
                  </div>
                  <Textarea
                    id="welcome-message"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Bienvenue dans notre magnifique villa..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practical">
            <Card className="glass border-0 shadow-md">
              <CardHeader>
                <CardTitle>Informations pratiques</CardTitle>
                <CardDescription>
                  Horaires et informations importantes pour vos invités
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="checkin">Heure d'arrivée</Label>
                    <Input
                      id="checkin"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      placeholder="Ex: 16h00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout">Heure de départ</Label>
                    <Input
                      id="checkout"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      placeholder="Ex: 10h00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wifi">
            <Card className="glass border-0 shadow-md">
              <CardHeader>
                <CardTitle>Accès WiFi</CardTitle>
                <CardDescription>
                  Les identifiants WiFi pour vos invités
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="wifi-name">Nom du réseau WiFi</Label>
                  <Input
                    id="wifi-name"
                    value={wifiName}
                    onChange={(e) => setWifiName(e.target.value)}
                    placeholder="VillaWiFi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wifi-password">Mot de passe WiFi</Label>
                  <Input
                    id="wifi-password"
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card className="glass border-0 shadow-md">
              <CardHeader>
                <CardTitle>Règlement intérieur</CardTitle>
                <CardDescription>
                  Les règles importantes à respecter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="house-rules">Règles de la maison</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateContent('house_rules')}
                      disabled={generatingRules}
                    >
                      {generatingRules ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Générer avec IA
                    </Button>
                  </div>
                  <Textarea
                    id="house-rules"
                    value={houseRules}
                    onChange={(e) => setHouseRules(e.target.value)}
                    placeholder="Ex: Non fumeur, pas d'animaux, respecter le voisinage..."
                    rows={8}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card className="glass border-0 shadow-md">
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
                <CardDescription>
                  Les coordonnées utiles pour vos invités
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Téléphone conciergerie</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@clesdazur.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emergency">Contacts d'urgence</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateContent('emergency_contacts')}
                      disabled={generatingEmergency}
                    >
                      {generatingEmergency ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Générer avec IA
                    </Button>
                  </div>
                  <Textarea
                    id="emergency"
                    value={emergencyContacts}
                    onChange={(e) => setEmergencyContacts(e.target.value)}
                    placeholder="Police: 17&#10;Pompiers: 18&#10;SAMU: 15"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gallery">
            <Card className="glass border-0 shadow-md">
              <CardHeader>
                <CardTitle>Galerie photos</CardTitle>
                <CardDescription>
                  À venir : Upload et gestion des photos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    La galerie photos sera disponible prochainement
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EditBooklet;
