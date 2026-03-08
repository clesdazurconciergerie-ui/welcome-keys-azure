import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Laptop, Settings, Rocket, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    { icon: Laptop, number: "01", title: "Configurez votre espace", description: "Importez vos logements et propriétaires. Interface guidée en quelques minutes." },
    { icon: Settings, number: "02", title: "Personnalisez vos outils", description: "Livrets d'accueil, fiches prestataires, pipeline de prospection — tout s'adapte à vous." },
    { icon: Rocket, number: "03", title: "Pilotez vos performances", description: "Dashboard KPI, espace propriétaire, alertes automatiques. Vous gardez le contrôle." },
  ];

  return (
    <section className="py-20 lg:py-28 bg-secondary scroll-mt-20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(45deg, hsl(var(--primary)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--primary)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--primary)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--primary)) 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }} />

      <div className="mx-auto max-w-6xl px-6 lg:px-10 relative">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-gold bg-gold/10 mb-4">
            Simple & rapide
          </span>
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Démarrez en 3 étapes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Une mise en place simple pour des résultats immédiats
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-14">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="relative bg-card rounded-2xl p-8 border border-border hover:border-gold/20 hover:shadow-lg transition-all duration-300 group"
            >
              {/* Step number */}
              <div className="text-6xl font-extrabold text-primary/[0.05] absolute top-4 right-6 select-none group-hover:text-gold/[0.1] transition-colors">
                {step.number}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-border to-transparent" />
              )}

              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-primary/5 group-hover:bg-gold/10 transition-colors">
                  <step.icon className="w-7 h-7 text-primary group-hover:text-gold transition-colors" strokeWidth={1.5} />
                </div>
                <h3 className="!text-[1.125rem] font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }} className="text-center">
          <button
            onClick={() => navigate("/auth?mode=demo")}
            className="group inline-flex items-center justify-center rounded-xl px-7 py-3.5 font-semibold text-sm sm:text-base
              bg-primary text-primary-foreground
              transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            Demander une démonstration
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
