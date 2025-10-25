import { Star, BadgeCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sophie Martin",
      role: "Propriétaire Airbnb",
      avatar: "SM",
      rating: 5,
      text: "Mes invités adorent ! Fini les longs messages de bienvenue. Tout est clair et accessible en un clic.",
    },
    {
      name: "Julien Dubois",
      role: "Conciergerie Premium",
      avatar: "JD",
      rating: 5,
      text: "Nous gérons 40 biens et Welkom nous a fait gagner un temps précieux. Le chatbot répond à 80% des questions.",
    },
    {
      name: "Claire Arnaud",
      role: "Maison d'hôtes",
      avatar: "CA",
      rating: 5,
      text: "Interface intuitive, rendu professionnel. Le QR code imprimé dans les chambres est très pratique.",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-center font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Des hôtes & voyageurs satisfaits
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Rejoignez une communauté de professionnels conquis
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 bg-white rounded-[18px] border border-border"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-sm text-foreground mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                      <BadgeCheck className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
