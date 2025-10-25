import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import BrandMark from "@/components/BrandMark";

const Hero = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-24 overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(7,21,82,0.04), rgba(255,255,255,1) 60%)",
        }}
      />

      {/* Logo watermark */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: "url('/brand/logo-wlekom-icon.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 60px",
          backgroundSize: "88px",
        }}
      >
        <style>{`
          @media (max-width: 768px) {
            div[style*="logo-wlekom-icon.png"] {
              background-size: 64px !important;
            }
          }
        `}</style>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-4xl mx-auto text-center space-y-8"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <BrandMark variant="full" showIcon={true} />
          <div className="w-24 h-px bg-primary/20 mx-auto my-6" />
          <p className="font-display text-lg sm:text-xl md:text-2xl text-[#6C6C6C] font-medium tracking-wide">
            L'accueil réinventé pour les hôtes et voyageurs modernes.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-base sm:text-lg md:text-xl text-[#6C6C6C] max-w-2xl mx-auto leading-relaxed px-4"
        >
          Accédez à votre livret d'accueil numérique en quelques secondes grâce à votre code
          personnel.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6"
        >
          <Button
            size="lg"
            onClick={() => navigate("/acces-livret")}
            className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-medium bg-primary hover:bg-[#122372] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <KeyRound className="w-5 h-5" />
            Accéder à un livret
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={scrollToFeatures}
            className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-medium border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Découvrir Wlekom
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="pt-8"
        >
          <p className="text-sm text-[#6C6C6C]">
            Propriétaire ou gestionnaire ?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-1"
            >
              Accéder au tableau de bord
            </button>
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
