import { Check, Shield, X } from "lucide-react";
import { motion } from "framer-motion";

const AnnouncementBar = () => {
  const features = [
    { icon: Check, text: "Aucune carte bancaire requise" },
    { icon: X, text: "Annulation en 1 clic" },
    { icon: Shield, text: "Sécurité RGPD & RLS Supabase" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="border-y border-border bg-secondary/50 py-3"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <feature.icon className="w-4 h-4 text-primary" />
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AnnouncementBar;
