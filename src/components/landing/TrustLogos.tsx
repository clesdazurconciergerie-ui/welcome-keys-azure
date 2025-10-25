import { motion } from "framer-motion";

const TrustLogos = () => {
  const platforms = [
    { name: "Airbnb", icon: "🏠" },
    { name: "Booking", icon: "🛏️" },
    { name: "Abritel", icon: "🏖️" },
    { name: "Google Maps", icon: "📍" },
  ];

  return (
    <section className="py-8 border-y border-border bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
        >
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span className="text-xl">{platform.icon}</span>
              <span className="text-sm font-medium">{platform.name}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLogos;
