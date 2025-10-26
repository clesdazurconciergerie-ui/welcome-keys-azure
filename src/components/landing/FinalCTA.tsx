import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const FinalCTA = () => {
  const navigate = useNavigate();

  const scrollToDemo = () => {
    const element = document.getElementById("demo");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-white to-primary/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-6"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground">
            Prêt à créer votre premier livret ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Testez gratuitement. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              onClick={scrollToDemo}
              className="h-12 px-8 bg-primary hover:bg-[hsl(var(--brand-cyan-hover))] text-white rounded-[18px] shadow-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Demander une démo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/acces-livret")}
              className="h-12 px-8 border-2 rounded-[18px]"
            >
              Accéder à un livret
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
