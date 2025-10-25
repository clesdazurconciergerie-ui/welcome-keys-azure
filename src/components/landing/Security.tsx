import { Shield, Lock, Eye, FileCheck } from "lucide-react";
import { motion } from "framer-motion";

const Security = () => {
  const securityPoints = [
    {
      icon: Lock,
      title: "Données chiffrées",
      description: "Toutes vos données sont chiffrées et hébergées sur des serveurs sécurisés.",
    },
    {
      icon: Eye,
      title: "Wi-Fi sécurisé",
      description: "Mot de passe Wi-Fi accessible uniquement avec le code PIN de votre livret.",
    },
    {
      icon: Shield,
      title: "Accès RLS par utilisateur",
      description: "Row Level Security garantit que seul vous avez accès à vos livrets.",
    },
    {
      icon: FileCheck,
      title: "Conforme RGPD",
      description: "Respect total de votre vie privée et de celle de vos voyageurs.",
    },
  ];

  return (
    <section id="security" className="py-20 md:py-24 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Sécurité & confidentialité
          </h2>
          <p className="text-lg text-muted-foreground">
            Vos données et celles de vos invités sont notre priorité
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {securityPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex gap-4 p-6 rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <point.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {point.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{point.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Security;
