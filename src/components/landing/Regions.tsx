import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

const Regions = () => {
  const regions = [
    {
      name: "Côte d'Azur",
      image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80",
      count: "450+ livrets",
    },
    {
      name: "Paris & Île-de-France",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
      count: "820+ livrets",
    },
    {
      name: "Provence",
      image: "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600&q=80",
      count: "320+ livrets",
    },
    {
      name: "Alpes",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
      count: "280+ livrets",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Explorez les régions selon nos hôtes
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Des recommandations locales pour chaque destination
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {regions.map((region, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] rounded-[18px] border border-border overflow-hidden mb-4 relative">
                  <img 
                    src={region.image} 
                    alt={region.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs opacity-90">{region.count}</span>
                    </div>
                    <h3 className="font-semibold text-lg">{region.name}</h3>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full rounded-[18px]"
                >
                  Découvrir
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Regions;
