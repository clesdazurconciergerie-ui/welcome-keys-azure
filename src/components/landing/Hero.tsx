import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Play } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-secondary/30 to-white pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Subtle gradient overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-40" 
        style={{
          background: 'radial-gradient(ellipse at top, rgba(24, 192, 223, 0.1), transparent 60%)'
        }}
      />

      <motion.div 
        className="relative z-10 mx-auto max-w-6xl px-4 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Title */}
        <motion.h1 
          variants={itemVariants}
          className="font-display font-bold text-foreground text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight tracking-tight"
        >
          Le livret d'accueil digital qui{" "}
          <span className="text-primary">impressionne</span> vos voyageurs.
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          variants={itemVariants}
          className="mx-auto mt-6 max-w-3xl text-lg sm:text-xl text-muted-foreground leading-relaxed"
        >
          Créez, publiez et partagez un livret professionnel en quelques minutes, 
          avec accès par code PIN et chatbot intégré.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          variants={itemVariants}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="group h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Essayer gratuitement
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/acces-livret")}
            className="h-14 px-8 text-lg border-2 hover:bg-secondary rounded-2xl transition-all"
          >
            <Play className="w-5 h-5 mr-2" />
            Voir une démo
          </Button>
        </motion.div>

        {/* Social Proof */}
        <motion.div 
          variants={itemVariants}
          className="mt-12 flex flex-col items-center gap-6"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-primary text-xl">✓</span>
              <span>Déjà 3 000+ livrets créés</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary text-xl">★</span>
              <span>Note moyenne 4,8/5</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
