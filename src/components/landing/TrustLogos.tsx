import { motion } from "framer-motion";
import { useRef } from "react";

const TrustLogos = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
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
        >
          {/* Mobile carousel, desktop centered flex */}
          <div
            ref={scrollRef}
            className="flex flex-wrap md:flex-nowrap items-center justify-center gap-6 md:gap-12 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-4 -mx-4 px-4 md:mx-0 md:px-0 carousel-container"
          >
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center gap-2 text-muted-foreground snap-start flex-shrink-0"
              >
                <span className="text-xl">{platform.icon}</span>
                <span className="text-sm font-medium whitespace-nowrap">{platform.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLogos;
