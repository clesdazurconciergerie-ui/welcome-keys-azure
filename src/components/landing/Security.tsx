import { Shield, Lock, Eye, FileCheck } from "lucide-react";
import { motion } from "framer-motion";

const Security = () => {
  const securityPoints = [
    {
      icon: Eye,
      title: "Données sensibles protégées",
      description: "Emails et téléphones des propriétaires jamais affichés publiquement.",
    },
    {
      icon: Lock,
      title: "Wi-Fi sécurisé",
      description: "Mot de passe servi uniquement via endpoint sécurisé par code PIN.",
    },
    {
      icon: Shield,
      title: "Protection RLS",
      description: "Row Level Security Supabase et endpoints serveur filtrants pour vos données.",
    },
    {
      icon: FileCheck,
      title: "RGPD conforme",
      description: "Collecte minimale de données, logs réduits, respect de votre vie privée.",
    },
  ];

  return (
    <section id="security" className="py-20 md:py-32 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            Sécurité & confidentialité
          </h2>
          <p className="text-lg md:text-xl text-[#6C6C6C] max-w-2xl mx-auto mb-8">
            Vos données et celles de vos invités sont notre priorité
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto mb-12">
          {securityPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex gap-4 p-6 rounded-xl border border-[#ECEEF3] hover:shadow-md transition-all duration-300"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <point.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-primary mb-2">
                  {point.title}
                </h3>
                <p className="text-[#6C6C6C] text-sm leading-relaxed">{point.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-3 py-2"
          >
            En savoir plus sur notre sécurité
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Security;
