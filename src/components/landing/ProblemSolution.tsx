import { motion } from "framer-motion";
import { MessageSquareX, FileSpreadsheet, Eye, TrendingDown, BarChart3, Smartphone, Users, Shield } from "lucide-react";

const ProblemSolution = () => {
  const problems = [
    { icon: MessageSquareX, text: "Communication dispersée (WhatsApp, SMS, emails)" },
    { icon: FileSpreadsheet, text: "Suivi sur Excel, sans vision globale" },
    { icon: Eye, text: "Aucune transparence pour les propriétaires" },
    { icon: TrendingDown, text: "Données de performance inaccessibles" },
  ];

  const solutions = [
    { icon: BarChart3, text: "Dashboard centralisé avec KPIs en temps réel" },
    { icon: Smartphone, text: "Livret d'accueil digital + chatbot IA intégré" },
    { icon: Users, text: "Espace propriétaire connecté et transparent" },
    { icon: Shield, text: "Gestion prestataires & validation ménage photo" },
  ];

  return (
    <section className="py-20 lg:py-28 bg-secondary">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Les conciergeries méritent mieux qu'un tableur
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Passez d'une gestion artisanale à une plateforme professionnelle orientée résultats
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Problems */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card rounded-2xl p-8 border border-border"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <h3 className="!text-[1.25rem] font-bold text-foreground">Le quotidien actuel</h3>
            </div>
            <ul className="space-y-4">
              {problems.map((p, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className="flex items-start gap-3">
                  <p.icon className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-muted-foreground">{p.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Solutions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card rounded-2xl p-8 border-2 border-gold/30 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <h3 className="!text-[1.25rem] font-bold text-foreground">Avec MyWelkom</h3>
            </div>
            <ul className="space-y-4">
              {solutions.map((s, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className="flex items-start gap-3">
                  <s.icon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-foreground">{s.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;
