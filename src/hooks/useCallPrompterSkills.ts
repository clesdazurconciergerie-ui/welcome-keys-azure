import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CallSkill {
  id: string;
  name: string;
  description: string | null;
  prompt_content: string;
  priority: "low" | "medium" | "high";
  is_active: boolean;
  is_default: boolean;
  order_index: number;
}

export interface CustomScript {
  pitch: string;
  key_phrases: string;
  unique_selling_points: string;
}

const DEFAULT_SKILLS: Omit<CallSkill, "id">[] = [
  {
    name: "Cold Call Conversion",
    description: "Transformer un appel froid en rendez-vous qualifié. Techniques d'accroche, qualification rapide et prise de RDV.",
    prompt_content: `OBJECTIF : Transformer un appel froid en rendez-vous (R1).
RÈGLES :
- Accroche en moins de 10 secondes
- Qualifier le prospect en 2-3 questions
- Ne jamais vendre au téléphone — vendre le RDV
- "20 minutes sans engagement" est ton arme principale
- Si le prospect pose des questions techniques → "Excellente question, c'est exactement ce qu'on couvre en RDV"
STRUCTURE D'APPEL :
1. Accroche (qui je suis + pourquoi j'appelle)
2. Question de douleur ("Êtes-vous satisfait de vos revenus locatifs ?")
3. Teaser de valeur (1 phrase max)
4. Close RDV ("Mardi ou jeudi ?")`,
    priority: "high",
    is_active: true,
    is_default: true,
    order_index: 0,
  },
  {
    name: "Objection Handling",
    description: "Traiter toutes les objections courantes avec le framework Écouter → Accuser réception → Clarifier → Répondre → Confirmer.",
    prompt_content: `FRAMEWORK OBJECTIONS : Écouter → Accuser réception → Clarifier → Répondre → Confirmer
DISTINGUER :
- Brush-off (dit avant d'écouter) → Ignorer, poser une question de curiosité
- Vraie objection (avec raison) → Framework complet
- Signal d'achat déguisé ("C'est combien ?") → Répondre vite, close assumptif

SCRIPTS :
"Pas intéressé" → "C'est normal — juste une question : vous êtes satisfait de vos revenus locatifs ?"
"J'ai déjà une conciergerie" → "Très bien — et vous en êtes satisfait à 100% ?"
"Envoyez-moi un mail" → "Ça n'aurait aucun intérêt sans connaître votre bien — qu'est-ce qui vous freinerait à faire 20 minutes ensemble ?"
"C'est pas le bon moment" → "On n'a pas besoin d'une décision maintenant — juste 20 minutes pour voir si ça a du sens."
"20% c'est trop cher" → "La vraie question c'est pas combien vous payez — c'est combien vous gardez."
"Je gère moi-même" → "Combien d'heures vous y passez par mois, à vue d'œil ?"
"J'ai besoin d'y réfléchir" → "Bien sûr — qu'est-ce qui vous manque pour décider ?"`,
    priority: "high",
    is_active: true,
    is_default: true,
    order_index: 1,
  },
  {
    name: "Closing R1 → Signature",
    description: "Techniques de closing pour convertir un prospect intéressé en client signé.",
    prompt_content: `OBJECTIF : Obtenir le R1, JAMAIS la signature au téléphone.
TECHNIQUES :
- CLOSE ASSUMPTIF : "On se retrouve mardi ou jeudi ?" (pas "est-ce qu'on se retrouve")
- MIRRORING : Répéter ses 3 derniers mots, silence, laisser continuer
- SILENCE STRATÉGIQUE : Après question de closing, ne rien dire 4-8 secondes
- REFORMULATION DOULEUR : "Donc le vrai problème c'est [X] — c'est ça ?"
- ÉCHELLE 1-10 : "Sur une échelle de 1 à 10, vous en êtes où ?" → "C'est quoi qui vous ferait passer à 10 ?"
- ALTERNATIVE FAUSSE : "Début ou fin de semaine ?" / "Mardi matin ou jeudi après-midi ?"

ANTI-PATTERNS :
- "Je vous explique comment on fonctionne..." → on devient une brochure
- "Est-ce que ça vous intéresserait ?" → porte de sortie facile
- Parler plus que le prospect → la vente se fait dans l'écoute`,
    priority: "medium",
    is_active: true,
    is_default: true,
    order_index: 2,
  },
];

export function useCallPrompterSkills() {
  const [skills, setSkills] = useState<CallSkill[]>([]);
  const [script, setScript] = useState<CustomScript>({ pitch: "", key_phrases: "", unique_selling_points: "" });
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("call_prompter_skills")
      .select("*")
      .eq("user_id", user.id)
      .order("order_index", { ascending: true });

    if (!data || data.length === 0) {
      // Seed default skills
      const inserts = DEFAULT_SKILLS.map((s, i) => ({
        ...s,
        user_id: user.id,
        order_index: i,
      }));
      const { data: seeded } = await (supabase as any)
        .from("call_prompter_skills")
        .insert(inserts)
        .select();
      setSkills(seeded || []);
    } else {
      setSkills(data);
    }
  }, []);

  const fetchScript = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("call_prompter_scripts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setScript({
        pitch: data.pitch || "",
        key_phrases: data.key_phrases || "",
        unique_selling_points: data.unique_selling_points || "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSkills(); fetchScript(); }, [fetchSkills, fetchScript]);

  const addSkill = async (skill: Omit<CallSkill, "id" | "is_default" | "order_index">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await (supabase as any)
      .from("call_prompter_skills")
      .insert({
        ...skill,
        user_id: user.id,
        is_default: false,
        order_index: skills.length,
      })
      .select()
      .single();

    if (error) { toast.error("Erreur ajout skill"); return; }
    setSkills(prev => [...prev, data]);
    toast.success("Skill ajouté");
  };

  const updateSkill = async (id: string, updates: Partial<CallSkill>) => {
    const { error } = await (supabase as any)
      .from("call_prompter_skills")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) { toast.error("Erreur mise à jour"); return; }
    setSkills(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSkill = async (id: string) => {
    const { error } = await (supabase as any)
      .from("call_prompter_skills")
      .delete()
      .eq("id", id);

    if (error) { toast.error("Erreur suppression"); return; }
    setSkills(prev => prev.filter(s => s.id !== id));
    toast.success("Skill supprimé");
  };

  const toggleSkill = async (id: string) => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return;
    await updateSkill(id, { is_active: !skill.is_active });
  };

  const reorderSkills = async (reordered: CallSkill[]) => {
    setSkills(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await (supabase as any)
        .from("call_prompter_skills")
        .update({ order_index: i })
        .eq("id", reordered[i].id);
    }
  };

  const saveScript = async (newScript: CustomScript) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from("call_prompter_scripts")
      .upsert({ ...newScript, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    setScript(newScript);
    toast.success("Script sauvegardé");
  };

  return {
    skills, script, loading,
    addSkill, updateSkill, deleteSkill, toggleSkill, reorderSkills,
    saveScript,
  };
}
