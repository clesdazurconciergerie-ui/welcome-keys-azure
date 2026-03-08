import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 bg-background relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        background: 'radial-gradient(ellipse at 50% 50%, hsl(var(--gold)) 0%, transparent 60%)',
      }} />

      <div className="mx-auto max-w-4xl px-6 lg:px-10 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-7 h-7 text-gold" />
          </motion.div>

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
              className="group relative inline-flex items-center justify-center rounded-xl px-8 py-4 font-semibold text-base
                bg-gold text-primary overflow-hidden
                transition-all duration-300 ease-out
                hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(196,164,91,0.4)]
                w-full sm:w-auto"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-gold-light to-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center">
                Demander une démonstration
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>

            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center justify-center rounded-xl px-8 py-4 font-semibold text-base
                border-2 border-primary text-primary transition-all duration-300 ease-out
                hover:bg-primary hover:text-primary-foreground hover:-translate-y-0.5
                w-full sm:w-auto"
            >
              Se connecter
            </button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>✓ Aucune carte bancaire requise</span>
            <span>✓ 30 jours d'essai</span>
            <span>✓ Support dédié</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
