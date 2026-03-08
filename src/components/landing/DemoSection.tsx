import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Building2, UserCheck, Check } from "lucide-react";

const DemoSection = () => {
  const navigate = useNavigate();

  const audiences = [
    {
      icon: Building2,
      title: "Pour les conciergeries",
      points: ["CRM de prospection intégré", "Dashboard performance en temps réel", "Gestion prestataires & ménage", "Scalabilité multi-logements"],
      accent: "from-primary/10 to-primary/[0.02]",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: UserCheck,
      title: "Pour les propriétaires",
      points: ["Revenus mensuels visibles", "Taux d'occupation transparent", "Photos ménage en temps réel", "Documents centralisés"],
      accent: "from-gold/10 to-gold/[0.02]",
      iconBg: "bg-gold/10",
      iconColor: "text-gold",
    },
  ];

  return (
    <section id="demo" className="py-20 lg:py-28 bg-background scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-gold bg-gold/10 mb-4">
            Double usage
          </span>
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Transparence totale pour vos propriétaires
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pilotez vos performances en temps réel et impressionnez vos propriétaires
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
          {audiences.map((audience, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-card rounded-2xl p-8 border border-border hover:border-gold/20 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${audience.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${audience.iconBg} flex items-center justify-center`}>
                    <audience.icon className={`w-6 h-6 ${audience.iconColor}`} />
                  </div>
                  <h3 className="!text-[1.25rem] font-bold text-foreground">{audience.title}</h3>
                </div>
                <ul className="space-y-3.5">
                  {audience.points.map((point, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-gold" strokeWidth={3} />
                      </div>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="text-center">
          <div className="inline-flex items-center gap-6 text-xs text-muted-foreground bg-secondary/80 rounded-full px-6 py-3 border border-border">
            <span>⚡ Déploiement en 24h</span>
            <span className="w-px h-3 bg-border" />
            <span>📱 Compatible tous appareils</span>
            <span className="w-px h-3 bg-border hidden sm:block" />
            <span className="hidden sm:inline">🔒 Données sécurisées RGPD</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DemoSection;
