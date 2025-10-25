import { Button } from "@/components/ui/button";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";

const Regions = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-center font-display font-bold text-foreground mb-4">
            Explorez les régions selon nos hôtes
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Des recommandations locales pour chaque destination
          </p>

          {/* Mobile controls */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              aria-label="Région précédente"
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              aria-label="Région suivante"
              className="rounded-full"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Carousel container - mobile scroll, desktop grid */}
          <div
            ref={scrollRef}
            className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto lg:overflow-visible snap-x snap-mandatory scroll-px-4 -mx-4 px-4 lg:mx-0 lg:px-0 carousel-container"
          >
            {regions.map((region, i) => (
              <div
                key={i}
                className="min-w-[75%] sm:min-w-[45%] lg:min-w-0 snap-start flex-shrink-0"
              >
                <div className="group cursor-pointer">
                  <div className="aspect-[3/4] rounded-[18px] border border-border overflow-hidden mb-4 relative">
                    <img 
                      src={region.image} 
                      alt={region.name}
                      loading="lazy"
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
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Regions;
