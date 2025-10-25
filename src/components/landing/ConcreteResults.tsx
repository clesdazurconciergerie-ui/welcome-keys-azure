import { Clock, Palette, MessageCircle, Sparkles, Settings, Coins } from "lucide-react";
import { motion } from "framer-motion";

const ConcreteResults = () => {
  const results = [
    {
      icon: Clock,
      title: "Gain de temps",
      description: "Centralisez toutes les infos. Ne répétez plus jamais les mêmes consignes.",
    },
    {
      icon: Palette,
      title: "Personnalisation complète",
      description: "Couleurs, logo, photos — votre livret reflète votre identité.",
    },
    {
      icon: MessageCircle,
      title: "Moins de messages répétitifs",
      description: "Le chatbot répond automatiquement aux questions courantes.",
    },
    {
      icon: Sparkles,
      title: "Image professionnelle",
      description: "Offrez une première impression moderne et soignée à vos invités.",
    },
    {
      icon: Settings,
      title: "Gestion flexible",
      description: "Modifiez votre livret à tout moment, les mises à jour sont instantanées.",
    },
    {
      icon: Coins,
      title: "Économies réalisées",
      description: "Réduisez les impressions papier et les appels d'assistance.",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Des résultats concrets
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Rejoignez les milliers d'hôtes qui ont transformé leur gestion
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 bg-white rounded-[18px] border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <result.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  {result.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ConcreteResults;
