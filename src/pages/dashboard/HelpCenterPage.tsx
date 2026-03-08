import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Home, Users, Wrench, Briefcase, ClipboardCheck,
  BookOpen, Euro, Target, Search, ChevronDown, ChevronUp, HelpCircle,
} from "lucide-react";

interface Guide {
  icon: any;
  title: string;
  category: string;
  description: string;
  howToUse: string[];
  bestPractice: string;
}

const guides: Guide[] = [
  {
    icon: LayoutDashboard,
    title: "Tableau de bord",
    category: "Pilotage",
    description: "Le tableau de bord centralise toutes les informations clés de votre conciergerie : missions en cours, indicateurs financiers, calendrier global et relances à effectuer.",
    howToUse: [
      "Consultez les KPI en haut de la page pour un aperçu rapide",
      "Cliquez sur les cartes de missions pour gérer les validations",
      "Utilisez le calendrier global pour visualiser les réservations",
      "Suivez les relances de prospection directement depuis le tableau de bord",
    ],
    bestPractice: "Consultez le tableau de bord chaque matin pour identifier les priorités du jour.",
  },
  {
    icon: Home,
    title: "Biens / Logements",
    category: "Exploitation",
    description: "Les logements représentent les biens que vous gérez. À partir d'un logement, vous pouvez créer des missions ménage, générer des états des lieux, gérer le propriétaire et publier un livret digital.",
    howToUse: [
      "Cliquez sur « Ajouter un bien » pour créer un logement",
      "Renseignez l'adresse, le type et les équipements",
      "Associez un propriétaire et connectez un calendrier iCal",
      "Accédez à la fiche du bien pour configurer les automatisations",
    ],
    bestPractice: "Ajoutez toujours le logement avant de créer des missions ou des états des lieux.",
  },
  {
    icon: Users,
    title: "Propriétaires",
    category: "Exploitation",
    description: "Gérez les propriétaires de vos biens. Chaque propriétaire peut accéder à son espace dédié pour suivre les réservations, revenus et documents de ses logements.",
    howToUse: [
      "Ajoutez un propriétaire avec son email et ses coordonnées",
      "Associez-lui un ou plusieurs logements",
      "Le propriétaire recevra un accès à son espace personnel",
      "Partagez les états des lieux et factures automatiquement",
    ],
    bestPractice: "Renseignez les adresses de facturation pour générer les factures propriétaires automatiquement.",
  },
  {
    icon: Wrench,
    title: "Prestataires",
    category: "Exploitation",
    description: "Les prestataires sont vos équipes terrain (ménage, maintenance, check-in). Ils reçoivent les missions et peuvent les gérer depuis leur espace dédié.",
    howToUse: [
      "Ajoutez un prestataire avec son email et numéro de téléphone",
      "Définissez ses spécialités (ménage, maintenance, etc.)",
      "Le prestataire recevra un accès à son espace de travail",
      "Suivez les performances et paiements de chaque prestataire",
    ],
    bestPractice: "Ajoutez toujours un prestataire avant de créer des missions pour pouvoir les assigner.",
  },
  {
    icon: Briefcase,
    title: "Missions",
    category: "Exploitation",
    description: "Les missions sont les tâches envoyées aux prestataires : ménage, check-in, check-out, maintenance. Vous pouvez les publier en mode ouvert ou les assigner directement.",
    howToUse: [
      "Créez une mission en sélectionnant un logement et un type",
      "Choisissez le mode d'attribution : ouvert ou direct",
      "Publiez la mission pour que les prestataires la reçoivent",
      "Validez les missions terminées et suivez les paiements",
    ],
    bestPractice: "Utilisez la synchronisation calendrier pour créer automatiquement les missions ménage après chaque départ.",
  },
  {
    icon: ClipboardCheck,
    title: "États des lieux",
    category: "Exploitation",
    description: "Les états des lieux permettent de documenter l'arrivée et la sortie des voyageurs avec photos, signatures et génération automatique de PDF.",
    howToUse: [
      "Préparez un état des lieux en sélectionnant un logement",
      "Les photos du dernier ménage sont ajoutées automatiquement",
      "Validez l'entrée avec les signatures voyageur et conciergerie",
      "Complétez la sortie avec les photos et commentaires",
    ],
    bestPractice: "Les photos du dernier ménage sont automatiquement ajoutées pour faciliter l'état des lieux d'entrée.",
  },
  {
    icon: BookOpen,
    title: "Livrets digitaux",
    category: "Exploitation",
    description: "Les livrets d'accueil digitaux remplacent les livrets papier. Ils contiennent toutes les informations utiles pour les voyageurs : Wi-Fi, règles, équipements, lieux à proximité.",
    howToUse: [
      "Créez un livret en l'associant à un logement",
      "Renseignez les informations pratiques (Wi-Fi, check-in/out)",
      "Ajoutez les équipements, règles et recommandations",
      "Publiez le livret et partagez le code d'accès aux voyageurs",
    ],
    bestPractice: "Personnalisez l'apparence du livret pour refléter l'identité de votre conciergerie.",
  },
  {
    icon: Euro,
    title: "Finances",
    category: "Finance",
    description: "Le module financier centralise les revenus, dépenses, factures propriétaires et suivi des paiements prestataires.",
    howToUse: [
      "Consultez le tableau de bord financier pour un aperçu global",
      "Créez des factures propriétaires automatiquement",
      "Suivez les dépenses par catégorie et par bien",
      "Gérez les paiements en espèces et prestataires",
    ],
    bestPractice: "Configurez les paramètres de facturation dans l'apparence pour des factures automatiques et professionnelles.",
  },
  {
    icon: Target,
    title: "Prospection",
    category: "Commercial",
    description: "Le CRM intégré vous permet de gérer vos prospects propriétaires, planifier des relances et suivre votre pipeline commercial.",
    howToUse: [
      "Ajoutez un prospect avec ses coordonnées et notes",
      "Planifiez des relances avec des dates de suivi",
      "Suivez le statut de chaque prospect dans le pipeline",
      "Convertissez un prospect en propriétaire une fois signé",
    ],
    bestPractice: "Planifiez toujours une date de relance lors de l'ajout d'un nouveau prospect.",
  },
];

export default function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = guides.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.category.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-[hsl(var(--gold))]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Aide & Guide</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Documentation complète de la plateforme MyWelkom
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un guide..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Guide Cards */}
      <div className="space-y-3">
        {filtered.map((guide, idx) => {
          const isOpen = expanded === guide.title;
          const Icon = guide.icon;
          return (
            <motion.div
              key={guide.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isOpen ? "border-[hsl(var(--gold))]/30 shadow-md" : ""
                }`}
                onClick={() => setExpanded(isOpen ? null : guide.title)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground">{guide.title}</h3>
                          <Badge variant="secondary" className="text-[10px]">{guide.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {guide.description}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 mt-1">
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 ml-13 space-y-4"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Comment utiliser
                        </h4>
                        <ul className="space-y-1.5">
                          {guide.howToUse.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--gold))]/[0.05] border border-[hsl(var(--gold))]/10">
                        <span className="text-sm">💡</span>
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-0.5">Bonne pratique</p>
                          <p className="text-sm text-muted-foreground">{guide.bestPractice}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
