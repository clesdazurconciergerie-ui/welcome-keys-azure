import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Play } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  
  const handleDemoClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth?mode=demo');
      return;
    }

    try {
      toast.loading("Activation de la démo...");
      
      const response = await supabase.functions.invoke('activate-demo', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        toast.dismiss();
        toast.error("Impossible d'activer la démo. Vous l'avez peut-être déjà utilisée.");
        return;
      }

      toast.dismiss();
      toast.success("Démo activée ! Redirection...");
      
      setTimeout(() => {
        navigate('/booklets/new');
      }, 1000);
    } catch (error) {
      toast.dismiss();
      console.error('Error activating demo:', error);
      toast.error("Une erreur est survenue lors de l'activation de la démo");
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
        <div className="max-w-4xl mx-auto">
          {/* Content */}
          <motion.div className="relative z-10 text-center" variants={containerVariants} initial="hidden" animate="visible">
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
            <motion.div variants={itemVariants} className="mt-6 lg:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button 
                size="lg" 
                onClick={() => navigate("/acces-livret")} 
                className="w-full sm:w-auto h-12 px-6 bg-[#071552] text-white rounded-[18px] 
                  shadow-[0_6px_18px_rgba(7,21,82,0.18)] transition-all duration-200 ease-out
                  hover:bg-[#0b1b6a] hover:shadow-[0_10px_24px_rgba(7,21,82,0.28)] 
                  hover:-translate-y-[1px] hover:scale-[1.015]
                  active:bg-[#061142] active:shadow-[0_4px_12px_rgba(7,21,82,0.24)] active:translate-y-0 active:scale-100
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
                  disabled:bg-[#aab0c5] disabled:text-[#f4f5f9] disabled:shadow-none disabled:cursor-not-allowed
                  disabled:transform-none
                  motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
                aria-label="Voir un livret d'accueil via code PIN"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Voir un livret
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleDemoClick} 
                className="w-full sm:w-auto h-12 px-6 border-2 border-[#071552] text-[#071552] bg-white rounded-[18px] 
                  transition-all duration-200 ease-out
                  hover:bg-[#071552] hover:text-white hover:shadow-md
                  active:bg-[#061142]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]"
                aria-label="Demander une démo gratuite"
              >
                <Play className="w-5 h-5 mr-2" />
                Demander une démo
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div variants={itemVariants} className="mt-6 lg:mt-8 flex flex-wrap items-center justify-center gap-4 lg:gap-6 text-sm text-muted-foreground">
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
        </div>
      </div>
    </section>;
};
export default Hero;