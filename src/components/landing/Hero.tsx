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

  // Animation variants for stagger effect
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
      },
    },
  };

  return (
    <section className="relative overflow-hidden">
      {/* Radial glow background */}
      <div 
        className="pointer-events-none absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(7,21,82,0.08), #ffffff 58%)'
        }}
      />

      {/* Optional subtle grain texture */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
        }} 
      />

      {/* Large watermark logo - positioned lower and bigger */}
      <motion.img
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.06, scale: 1 }}
        transition={{ duration: 0.6 }}
        src="/brand/logo-wlekom-icon.png"
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-[32%] -translate-x-1/2 h-[160px] w-[160px] md:top-[34%] md:h-[200px] md:w-[200px] z-0 pointer-events-none"
      />

      {/* Main content */}
      <motion.div 
        className="relative z-10 mx-auto max-w-[1140px] px-6 py-20 sm:py-24 md:py-28 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Title */}
        <motion.h1 
          variants={itemVariants}
          className="font-display font-semibold text-[#071552] text-[36px] sm:text-[44px] md:text-[56px] lg:text-[60px] leading-[1.08] tracking-[0.2px]"
        >
          Wlekom
        </motion.h1>

        {/* Baseline with divider */}
        <motion.div 
          variants={itemVariants}
          className="mt-2 flex flex-col items-center gap-2"
        >
          <span className="text-sm md:text-base text-[#6C6C6C] tracking-wide">
            by Clés d'Azur
          </span>
          <span className="block h-px w-24 sm:w-28 bg-[#E4E7EE]" />
        </motion.div>

        {/* Tagline */}
        <motion.h2 
          variants={itemVariants}
          className="mx-auto mt-6 sm:mt-8 max-w-3xl text-lg sm:text-xl md:text-2xl font-medium text-[#2C2C2C] leading-relaxed"
        >
          L'accueil réinventé pour les hôtes et voyageurs modernes.
        </motion.h2>

        {/* Pitch */}
        <motion.p 
          variants={itemVariants}
          className="mx-auto mt-4 max-w-2xl text-[15px] md:text-[16px] text-[#6C6C6C] leading-relaxed"
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
            className="group inline-flex items-center gap-2 rounded-xl bg-[#071552] px-7 py-3 text-base sm:text-lg font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:bg-[#122372] focus:outline-none focus:ring-2 focus:ring-[#071552] focus:ring-offset-2"
            style={{
              boxShadow: '0 4px 14px rgba(7, 21, 82, 0.12)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(7, 21, 82, 0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(7, 21, 82, 0.12)';
            }}
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
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#071552] bg-transparent px-7 py-3 text-base sm:text-lg font-medium text-[#071552] transition-all duration-300 hover:bg-[#071552] hover:text-white hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#071552] focus:ring-offset-2"
            aria-label="Découvrir les fonctionnalités de Wlekom"
          >
            Découvrir Wlekom
          </Button>
        </motion.div>

        {/* Dashboard link */}
        <motion.p 
          variants={itemVariants}
          className="mt-8 sm:mt-10 text-sm sm:text-base text-[#7C7C7C]"
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

      {/* Bottom wave SVG */}
      <svg 
        className="pointer-events-none absolute bottom-[-1px] left-1/2 z-0 h-[100px] sm:h-[120px] w-[1600px] -translate-x-1/2 opacity-[0.10]"
        viewBox="0 0 1440 320" 
        preserveAspectRatio="none" 
        aria-hidden="true"
      >
        <path 
          fill="#071552" 
          d="M0,256L48,250.7C96,245,192,235,288,224C384,213,480,203,576,186.7C672,171,768,149,864,122.7C960,96,1056,64,1152,74.7C1248,85,1344,139,1392,165.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
    </section>
  );
};

export default Hero;
