import { Home, Building2, Hotel, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const ForEveryone = () => {
  const targets = [
    {
      icon: Home,
      title: "Propriétaires particuliers",
      features: [
        "1 à 5 biens",
        "Code PIN unique par bien",
        "QR code à imprimer",
      ],
    },
    {
      icon: Building2,
      title: "Conciergeries",
      features: [
        "Multi-biens illimité",
        "Gestion centralisée",
        "Personnalisation par client",
      ],
    },
    {
      icon: Hotel,
      title: "Maisons d'hôtes",
      features: [
        "Informations communes",
        "Règles de la maison",
        "Recommandations locales",
      ],
    },
    {
      icon: Key,
      title: "Hôtels & résidences",
      features: [
        "Branding complet",
        "Multi-utilisateurs",
        "Support prioritaire",
      ],
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Un livret digital pour tous
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Quelle que soit la taille de votre activité
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {targets.map((target, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 bg-white rounded-[18px] border border-border hover:shadow-lg transition-all hover:border-primary/20"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <target.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-4">
                  {target.title}
                </h3>
                <ul className="space-y-2 mb-6">
                  {target.features.map((feature, j) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full rounded-[18px]"
                >
                  Voir un exemple
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ForEveryone;
