import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Home, ArrowLeft, ArrowRight, Save, Eye, Send,
  Wifi, MapPin, FileText, Wrench, Trash2, Store,
  MessageSquare, Shield, Gift, CheckCircle2
} from "lucide-react";
import Step1Identity from "./wizard-steps/Step1Identity";
import Step2Practical from "./wizard-steps/Step2Practical";
import Step3Wifi from "./wizard-steps/Step3Wifi";
import Step4Equipment from "./wizard-steps/Step4Equipment";
import Step5Cleaning from "./wizard-steps/Step5Cleaning";
import Step6Nearby from "./wizard-steps/Step6Nearby";
import Step7Contacts from "./wizard-steps/Step7Contacts";
import Step8FAQ from "./wizard-steps/Step8FAQ";
import Step9Legal from "./wizard-steps/Step9Legal";
import Step10Bonus from "./wizard-steps/Step10Bonus";

interface BookletWizardProps {
  bookletId?: string;
}

const STEPS = [
  { number: 1, title: "Identité", icon: Home, component: Step1Identity },
  { number: 2, title: "Infos pratiques", icon: MapPin, component: Step2Practical },
  { number: 3, title: "Wi-Fi", icon: Wifi, component: Step3Wifi },
  { number: 4, title: "Équipements", icon: Wrench, component: Step4Equipment },
  { number: 5, title: "Ménage & tri", icon: Trash2, component: Step5Cleaning },
  { number: 6, title: "À proximité", icon: Store, component: Step6Nearby },
  { number: 7, title: "Contacts", icon: FileText, component: Step7Contacts },
  { number: 8, title: "FAQ & Chatbot", icon: MessageSquare, component: Step8FAQ },
  { number: 9, title: "Légal", icon: Shield, component: Step9Legal },
  { number: 10, title: "Bonus", icon: Gift, component: Step10Bonus },
];

export default function BookletWizard({ bookletId }: BookletWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookletData, setBookletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bookletId) {
      fetchBookletData();
    } else {
      createNewBooklet();
    }
  }, [bookletId]);

  const fetchBookletData = async () => {
    try {
      const { data, error } = await supabase
        .from("booklets")
        .select("*")
        .eq("id", bookletId)
        .single();

      if (error) throw error;
      setBookletData(data);
      setCurrentStep(data.wizard_step || 1);
    } catch (error) {
      console.error("Error fetching booklet:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const createNewBooklet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("booklets")
        .insert({
          user_id: user.id,
          property_name: "Nouveau livret",
          property_address: "",
          wizard_step: 1,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      setBookletData(data);
      navigate(`/booklets/${data.id}/wizard`, { replace: true });
    } catch (error) {
      console.error("Error creating booklet:", error);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async (updates: any) => {
    if (!bookletData?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("booklets")
        .update({ ...updates, wizard_step: currentStep })
        .eq("id", bookletData.id);

      if (error) throw error;
      
      setBookletData({ ...bookletData, ...updates });
      toast.success("Sauvegardé automatiquement", { duration: 1000 });
    } catch (error) {
      console.error("Auto-save error:", error);
      toast.error("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      autoSave({ wizard_step: currentStep + 1 });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      autoSave({ wizard_step: currentStep - 1 });
    }
  };

  const handlePreview = () => {
    window.open(`/preview/${bookletData.id}`, '_blank');
  };

  const handlePublish = async () => {
    if (!bookletData?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/publish-booklet/${bookletData.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to publish');

      const data = await response.json();
      toast.success(`Livret publié ! Code PIN: ${data.pin_code}`);
      navigate('/dashboard');
    } catch (error) {
      console.error("Publish error:", error);
      toast.error("Erreur lors de la publication");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const StepComponent = STEPS[currentStep - 1].component;
  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold gradient-text">
                  {bookletData?.property_name || "Nouveau livret"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Étape {currentStep} / {STEPS.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Save className="w-4 h-4 animate-spin" />
                  Sauvegarde...
                </span>
              )}
              <Button
                variant="outline"
                onClick={handlePreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                Prévisualiser
              </Button>
              {currentStep === STEPS.length && (
                <Button onClick={handlePublish}>
                  <Send className="w-4 h-4 mr-2" />
                  Publier
                </Button>
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Steps sidebar */}
          <div className="col-span-3">
            <Card className="p-4 sticky top-24">
              <div className="space-y-2">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.number;
                  const isComplete = currentStep > step.number;
                  
                  return (
                    <button
                      key={step.number}
                      onClick={() => setCurrentStep(step.number)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isComplete
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <Icon className="w-5 h-5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {step.title}
                        </div>
                        <div className="text-xs opacity-70">
                          Étape {step.number}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Step content */}
          <div className="col-span-9">
            <Card className="p-6">
              <StepComponent
                data={bookletData}
                onUpdate={autoSave}
              />

              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Précédent
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentStep === STEPS.length}
                >
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
