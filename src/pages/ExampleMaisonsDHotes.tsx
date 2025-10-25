import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Hotel, Check, Sparkles, ArrowRight } from "lucide-react";
import { useRef } from "react";

const ExampleMaisonsDHotes = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const benefits = [
    "Informations communes",
    "Règles de la maison",
    "Recommandations locales"
  ];

  const guestSees = [
    "Informations d'arrivée et départ",
    "Wi-Fi disponible",
    "Équipements avec photos",
    "Lieux à proximité"
  ];

  const mockups = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&h=1200&fit=crop"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] bg-gradient-to-br from-[#071552] to-[#0a1d6b] overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1920&h=1080&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Hotel className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Maisons d'hôtes</span>
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-white mb-6">
              Exemple de livret Welkom
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Idéal pour partager les informations communes et les règles de votre maison d'hôtes
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why it's for you */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-[#0F172A] mb-8 text-center">
              Pourquoi c'est fait pour vous
            </h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-[18px] bg-[#F7FAFC]"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#071552] flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-lg text-[#0F172A] pt-1">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What guests see */}
      <section className="py-20 bg-[#F7FAFC]">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-[#0F172A] mb-8 text-center">
              Ce que vos invités voient
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {guestSees.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-white rounded-[18px] border border-[#E6EDF2]"
                >
                  <ArrowRight className="w-5 h-5 text-[#071552] flex-shrink-0" />
                  <span className="text-[#0F172A]">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Preview */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-[#0F172A] mb-12 text-center">
              Aperçu du livret
            </h2>
            
            {/* Mobile: Carousel */}
            <div 
              ref={scrollRef}
              className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 px-4 -mx-4"
            >
              {mockups.map((mockup, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex-shrink-0 w-[75vw] snap-start"
                >
                  <img 
                    src={mockup}
                    alt={`Mockup ${index + 1}`}
                    className="w-full h-[450px] object-cover rounded-[18px] shadow-lg"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>

            {/* Desktop: Grid */}
            <div className="hidden md:grid grid-cols-3 gap-6">
              {mockups.map((mockup, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <img 
                    src={mockup}
                    alt={`Mockup ${index + 1}`}
                    className="w-full h-[450px] object-cover rounded-[18px] shadow-lg"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-[#F7FAFC]">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-[#0F172A] mb-4">
              Prêt à créer votre livret ?
            </h2>
            <p className="text-lg text-[#64748B] mb-8">
              Testez Welkom gratuitement. Aucune carte bancaire.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="h-12 px-8 bg-[#071552] hover:bg-[#0a1d6b] text-white rounded-[18px]"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Essayer gratuitement
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/acces-livret")}
                className="h-12 px-8 border-[#E6EDF2] text-[#071552] hover:bg-[#071552]/5 rounded-[18px]"
              >
                Accéder à un livret
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ExampleMaisonsDHotes;
