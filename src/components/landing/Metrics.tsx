import { Clock, Star, Phone } from "lucide-react";
import { motion } from "framer-motion";

const Metrics = () => {
  const metrics = [
    {
      icon: Clock,
      value: "4h",
      label: "gagnées par semaine",
      color: "text-primary",
    },
    {
      icon: Star,
      value: "+15%",
      label: "d'avis 5★",
      color: "text-primary",
    },
    {
      icon: Phone,
      value: "−20%",
      label: "d'appels d'assistance",
      color: "text-primary",
    },
  ];

  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Le pouvoir du livret digital
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Des résultats mesurables pour votre activité
          </p>

          <div className="grid sm:grid-cols-3 gap-6 md:gap-8 p-8 md:p-12 bg-secondary/50 rounded-[24px] border border-border">
            {metrics.map((metric, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <metric.icon className={`w-10 h-10 ${metric.color} mx-auto mb-4`} />
                <div className="font-display font-bold text-4xl md:text-5xl text-foreground mb-2">
                  {metric.value}
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  {metric.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Metrics;
