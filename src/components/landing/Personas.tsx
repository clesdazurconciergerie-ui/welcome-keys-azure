import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, Building2, Hotel, Building } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const personas = [
  {
    slug: "proprietaires",
    title: "Propriétaires",
    icon: Home,
    bullets: [
      "1 à 5 biens",
      "Code PIN unique par bien",
      "QR code à imprimer"
    ]
  },
  {
    slug: "conciergeries",
    title: "Conciergeries",
    icon: Building2,
    bullets: [
      "Multi-biens illimité",
      "Gestion centralisée",
      "Personnalisation par client"
    ]
  },
  {
    slug: "maisons-d-hotes",
    title: "Maisons d'hôtes",
    icon: Hotel,
    bullets: [
      "Informations communes",
      "Règles de la maison",
      "Recommandations locales"
    ]
  },
  {
    slug: "hotels-residences",
    title: "Hôtels & résidences",
    icon: Building,
    bullets: [
      "Branding complet",
      "Multi-utilisateurs",
      "Support prioritaire"
    ]
  }
];

const Personas = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <section className="py-20 md:py-28 bg-[#F7FAFC]">
      <div className="container mx-auto px-4 max-w-[1140px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-[#0F172A] mb-4">
            Un livret digital pour vous
          </h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            Quelle que soit votre activité, Welkom s'adapte à vos besoins
          </p>
        </motion.div>

        {/* Navigation buttons for mobile */}
        <div className="flex justify-end gap-2 mb-4 md:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="h-10 w-10 rounded-full border-[#E6EDF2]"
          >
            <ChevronLeft className="h-5 w-5 text-[#0F172A]" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="h-10 w-10 rounded-full border-[#E6EDF2]"
          >
            <ChevronRight className="h-5 w-5 text-[#0F172A]" />
          </Button>
        </div>

        {/* Carousel for mobile, grid for desktop */}
        <div 
          ref={scrollRef}
          className="flex md:grid md:grid-cols-4 gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {personas.map((persona, index) => {
            const Icon = persona.icon;
            return (
              <motion.div
                key={persona.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex-shrink-0 w-[85vw] md:w-auto snap-start"
              >
                <Card className="h-full bg-white border-[#E6EDF2] rounded-[18px] hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#071552]/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-[#071552]" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-[#0F172A] mb-4">
                        {persona.title}
                      </h3>
                    </div>
                    
                    <ul className="space-y-3 mb-6 flex-grow">
                      {persona.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[#64748B]">
                          <span className="text-[#071552] mt-1">•</span>
                          <span className="text-sm">{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => navigate(`/exemples/${persona.slug}`)}
                      variant="outline"
                      className="w-full border-[#E6EDF2] text-[#071552] hover:bg-[#071552]/5 rounded-[18px] h-11"
                    >
                      Voir l'exemple
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default Personas;
