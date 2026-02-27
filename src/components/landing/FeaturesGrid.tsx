import { motion } from "framer-motion";
import { BarChart3, Users, Home, Wrench, Camera, BookOpen, CalendarSync, UserPlus } from "lucide-react";

const FeaturesGrid = () => {
  const features = [
    {
      icon: UserPlus,
      title: "CRM de prospection",
      description: "Pipeline Kanban, suivi appels, historique échanges. Convertissez plus de propriétaires.",
      tag: "Conciergeries"
    },
    {
      icon: Users,
      title: "Fiches propriétaires",
      description: "Centralisation des infos, documents, performances et historique d'interventions.",
      tag: "Conciergeries"
    },
    {
      icon: Home,
      title: "Gestion logements",
      description: "Calendrier iCal synchronisé, check-in/out, revenus par période en un coup d'œil.",
      tag: "Conciergeries"
    },
    {
      icon: Wrench,
      title: "Gestion prestataires",
      description: "Fiches, zones, tarifs, affectation automatique et notifications de mission.",
      tag: "Conciergeries"
    },
    {
      icon: Camera,
      title: "Validation ménage photo",
      description: "Upload avant/après obligatoire. Validation par la conciergerie. Visible côté propriétaire.",
      tag: "Qualité"
    },
    {
      icon: BarChart3,
      title: "Dashboard performance",
      description: "KPIs en temps réel : revenus, occupation, conversion. Graphiques clairs et exportables.",
      tag: "Analytics"
    },
    {
      icon: CalendarSync,
      title: "Espace propriétaire",
      description: "Accès sécurisé aux revenus, occupation, photos ménage et documents. Élégant et rassurant.",
      tag: "Propriétaires"
    },
    {
      icon: BookOpen,
      title: "Livret d'accueil digital",
      description: "QR code personnalisé, recommandations, règlement, chatbot IA. Vos livrets existants conservés.",
      tag: "Voyageurs"
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-28 bg-background scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-gold bg-gold/10 mb-4">
            Plateforme complète
          </span>
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Centralisez, analysez, optimisez
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Une gestion moderne pour des conciergeries ambitieuses
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="group bg-card rounded-2xl p-6 border border-border hover:border-gold/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary/5 group-hover:bg-gold/10 transition-colors">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-gold transition-colors" strokeWidth={1.75} />
              </div>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-gold mb-2">{feature.tag}</span>
              <h3 className="!text-[1rem] font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
