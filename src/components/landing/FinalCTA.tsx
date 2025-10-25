import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { motion } from "framer-motion";

const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-primary/5 via-white to-primary/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-primary">
            Prêt à découvrir votre livret ?
          </h2>
          <p className="text-lg md:text-xl text-[#6C6C6C] max-w-2xl mx-auto leading-relaxed">
            Entrez votre code et retrouvez votre livret d'accueil en quelques secondes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/acces-livret")}
              className="gap-2 h-14 px-8 text-lg font-medium bg-primary hover:bg-[#122372] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <KeyRound className="w-5 h-5" />
              Accéder à un livret
            </Button>
            <button
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline font-medium text-lg focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-4 py-2"
            >
              Accéder au tableau de bord
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
