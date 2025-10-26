import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Loader2, Sparkles, Download } from "lucide-react";
import AirbnbImportModal from "@/components/booklet-editor/AirbnbImportModal";
import AirbnbImportPreview from "@/components/booklet-editor/AirbnbImportPreview";
import { useState as useImportState } from "react";
import { useSectionRouter } from "@/hooks/useSectionRouter";
import { SectionKey } from "@/types/sections";
import SectionTabs from "@/components/booklet-editor/SectionTabs";
import GeneralSection from "@/components/booklet-editor/GeneralSection";
import IdentitySection from "@/components/booklet-editor/IdentitySection";
import AppearanceSectionV2 from "@/components/booklet-editor/AppearanceSectionV2";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { loadThemeFromDatabase, saveThemeToDatabase } from "@/lib/theme-db";
import WifiSection from "@/components/booklet-editor/WifiSection";
import RulesSection from "@/components/booklet-editor/RulesSection";
import EquipmentsSection from "@/components/booklet-editor/EquipmentsSection";
import NearbySection from "@/components/booklet-editor/NearbySection";
import ChatbotSection from "@/components/booklet-editor/ChatbotSection";

// Mapping 1–1 Section → Composant (pas d'ambiguïté)
const SECTION_VIEWS: Record<SectionKey, React.FC<any>> = {
  general: GeneralSection,
  identity: IdentitySection,
  appearance: AppearanceSectionV2,
  wifi: WifiSection,
  equipments: EquipmentsSection,
  nearby: NearbySection,
  rules: RulesSection,
  chatbot: ChatbotSection,
};

