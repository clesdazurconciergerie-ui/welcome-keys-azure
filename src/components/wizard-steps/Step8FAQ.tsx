import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface FAQ {
  id?: string;
  question: string;
  answer: string;
  order_index: number;
}

interface Step8FAQProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step8FAQ({ data, onUpdate }: Step8FAQProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const bookletId = data?.id;

  useEffect(() => {
    if (bookletId) {
      fetchFAQs();
    } else {
      setLoading(false);
    }
  }, [bookletId]);

  const fetchFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from("faq")
        .select("*")
        .eq("booklet_id", bookletId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Insert default FAQs if none exist
        const defaultFAQs = [
          { question: "Comment faire le check-in ?", answer: "Les instructions vous seront envoyées 24h avant.", order_index: 1 },
          { question: "Où jeter les poubelles ?", answer: "Consultez la section 'Ménage et tri'.", order_index: 2 },
          { question: "Le WiFi ne fonctionne pas ?", answer: "Vérifiez le mot de passe. En cas de problème, contactez-nous.", order_index: 3 },
        ];
        
        const { data: newData } = await supabase
          .from("faq")
          .insert(defaultFAQs.map(faq => ({ ...faq, booklet_id: bookletId })))
          .select();
        
        setFaqs(newData || []);
      } else {
        setFaqs(data);
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const addFAQ = () => {
    setFaqs([{
      question: "",
      answer: "",
      order_index: 0,
    }, ...faqs]);
  };

  const removeFAQ = async (index: number) => {
    const faq = faqs[index];
    if (faq.id) {
      try {
        await supabase
          .from("faq")
          .delete()
          .eq("id", faq.id);
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFAQ = (index: number, updates: Partial<FAQ>) => {
    const newFAQs = [...faqs];
    newFAQs[index] = { ...newFAQs[index], ...updates };
    setFaqs(newFAQs);
    
    // Auto-save
    setTimeout(async () => {
      try {
        const faq = newFAQs[index];
        if (faq.question && faq.answer) {
          await supabase
            .from("faq")
            .upsert({
              id: faq.id,
              booklet_id: bookletId,
              ...faq,
            });
        }
      } catch (error) {
        console.error("Error saving:", error);
      }
    }, 1000);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-8 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-4">FAQ et Chatbot</h2>
          <p className="text-muted-foreground">
            Questions fréquentes pour l'assistant automatique
          </p>
        </div>
        <Button onClick={addFAQ}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">Question #{index + 1}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFAQ(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  value={faq.question}
                  onChange={(e) => updateFAQ(index, { question: e.target.value })}
                  placeholder="Ex: Comment faire le check-in ?"
                />
              </div>

              <div className="space-y-2">
                <Label>Réponse</Label>
                <Textarea
                  value={faq.answer}
                  onChange={(e) => updateFAQ(index, { answer: e.target.value })}
                  placeholder="Réponse détaillée..."
                  rows={3}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
