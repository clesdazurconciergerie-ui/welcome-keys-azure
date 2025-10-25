import { Home, Building2, Hotel, Key, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRef } from "react";

const ForEveryone = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const targets = [
    {
      icon: Home,
      title: "Propriétaires particuliers",
      features: [
        "1 à 5 biens",
        "Code PIN unique par bien",
        "QR code à imprimer",
      ],
    },
    {
      icon: Building2,
      title: "Conciergeries",
      features: [
        "Multi-biens illimité",
        "Gestion centralisée",
        "Personnalisation par client",
      ],
    },
    {
      icon: Hotel,
      title: "Maisons d'hôtes",
      features: [
        "Informations communes",
        "Règles de la maison",
        "Recommandations locales",
      ],
    },
    {
      icon: Key,
      title: "Hôtels & résidences",
      features: [
        "Branding complet",
        "Multi-utilisateurs",
        "Support prioritaire",
      ],
    },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.offsetWidth * 0.8;
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
            Un livret digital pour tous
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Quelle que soit la taille de votre activité
          </p>

          {/* Mobile controls */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              aria-label="Profil précédent"
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              aria-label="Profil suivant"
              className="rounded-full"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Carousel container - mobile scroll, desktop grid */}
          <div
            ref={scrollRef}
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scroll-px-4 -mx-4 px-4 sm:mx-0 sm:px-0 carousel-container"
          >
            {targets.map((target, i) => (
              <div
                key={i}
                className="min-w-[80%] sm:min-w-0 snap-start flex-shrink-0 p-6 bg-white rounded-[18px] border border-border hover:shadow-lg transition-all hover:border-primary/20"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <target.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-4">
                  {target.title}
                </h3>
                <ul className="space-y-2 mb-6">
                  {target.features.map((feature, j) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full rounded-[18px]"
                >
                  Voir un exemple
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ForEveryone;
