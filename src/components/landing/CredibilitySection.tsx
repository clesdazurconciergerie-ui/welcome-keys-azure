import { motion } from "framer-motion";
import { MapPin, Award, Shield } from "lucide-react";

const CredibilitySection = () => {
  return (
    <section className="py-20 lg:py-28 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/brand/logo-azur-keys.png" alt="Azur Keys" className="w-12 h-12 brightness-0 invert" />
          </div>
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight mb-4">
            Une technologie issue du terrain
          </h2>
          <p className="text-primary-foreground/70 max-w-2xl mx-auto">
            MyWelkom est développé par Azur Keys, conciergerie premium opérant sur la Côte d'Azur. 
            Chaque fonctionnalité est née d'un besoin réel, testée en conditions opérationnelles.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { icon: MapPin, title: "Côte d'Azur", desc: "Née et opérationnelle sur un marché exigeant et premium" },
            { icon: Award, title: "Expertise terrain", desc: "Chaque fonctionnalité répond à un besoin concret de conciergerie" },
            { icon: Shield, title: "Fiabilité prouvée", desc: "Utilisée quotidiennement par une équipe de professionnels" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-7 h-7 text-gold" />
              </div>
              <h3 className="!text-[1.125rem] font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-primary-foreground/60">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CredibilitySection;
