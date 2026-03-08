import { motion } from "framer-motion";
import { MapPin, Award, Shield } from "lucide-react";

const CredibilitySection = () => {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      {/* Premium dark background */}
      <div className="absolute inset-0 bg-primary" />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 20% 50%, hsl(42 46% 56% / 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, hsl(232 85% 30% / 0.3) 0%, transparent 50%)',
      }} />

      <div className="mx-auto max-w-6xl px-6 lg:px-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center backdrop-blur-sm">
              <img src="/brand/logo-azur-keys.png" alt="Azur Keys" className="w-8 h-8 brightness-0 invert" />
            </div>
          </div>
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight mb-4 text-white">
            Une technologie issue du terrain
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            MyWelkom est développé par Azur Keys, conciergerie premium opérant sur la Côte d'Azur.
            Chaque fonctionnalité est née d'un besoin réel, testée en conditions opérationnelles.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
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
              className="text-center rounded-2xl p-7 bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm
                hover:bg-white/[0.07] hover:border-gold/20 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-gold/20 transition-colors">
                <item.icon className="w-7 h-7 text-gold" />
              </div>
              <h3 className="!text-[1.125rem] font-bold mb-2 text-white">{item.title}</h3>
              <p className="text-sm text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CredibilitySection;
