import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Laptop, Settings, Rocket } from "lucide-react";

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    { icon: Laptop, number: "1", title: "Configurez votre espace", description: "Importez vos logements et propriétaires. Interface guidée en quelques minutes." },
    { icon: Settings, number: "2", title: "Personnalisez vos outils", description: "Livrets d'accueil, fiches prestataires, pipeline de prospection — tout s'adapte à vous." },
    { icon: Rocket, number: "3", title: "Pilotez vos performances", description: "Dashboard KPI, espace propriétaire, alertes automatiques. Vous gardez le contrôle." },
  ];

  return (
    <section className="py-20 lg:py-28 bg-secondary scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Démarrez en 3 étapes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Une mise en place simple pour des résultats immédiats
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-12">
          {steps.map((step, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.15 }} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-px bg-border" />
              )}
              <div className="relative w-28 h-28 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-primary/5">
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center bg-gold text-primary font-bold text-xs">{step.number}</div>
                <step.icon className="w-10 h-10 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="!text-[1.125rem] font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.5 }} className="text-center">
          <button
            onClick={() => navigate("/auth?mode=demo")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 text-sm sm:text-base"
          >
            Demander une démonstration →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
