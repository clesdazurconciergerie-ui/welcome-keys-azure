import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const SatisfiedGuests = () => {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 md:order-1"
          >
            <div className="aspect-[4/3] rounded-[18px] bg-secondary border border-border overflow-hidden shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80" 
                alt="Voyageurs satisfaits"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 md:order-2"
          >
            <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-6">
              Voyageurs satisfaits, objectifs remplis
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Vos invités, vos règles. Offrez une expérience fluide et professionnelle 
              dès leur arrivée.
            </p>
            
            <div className="space-y-4 mb-8">
              {[
                "Accès par code PIN sécurisé",
                "Chatbot disponible 24/7",
                "Sections prêtes à l'emploi"
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{text}</span>
                </div>
              ))}
            </div>

            <Button 
              size="lg"
              className="h-12 px-6 bg-primary hover:bg-primary/90 text-white rounded-[18px]"
            >
              Découvrir l'éditeur
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SatisfiedGuests;
