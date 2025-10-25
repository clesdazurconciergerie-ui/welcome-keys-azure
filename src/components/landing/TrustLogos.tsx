import { motion } from "framer-motion";

const TrustLogos = () => {
  const platforms = [
    { name: "Airbnb", icon: "🏠" },
    { name: "Booking.com", icon: "🛏️" },
    { name: "Abritel", icon: "🏖️" },
    { name: "Google Maps", icon: "📍" },
  ];

  return (
    <section className="py-12 border-y border-[#ECEEF3] bg-[#F7F8FB]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm text-[#6C6C6C] mb-6 font-medium">
            Optimisé pour vos plateformes préférées
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 text-[#6C6C6C] hover:text-primary transition-colors cursor-default"
              >
                <span className="text-2xl">{platform.icon}</span>
                <span className="text-sm font-medium">{platform.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLogos;
