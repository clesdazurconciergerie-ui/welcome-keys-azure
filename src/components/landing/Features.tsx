import { Card, CardContent } from "@/components/ui/card";
import { Lock, Wand2, MessageCircle, FolderTree, Palette, QrCode } from "lucide-react";
import { motion } from "framer-motion";

const Features = () => {
  const features = [
    {
      icon: Lock,
      title: "Accès par code PIN",
      description:
        "Partagez un code unique et sécurisé. Vos invités accèdent instantanément sans inscription.",
    },
    {
      icon: Wand2,
      title: "Éditeur intelligent",
      description:
        "Interface intuitive avec sections personnalisables. Ajoutez photos, infos pratiques et recommandations.",
    },
    {
      icon: MessageCircle,
      title: "Chatbot intégré",
      description:
        "Assistant virtuel disponible 24/7 pour répondre aux questions de vos voyageurs automatiquement.",
    },
    {
      icon: FolderTree,
      title: "Multi-biens",
      description:
        "Gérez plusieurs propriétés, dupliquez vos livrets et organisez tout depuis un seul tableau de bord.",
    },
    {
      icon: Palette,
      title: "Apparence personnalisée",
      description:
        "Ajoutez votre logo, vos couleurs et créez une expérience unique à votre image.",
    },
    {
      icon: QrCode,
      title: "QR code à imprimer",
      description:
        "Générez automatiquement un QR code élégant à afficher dans votre logement.",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-24 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Fonctionnalités clés
          </h2>
          <p className="text-lg text-muted-foreground">
            Tout ce dont vous avez besoin pour créer un livret d'accueil professionnel
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 group">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {feature.description}
                  </p>
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