const EditBooklet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { section, navigate: navigateSection } = useSectionRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [booklet, setBooklet] = useState<any>(null);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  
  // Import Airbnb states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);

  // Form states - General
  const [generalData, setGeneralData] = useState({
    propertyName: "",
    propertyAddress: "",
    welcomeMessage: "",
    checkInTime: "",
    checkOutTime: "",
    contactPhone: "",
    contactEmail: "",
    emergencyContacts: "",
  });

  // Form states - Identity
  const [identityData, setIdentityData] = useState({
    conciergeName: "",
    logoUrl: "",
  });

  // Note: Appearance is now managed by ThemeProvider in EditBookletWrapper
  // No local state needed here as it's handled by the context

  // Form states - WiFi
  const [wifiData, setWifiData] = useState({
    ssid: "",
    password: "",
    note: "",
  });

  // Form states - Rules
  const [rulesData, setRulesData] = useState({
    houseRules: "",
    checkInProcedure: "",
    checkOutProcedure: "",
    parkingInfo: "",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, [id]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vous devez être connecté pour modifier un livret");
      navigate("/auth");
      return;
    }
    await fetchBooklet();
  };

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
      
      // Charger les données générales
      setGeneralData({
        propertyName: data.property_name || "",
        propertyAddress: data.property_address || "",
        welcomeMessage: data.welcome_message || "",
        checkInTime: data.check_in_time || "",
        checkOutTime: data.check_out_time || "",
        contactPhone: "",
        contactEmail: "",
        emergencyContacts: data.emergency_contacts || "",
      });

      // Charger les données d'identité
      setIdentityData({
        conciergeName: data.concierge_name || "",
        logoUrl: data.logo_url || "",
      });

      // Note: Appearance/Theme is loaded separately by EditBookletWrapper via ThemeProvider

      // Charger les données de règles
      setRulesData({
        houseRules: data.house_rules || "",
        checkInProcedure: data.checkin_procedure || "",
        checkOutProcedure: data.checkout_procedure || "",
        parkingInfo: data.parking_info || "",
      });

      // Charger WiFi depuis la table séparée
      const { data: wifiDbData } = await supabase
        .from("wifi_credentials")
        .select("ssid, password")
        .eq("booklet_id", id)
        .maybeSingle();

      if (wifiDbData) {
        setWifiData({
          ssid: wifiDbData.ssid || "",
          password: wifiDbData.password || "",
          note: "",
        });
      }

      // Charger les contacts depuis la table séparée
      const { data: contactData } = await supabase
        .from("booklet_contacts")
        .select("contact_phone, contact_email")
        .eq("booklet_id", id)
        .maybeSingle();

      if (contactData) {
        setGeneralData(prev => ({
          ...prev,
          contactPhone: contactData.contact_phone || "",
          contactEmail: contactData.contact_email || "",
        }));
      }

    } catch (error: any) {
      console.error("Error fetching booklet:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      // Sauvegarder les données principales
      // Note: appearance/theme is saved separately via ThemeProvider in EditBookletWrapper
      const { error: bookletError } = await supabase
        .from("booklets")
        .update({
          property_name: generalData.propertyName,
          property_address: generalData.propertyAddress,
          welcome_message: generalData.welcomeMessage,
          check_in_time: generalData.checkInTime,
          check_out_time: generalData.checkOutTime,
          emergency_contacts: generalData.emergencyContacts,
          concierge_name: identityData.conciergeName,
          logo_url: identityData.logoUrl,
          house_rules: rulesData.houseRules,
          checkin_procedure: rulesData.checkInProcedure,
          checkout_procedure: rulesData.checkOutProcedure,
          parking_info: rulesData.parkingInfo,
        })
        .eq("id", id);

      if (bookletError) throw bookletError;

      // Sauvegarder les données WiFi
      if (wifiData.ssid || wifiData.password) {
        const { error: wifiError } = await supabase
          .from("wifi_credentials")
          .upsert({
            booklet_id: id,
            ssid: wifiData.ssid,
            password: wifiData.password,
          });

        if (wifiError) throw wifiError;
      }

      // Sauvegarder les données de contact
      if (generalData.contactPhone || generalData.contactEmail) {
        const { error: contactError } = await supabase
          .from("booklet_contacts")
          .upsert({
            booklet_id: id,
            contact_phone: generalData.contactPhone,
            contact_email: generalData.contactEmail,
          });

        if (contactError) throw contactError;
      }

      toast.success("Livret sauvegardé avec succès");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (field: string) => {
    setGenerating(prev => ({ ...prev, [field]: true }));
    
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-description', {
        body: { 
          propertyName: generalData.propertyName,
          propertyAddress: generalData.propertyAddress,
          contentType: field
        }
      });

      if (error) throw error;

      // Mettre à jour le champ approprié
      switch (field) {
        case 'welcome_message':
          setGeneralData(prev => ({ ...prev, welcomeMessage: result.generatedText }));
          break;
        case 'emergency_contacts':
          setGeneralData(prev => ({ ...prev, emergencyContacts: result.generatedText }));
          break;
        case 'house_rules':
          setRulesData(prev => ({ ...prev, houseRules: result.generatedText }));
          break;
        case 'checkin_procedure':
          setRulesData(prev => ({ ...prev, checkInProcedure: result.generatedText }));
          break;
        case 'checkout_procedure':
          setRulesData(prev => ({ ...prev, checkOutProcedure: result.generatedText }));
          break;
        case 'parking_info':
          setRulesData(prev => ({ ...prev, parkingInfo: result.generatedText }));
          break;
      }

      toast.success("Contenu généré avec succès");
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le logo ne doit pas dépasser 2 Mo');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('booklet-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('booklet-assets')
        .getPublicUrl(filePath);

      setIdentityData(prev => ({ ...prev, logoUrl: data.publicUrl }));
      toast.success('Logo téléchargé avec succès');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload du logo");
    }
  };

  const handleLogoRemove = () => {
    setIdentityData(prev => ({ ...prev, logoUrl: '' }));
  };

  const handlePublish = async () => {
    if (!id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/publish-booklet/${id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to publish');

      toast.success("Livret publié avec succès !");
      navigate('/dashboard');
    } catch (error) {
      console.error("Publish error:", error);
      toast.error("Erreur lors de la publication");
    }
  };

  const handleImportSuccess = (data: any) => {
    setImportedData(data);
    setImportPreviewOpen(true);
  };

  const handleApplyImport = async (selectedSections: string[]) => {
    if (!importedData) return;

    try {
      // Appliquer les sections sélectionnées
      if (selectedSections.includes('general')) {
        setGeneralData(prev => ({
          ...prev,
          propertyName: importedData.title || prev.propertyName,
          propertyAddress: importedData.addressApprox 
            ? `${importedData.addressApprox}, ${importedData.city || ''}`.trim() 
            : prev.propertyAddress,
          welcomeMessage: importedData.description || prev.welcomeMessage,
        }));
      }

      if (selectedSections.includes('rules') && importedData.houseRules) {
        setGeneralData(prev => ({
          ...prev,
          checkInTime: importedData.houseRules?.checkInFrom || prev.checkInTime,
          checkOutTime: importedData.houseRules?.checkOutBefore || prev.checkOutTime,
        }));
        
        const rulesText = [
          importedData.houseRules.quietHours ? `Heures calmes: ${importedData.houseRules.quietHours}` : '',
          importedData.houseRules.pets !== undefined ? (importedData.houseRules.pets ? 'Animaux acceptés' : 'Animaux non acceptés') : '',
          importedData.houseRules.smoking !== undefined ? (importedData.houseRules.smoking ? 'Fumeur autorisé' : 'Non-fumeur') : '',
          importedData.houseRules.parties !== undefined ? (importedData.houseRules.parties ? 'Fêtes autorisées' : 'Pas de fêtes') : '',
        ].filter(Boolean).join('\n');
        
        setRulesData(prev => ({
          ...prev,
          houseRules: rulesText || prev.houseRules,
        }));
      }

      if (selectedSections.includes('capacity')) {
        const capacityText = [
          importedData.maxGuests ? `Capacité: ${importedData.maxGuests} voyageurs` : '',
          importedData.beds ? `Couchages: ${importedData.beds} lit(s)` : '',
          importedData.bathrooms ? `Salles de bain: ${importedData.bathrooms}` : '',
          importedData.spaces ? importedData.spaces.join(', ') : '',
        ].filter(Boolean).join('\n');
        
        setGeneralData(prev => ({
          ...prev,
          emergencyContacts: prev.emergencyContacts + '\n\n' + capacityText,
        }));
      }

      if (selectedSections.includes('amenities') && importedData.amenities && id) {
        // Importer les équipements
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const category of importedData.amenities) {
            if (category.items && category.items.length > 0) {
              await supabase.from('equipment').insert({
                booklet_id: id,
                owner_id: user.id,
                name: category.category,
                category: category.category,
                steps: category.items.map((item: string) => ({ id: crypto.randomUUID(), text: item })),
              });
            }
          }
        }
      }

      // Photos: à implémenter selon votre système de galerie
      // Nearby: peut être ajouté à une section dédiée

      toast.success("Import appliqué avec succès !");
      await fetchBooklet(); // Recharger pour afficher les équipements importés
    } catch (error) {
      console.error('Apply import error:', error);
      toast.error("Erreur lors de l'application de l'import");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Récupérer le composant de la section active (avec fallback)
  const SectionView = SECTION_VIEWS[section] || SECTION_VIEWS.general;

  // Préparer les props pour chaque section
  const sectionProps: Record<SectionKey, any> = {
    general: {
      data: generalData,
      onChange: (updates: Partial<typeof generalData>) => 
        setGeneralData(prev => ({ ...prev, ...updates })),
      onGenerate: handleGenerate,
      generating,
    },
    identity: {
      data: identityData,
      onChange: (updates: Partial<typeof identityData>) => 
        setIdentityData(prev => ({ ...prev, ...updates })),
      onLogoUpload: handleLogoUpload,
      onLogoRemove: handleLogoRemove,
    },
    appearance: {
      // AppearanceSectionV2 uses ThemeContext directly, no props needed
      showSaveButton: true,
    },
    wifi: {
      data: wifiData,
      onChange: (updates: Partial<typeof wifiData>) => 
        setWifiData(prev => ({ ...prev, ...updates })),
    },
    equipments: {
      bookletId: id,
    },
    nearby: {
      bookletId: id,
    },
    rules: {
      data: rulesData,
      onChange: (updates: Partial<typeof rulesData>) => 
        setRulesData(prev => ({ ...prev, ...updates })),
      onGenerate: handleGenerate,
      generating,
    },
    chatbot: {
      bookletId: id,
    },
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC]">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1140px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-[#E6EDF2]" />
            <div>
              <h1 className="font-semibold text-[#0F172A]">
                {generalData.propertyName || "Sans titre"}
              </h1>
              <Badge variant={booklet?.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                {booklet?.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setImportModalOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Importer Airbnb
            </Button>
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
            <Button 
              variant="outline" 
              onClick={() => window.open(`/preview/${id}`, '_blank')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Prévisualiser
            </Button>
            {booklet?.status !== 'published' && (
              <Button onClick={handlePublish}>
                <Sparkles className="w-4 h-4 mr-2" />
                Publier
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1140px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="space-y-6">
          {/* Navigation par onglets */}
          <SectionTabs active={section} onChange={navigateSection} />

          {/* Contenu de la section active */}
          <div key={section}>
            <SectionView {...sectionProps[section]} />
          </div>
        </div>
      </main>

      <AirbnbImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        bookletId={id}
      />

      <AirbnbImportPreview
        open={importPreviewOpen}
        onClose={() => setImportPreviewOpen(false)}
        data={importedData || {}}
        onApply={handleApplyImport}
      />
    </div>
  );
};

export default EditBooklet;
