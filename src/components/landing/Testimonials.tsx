import { Star, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useRef } from "react";

const Testimonials = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const testimonials = [
    { name: "Sophie Martin", role: "Propriétaire Airbnb", avatar: "SM", rating: 5, text: "Mes invités adorent ! Fini les longs messages de bienvenue. Tout est clair et accessible en un clic." },
    { name: "Julien Dubois", role: "Conciergerie Premium", avatar: "JD", rating: 5, text: "Nous gérons 40 biens et MyWelkom nous a fait gagner un temps précieux. Le chatbot répond à 80% des questions." },
    { name: "Claire Arnaud", role: "Maison d'hôtes", avatar: "CA", rating: 5, text: "Interface intuitive, rendu professionnel. Le QR code imprimé dans les chambres est très pratique." },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.offsetWidth * 0.85;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-20 lg:py-28 bg-secondary">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Ils nous font confiance
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conciergeries et propriétaires témoignent de leur expérience
          </p>
        </motion.div>

        <div className="flex md:hidden justify-center gap-2 mb-4">
          <Button variant="outline" size="icon" onClick={() => scroll('left')} aria-label="Précédent" className="rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => scroll('right')} aria-label="Suivant" className="rounded-full"><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div ref={scrollRef} className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 carousel-container">
          {testimonials.map((t, index) => (
            <motion.article key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="min-w-[85%] md:min-w-0 snap-start bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">{t.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
                <BadgeCheck className="ml-auto h-5 w-5 text-gold" />
              </div>
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed">{t.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
