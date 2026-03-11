import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EmailTemplate = {
  id: string;
  user_id: string;
  etape: number;
  delai_jours: number;
  email_subject: string;
  email_body: string;
  actif: boolean;
  created_at: string;
};

const DEFAULT_TEMPLATES = [
  {
    etape: 1,
    delai_jours: 1,
    email_subject: "Suite à notre échange — Estimation revenus pour votre bien",
    email_body: "Bonjour {{prenom}},\n\nSuite à notre échange de ce jour, je vous transmets l'estimation de revenus pour votre bien situé à {{ville}}.\n\nNous générons en moyenne 30% de revenus supplémentaires pour des biens similaires dans votre secteur.\n\nN'hésitez pas à me contacter pour en discuter.\n\nCordialement,\n{{expediteur}}",
  },
  {
    etape: 2,
    delai_jours: 4,
    email_subject: "Un exemple concret près de chez vous — {{ville}}",
    email_body: "Bonjour {{prenom}},\n\nJe vous partage un cas concret : un propriétaire à {{ville}} que nous accompagnons générait 900€/mois. Aujourd'hui il génère 1 450€/mois, sans rien faire.\n\nVotre bien a le même potentiel.\n\nAvez-vous eu le temps de regarder l'estimation ?\n\nCordialement,\n{{expediteur}}",
  },
  {
    etape: 3,
    delai_jours: 10,
    email_subject: "Taux d'occupation à {{ville}} ce mois-ci",
    email_body: "Bonjour {{prenom}},\n\nCe mois-ci sur {{ville}}, le taux d'occupation des biens bien gérés dépasse 75%.\n\nLes propriétaires qui délèguent en récoltent les fruits dès la première saison.\n\nJe suis disponible 20 minutes cette semaine si vous voulez qu'on regarde ensemble.\n\nCordialement,\n{{expediteur}}",
  },
  {
    etape: 4,
    delai_jours: 18,
    email_subject: "Rapport marché Côte d'Azur — {{ville}}",
    email_body: "Bonjour {{prenom}},\n\nLes biens 3+ chambres connaissent une forte demande cet été sur notre secteur.\n\nC'est le bon moment pour optimiser votre bien à {{ville}}.\n\nToujours disponible pour un échange.\n\nCordialement,\n{{expediteur}}",
  },
  {
    etape: 5,
    delai_jours: 30,
    email_subject: "Je passe dans votre secteur la semaine prochaine",
    email_body: "Bonjour {{prenom}},\n\nJe passe près de {{ville}} la semaine prochaine.\n\nSeriez-vous disponible 20 minutes pour qu'on se rencontre et que je vous montre concrètement ce qu'on peut faire pour votre bien ?\n\nCordialement,\n{{expediteur}}",
  },
  {
    etape: 6,
    delai_jours: 45,
    email_subject: "On reste en contact — Actualité du marché",
    email_body: "Bonjour {{prenom}},\n\nJe vous contacte pour rester en lien et vous tenir informé des évolutions du marché locatif sur la Côte d'Azur.\n\nN'hésitez pas si votre situation évolue.\n\nCordialement,\n{{expediteur}}",
  },
];

export function useEmailTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email_templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("email_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("etape", { ascending: true });
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const seedTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    // Check if templates already exist
    const { data: existing } = await (supabase as any)
      .from("email_templates")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) return; // Already seeded

    const rows = DEFAULT_TEMPLATES.map(t => ({ ...t, user_id: user.id }));
    const { error } = await (supabase as any)
      .from("email_templates")
      .insert(rows);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["email_templates"] });
  };

  return { templates, isLoading, seedTemplates };
}
