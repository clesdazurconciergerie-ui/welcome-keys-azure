import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Star } from "lucide-react";
import { toast } from "sonner";

interface FAQ {
  id?: string;
  question: string;
  answer: string;
  order_index: number;
  is_favorite: boolean;
}

interface Step8FAQProps {
  data: any;
  onUpdate: (updates: any) => void;
}

export default function Step8FAQ({ data, onUpdate }: Step8FAQProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftFAQ, setDraftFAQ] = useState({ question: "", answer: "" });
  const bookletId = data?.id;
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

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
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Insert default FAQs if none exist
        const defaultFAQs = [
          { question: "Comment faire le check-in ?", answer: "Les instructions vous seront envoyées 24h avant.", order_index: 1, is_favorite: true },
          { question: "Où jeter les poubelles ?", answer: "Consultez la section 'Ménage et tri'.", order_index: 2, is_favorite: true },
          { question: "Le WiFi ne fonctionne pas ?", answer: "Vérifiez le mot de passe. En cas de problème, contactez-nous.", order_index: 3, is_favorite: false },
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

  const addFAQ = async () => {
    if (!draftFAQ.question.trim() || !draftFAQ.answer.trim()) {
      toast.error("La question et la réponse sont requises");
      return;
    }

    try {
      const { data: newFAQ, error } = await supabase
        .from("faq")
        .insert({
          booklet_id: bookletId,
          question: draftFAQ.question.trim(),
          answer: draftFAQ.answer.trim(),
          order_index: faqs.length,
        })
        .select()
        .single();

      if (error) throw error;

      setFaqs([...faqs, newFAQ]);
      setDraftFAQ({ question: "", answer: "" });
      toast.success("FAQ ajoutée");
    } catch (error) {
      console.error("Error adding FAQ:", error);
      toast.error("Erreur lors de l'ajout");
    }
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

  const updateFAQ = async (id: string, updates: Partial<FAQ>) => {
    if (!updates.question?.trim() && !updates.answer?.trim() && updates.is_favorite === undefined) {
      return;
    }

    // Update local state immediately (optimistic update)
    setFaqs(prev => {
      const updated = prev.map(faq => faq.id === id ? { ...faq, ...updates } : faq);
      // Re-sort to keep favorites on top
      return updated.sort((a, b) => {
        if (a.is_favorite === b.is_favorite) return 0;
        return a.is_favorite ? -1 : 1;
      });
    });

    // Debounced auto-save (except for is_favorite which saves immediately)
    if (updates.is_favorite !== undefined) {
      try {
        const { error } = await supabase
          .from("faq")
          .update({ is_favorite: updates.is_favorite })
          .eq("id", id);

        if (error) throw error;
        toast.success(updates.is_favorite ? "Ajoutée aux favoris" : "Retirée des favoris");
      } catch (error) {
        console.error("Error updating favorite:", error);
        toast.error("Erreur lors de la mise à jour");
      }
      return;
    }

    const faqKey = id;
    if (saveTimeoutRef.current[faqKey]) {
      clearTimeout(saveTimeoutRef.current[faqKey]);
    }
    
    saveTimeoutRef.current[faqKey] = setTimeout(async () => {
      try {
        const faq = faqs.find(f => f.id === id);
        if (!faq) return;

        const { error } = await supabase
          .from("faq")
          .update({
            question: updates.question || faq.question,
            answer: updates.answer || faq.answer,
          })
          .eq("id", id);

        if (error) throw error;
      } catch (error) {
        console.error("Error updating FAQ:", error);
        toast.error("Erreur lors de la mise à jour");
      }
      delete saveTimeoutRef.current[faqKey];
    }, 1000);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-8 md:space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">FAQ et Chatbot</h2>
        <p className="text-muted-foreground">
          Questions fréquentes pour l'assistant automatique
        </p>
      </div>

      {/* Draft Form for adding new FAQ */}
      <Card className="p-4 bg-muted/50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Ajouter une question
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={draftFAQ.question}
              onChange={(e) => setDraftFAQ({ ...draftFAQ, question: e.target.value })}
              placeholder="Ex: Comment faire le check-in ?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  addFAQ();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Réponse</Label>
            <Textarea
              value={draftFAQ.answer}
              onChange={(e) => setDraftFAQ({ ...draftFAQ, answer: e.target.value })}
              placeholder="Réponse détaillée..."
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  addFAQ();
                }
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={addFAQ}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            <Button
              variant="outline"
              onClick={() => setDraftFAQ({ question: "", answer: "" })}
            >
              Réinitialiser
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Appuyez sur Ctrl+Entrée pour ajouter rapidement
          </p>
        </div>
      </Card>

      {/* Existing FAQs List */}
      <div className="space-y-4">
        {faqs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucune question ajoutée. Remplissez le formulaire ci-dessus pour ajouter une FAQ.
            </p>
          </Card>
        ) : (
          faqs.map((faq, index) => (
            <Card key={faq.id} className="p-4">
              {editingId === faq.id ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Modifier la question #{index + 1}</h3>
                  </div>

                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Input
                      value={faq.question}
                      onChange={(e) => updateFAQ(faq.id!, { question: e.target.value })}
                      placeholder="Ex: Comment faire le check-in ?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Réponse</Label>
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => updateFAQ(faq.id!, { answer: e.target.value })}
                      placeholder="Réponse détaillée..."
                      rows={3}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Terminé
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold">Question #{index + 1}</h3>
                      <button
                        onClick={() => updateFAQ(faq.id!, { is_favorite: !faq.is_favorite })}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        title={faq.is_favorite ? "Visible dans le livret" : "Utilisée uniquement pour le chatbot"}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            faq.is_favorite
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300 hover:text-yellow-400"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(faq.id!)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFAQ(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2">
                    {faq.is_favorite ? (
                      <span className="text-green-600">✅ Affichée dans le livret (favori)</span>
                    ) : (
                      <span className="text-orange-600">⚙️ Utilisée uniquement pour le chatbot</span>
                    )}
                  </div>

                  <div>
                    <p className="font-medium text-sm mb-1">Q: {faq.question}</p>
                    <p className="text-sm text-muted-foreground">R: {faq.answer}</p>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
