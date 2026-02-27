import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="mx-auto max-w-4xl px-6 lg:px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-6">
            Prêt à transformer votre conciergerie ?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
            Rejoignez les conciergeries qui ont choisi la performance et la transparence. 
            Démarrage en 24h, sans engagement.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
            <button
              onClick={() => navigate("/auth?mode=demo")}
              className="group inline-flex items-center justify-center rounded-xl px-8 py-4 font-semibold text-base
                bg-gold text-primary transition-all duration-300 ease-out
                hover:bg-gold-light hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(196,164,91,0.4)]
                w-full sm:w-auto"
            >
              Demander une démonstration
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center justify-center rounded-xl px-8 py-4 font-semibold text-base
                border-2 border-primary text-primary transition-all duration-300 ease-out
                hover:bg-primary hover:text-primary-foreground
                w-full sm:w-auto"
            >
              Se connecter
            </button>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            ✓ Aucune carte bancaire requise · ✓ 30 jours d'essai · ✓ Support dédié
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
