import { motion } from "framer-motion";
import { MessageSquareX, FileSpreadsheet, Eye, TrendingDown, BarChart3, Smartphone, Users, Shield, ArrowRight } from "lucide-react";

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
    <section className="py-20 lg:py-28 bg-secondary relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div className="mx-auto max-w-6xl px-6 lg:px-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-gold bg-gold/10 mb-4">
            Avant / Après
          </span>
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Les conciergeries méritent mieux qu'un tableur
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Passez d'une gestion artisanale à une plateforme professionnelle orientée résultats
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-4 items-stretch">
          {/* Problems */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card rounded-2xl p-8 border border-border relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/50 to-destructive/10" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <span className="text-lg">⚠️</span>
              </div>
              <h3 className="!text-[1.25rem] font-bold text-foreground">Le quotidien actuel</h3>
            </div>
            <ul className="space-y-4">
              {problems.map((p, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-destructive/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <p.icon className="w-4 h-4 text-destructive" strokeWidth={2} />
                  </div>
                  <span className="text-muted-foreground">{p.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center"
            >
              <ArrowRight className="w-5 h-5 text-gold" />
            </motion.div>
          </div>

          {/* Solutions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card rounded-2xl p-8 border-2 border-gold/20 relative overflow-hidden shadow-lg"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold to-gold-light" />
            <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.03] to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <span className="text-lg">✨</span>
                </div>
                <h3 className="!text-[1.25rem] font-bold text-foreground">Avec MyWelkom</h3>
              </div>
              <ul className="space-y-4">
                {solutions.map((s, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <s.icon className="w-4 h-4 text-gold" strokeWidth={2} />
                    </div>
                    <span className="text-foreground">{s.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;
