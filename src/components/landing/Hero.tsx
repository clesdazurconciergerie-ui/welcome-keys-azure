import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KeyRound, Waves } from "lucide-react";
import { motion } from "framer-motion";

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
          background: "radial-gradient(circle at center, rgba(7,21,82,0.04), rgba(255,255,255,1))",
        }}
      />

      {/* Decorative watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
        <Waves className="w-[400px] h-[400px] text-primary" />
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
          <h1 className="font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-primary tracking-tight mb-4">
            Clés d'Azur
          </h1>
          <div className="w-24 h-px bg-primary/20 mx-auto mb-6" />
          <p className="font-display text-xl sm:text-2xl md:text-3xl text-[#6C6C6C] font-medium tracking-wide">
            Votre bien, notre expertise.
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
            Découvrir Clés d'Azur
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
              className="text-primary font-medium hover:underline transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary rounded-sm"
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
