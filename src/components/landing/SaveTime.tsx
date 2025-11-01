import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
const SaveTime = () => {
  const testimonials = [{
    name: "Marie L.",
    avatar: "ML",
    text: "Plus besoin de répéter les infos !"
  }, {
    name: "Thomas B.",
    avatar: "TB",
    text: "Un gain de temps incroyable"
  }];
  return <section className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div initial={{
          opacity: 0,
          x: -20
        }} whileInView={{
          opacity: 1,
          x: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6
        }}>
            <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-6">
              Économisez du temps et de l'énergie
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Gagnez <span className="font-bold text-primary">4 heures par semaine</span> grâce 
              à l'automatisation et la centralisation des informations essentielles.
            </p>

            {/* Mini testimonials */}
            <div className="space-y-4 mb-8">
              {testimonials.map((t, i) => <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-[18px] border border-border">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {t.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-sm text-muted-foreground">"{t.text}"</p>
                  </div>
                </div>)}
            </div>

            
          </motion.div>

          {/* Image */}
          <motion.div initial={{
          opacity: 0,
          x: 20
        }} whileInView={{
          opacity: 1,
          x: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6
        }}>
            <div className="aspect-[4/3] rounded-[18px] bg-white border border-border overflow-hidden shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80" 
                alt="Équipe de conciergerie utilisant un livret d'accueil digital pour gagner du temps dans la gestion des locations saisonnières" 
                className="w-full h-full object-cover" 
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>;
};
export default SaveTime;