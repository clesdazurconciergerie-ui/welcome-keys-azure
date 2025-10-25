import { Button } from "@/components/ui/button";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
const Regions = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const regions = [{
    name: "Côte d'Azur",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80",
    count: "450+ livrets"
  }, {
    name: "Paris & Île-de-France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    count: "820+ livrets"
  }, {
    name: "Provence",
    image: "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600&q=80",
    count: "320+ livrets"
  }, {
    name: "Alpes",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    count: "280+ livrets"
  }];
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.offsetWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="font-display font-bold text-foreground mb-3">
            Explorez les régions selon nos hôtes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Découvrez les destinations préférées de notre communauté
          </p>
        </motion.div>

        {/* Mobile Controls */}
        <div className="flex md:hidden justify-center gap-2 mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            aria-label="Région précédente"
            className="rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            aria-label="Région suivante"
            className="rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Regions Container */}
        <div
          ref={scrollRef}
          className="flex md:grid md:grid-cols-4 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 carousel-container"
          role="region"
          aria-label="Régions disponibles"
        >
          {regions.map((region, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="min-w-[75%] md:min-w-0 snap-start group"
            >
              <div className="relative overflow-hidden rounded-2xl border border-border shadow-sm bg-card">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={region.image}
                    alt={region.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{region.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{region.count}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Découvrir
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Regions;