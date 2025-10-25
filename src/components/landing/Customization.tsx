import { Palette, Upload, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

const Customization = () => {
  const mockups = [
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80",
    "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
  ];

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto text-center"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-6">
            Un livret à votre image
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Personnalisez vos livrets avec vos couleurs HEX, votre logo et vos photos.
          </p>

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            {[
              { icon: Palette, text: "Couleurs personnalisées" },
              { icon: Upload, text: "Votre logo" },
              { icon: Smartphone, text: "Optimisé mobile" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Mockup gallery */}
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {mockups.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex-shrink-0 w-64 snap-center"
                >
                  <div className="aspect-[9/16] rounded-[18px] border border-border overflow-hidden shadow-lg bg-white">
                    <img 
                      src={img} 
                      alt={`Exemple ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Customization;
