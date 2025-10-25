import { Card, CardContent } from "@/components/ui/card";
import { Lock, FileEdit, MessageCircle, QrCode, FolderTree, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

const Features = () => {
  const features = [
    {
      icon: Lock,
      title: "Accès par code PIN",
      description:
        "Partagez un code unique. Vos invités consultent le livret sans créer de compte. Simple et sécurisé.",
    },
    {
      icon: FileEdit,
      title: "Éditeur complet",
      description:
        "Sections personnalisables, photos, lieux d'intérêt, notices d'équipements. Tout ce dont vous avez besoin.",
    },
    {
      icon: MessageCircle,
      title: "Chatbot intégré",
      description:
        "Il répond aux questions de vos voyageurs 24/7 à partir des informations du livret. FAQ non visible publiquement.",
    },
    {
      icon: QrCode,
      title: "QR code & partage",
      description:
        "Lien court prêt à partager, QR code à imprimer. Vos invités accèdent au livret en un scan.",
    },
    {
      icon: FolderTree,
      title: "Multi-biens",
      description:
        "Gérez plusieurs propriétés, dupliquez vos livrets, organisez vos locations en toute simplicité.",
    },
    {
      icon: Smartphone,
      title: "Design premium",
      description:
        "Interface mobile-first, design élégant, chargement rapide. Une expérience utilisateur exceptionnelle.",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            Fonctionnalités clés
          </h2>
          <p className="text-lg md:text-xl text-[#6C6C6C] max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour créer des livrets d'accueil professionnels
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-[#ECEEF3] hover:shadow-lg transition-all duration-300 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[#6C6C6C] leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
