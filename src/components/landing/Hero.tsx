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
          background: 'radial-gradient(ellipse at top, rgba(24, 192, 223, 0.08), transparent 60%)'
        }}
      />

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div 
            className="relative z-10 text-center lg:text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Main Title */}
            <motion.h1 
              variants={itemVariants}
              className="font-display font-bold text-foreground text-4xl sm:text-5xl md:text-6xl leading-tight"
            >
              Améliorez l'expérience de vos voyageurs.
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              variants={itemVariants}
              className="mt-6 text-lg text-muted-foreground leading-relaxed"
            >
              Créez, publiez et partagez un livret d'accueil digital professionnel en quelques minutes.
              Accès par code PIN, QR code et chatbot intégré.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              variants={itemVariants}
              className="mt-8 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4"
            >
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="h-12 px-8 bg-primary hover:bg-[hsl(var(--brand-cyan-hover))] text-white rounded-[18px] shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/acces-livret")}
                className="h-12 px-8 border-2 rounded-[18px] transition-all"
              >
                <Play className="w-5 h-5 mr-2" />
                Voir une démo
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div 
              variants={itemVariants}
              className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Déjà 3 000+ livrets créés</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">★</span>
                <span>Note moyenne 4,8/5</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80" 
                alt="Welkom app mockup"
                className="w-full max-w-md mx-auto rounded-[24px] shadow-2xl border border-border"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
