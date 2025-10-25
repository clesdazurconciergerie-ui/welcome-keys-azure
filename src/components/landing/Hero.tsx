import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KeyRound, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
        duration: 0.4,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div 
        className="pointer-events-none absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(7,21,82,0.06), rgba(255,255,255,1) 55%)'
        }}
      />

      {/* Watermark logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.08, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex justify-center pt-6"
      >
        <img 
          src="/brand/logo-wlekom-icon.png" 
          alt="" 
          aria-hidden="true"
          className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24"
        />
      </motion.div>

      <motion.div 
        className="relative mx-auto max-w-screen-lg px-6 py-16 sm:py-20 md:py-24 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Title */}
        <motion.h1 
          variants={itemVariants}
          className="font-display font-semibold text-[38px] leading-[1.1] text-[#071552] sm:text-[48px] md:text-[56px] tracking-tight"
          style={{ letterSpacing: '0.2px' }}
        >
          Wlekom
        </motion.h1>

        {/* Baseline with divider */}
        <motion.div 
          variants={itemVariants}
          className="mt-2 flex flex-col items-center gap-2"
        >
          <span className="text-sm sm:text-base text-[#6C6C6C] tracking-wide">
            by Clés d'Azur
          </span>
          <span className="block h-px w-24 sm:w-28 bg-[#E7E9F2]" />
        </motion.div>

        {/* Tagline */}
        <motion.h2 
          variants={itemVariants}
          className="mx-auto mt-6 sm:mt-8 max-w-3xl text-lg sm:text-xl md:text-2xl font-medium text-[#424242] leading-relaxed"
        >
          L'accueil réinventé pour les hôtes et voyageurs modernes.
        </motion.h2>

        {/* Pitch */}
        <motion.p 
          variants={itemVariants}
          className="mx-auto mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg text-[#6C6C6C] leading-relaxed px-4"
        >
          Accédez à votre livret d'accueil numérique en quelques secondes grâce à votre code personnel.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => navigate("/acces-livret")}
            className="group inline-flex items-center gap-2 rounded-xl bg-[#071552] px-6 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:bg-[#122372] hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#071552] focus:ring-offset-2"
            aria-label="Accéder à un livret d'accueil"
          >
            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            Accéder à un livret
            <ChevronRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" aria-hidden="true" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={scrollToFeatures}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#071552] bg-transparent px-6 sm:px-8 py-3 sm:py-3.5 text-base sm:text-lg font-medium text-[#071552] transition-all duration-300 hover:bg-[#071552] hover:text-white hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#071552] focus:ring-offset-2"
            aria-label="Découvrir les fonctionnalités de Wlekom"
          >
            Découvrir Wlekom
          </Button>
        </motion.div>

        {/* Dashboard link */}
        <motion.p 
          variants={itemVariants}
          className="mt-8 sm:mt-10 text-sm sm:text-base text-[#818181]"
        >
          Propriétaire ou gestionnaire ?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="inline-block underline decoration-[#071552]/40 underline-offset-4 transition-colors duration-200 hover:text-[#071552] focus:outline-none focus:ring-2 focus:ring-[#071552] focus:ring-offset-2 rounded-sm px-1"
          >
            Accéder au tableau de bord
          </button>
        </motion.p>
      </motion.div>
    </section>
  );
};

export default Hero;
