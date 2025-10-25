import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Play } from "lucide-react";
import { motion } from "framer-motion";
const Hero = () => {
  const navigate = useNavigate();
  const scrollToFeatures = () => {
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };
  return <section className="relative overflow-hidden bg-gradient-to-b from-white via-secondary/30 to-white pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{
      background: 'radial-gradient(ellipse at top, rgba(24, 192, 223, 0.08), transparent 60%)'
    }} />

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <motion.div className="relative z-10 text-center lg:text-left" variants={containerVariants} initial="hidden" animate="visible">
            {/* Main Title */}
            <motion.h1 variants={itemVariants} className="font-display font-bold text-foreground">
              Améliorez l'expérience de vos voyageurs.
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={itemVariants} className="mt-4 lg:mt-6 text-muted-foreground leading-relaxed">
              Créez, publiez et partagez un livret d'accueil digital professionnel en quelques minutes.
              Accès par code PIN, QR code et chatbot intégré.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="mt-6 lg:mt-8 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3">
              <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto h-12 px-6 bg-primary hover:bg-[hsl(var(--brand-cyan-hover))] text-white rounded-[18px] shadow-lg hover:shadow-xl transition-all">
                <Sparkles className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/acces-livret")} className="w-full sm:w-auto h-12 px-6 border-2 rounded-[18px] transition-all">
                <Play className="w-5 h-5 mr-2" />
                Voir une démo
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div variants={itemVariants} className="mt-6 lg:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 lg:gap-6 text-sm text-muted-foreground">
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
          <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.8,
          delay: 0.3
        }} className="relative">
            <div className="relative aspect-[4/3] lg:aspect-auto">
              
            </div>
          </motion.div>
        </div>
      </div>
    </section>;
};
export default Hero;