import { motion } from "framer-motion";
import { TrendingUp, Clock, Shield, Star } from "lucide-react";

const SocialProof = () => {
  const metrics = [
    { icon: TrendingUp, value: "+35%", label: "de revenus en moyenne" },
    { icon: Clock, value: "10h", label: "gagnées par semaine" },
    { icon: Shield, value: "100%", label: "transparence propriétaires" },
    { icon: Star, value: "4.9/5", label: "satisfaction clients" },
  ];

  return (
    <section className="py-10 bg-background border-y border-border">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
        >
          {metrics.map(({ icon: Icon, value, label }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col items-center text-center gap-1"
            >
              <Icon className="w-5 h-5 text-gold mb-1" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProof;
