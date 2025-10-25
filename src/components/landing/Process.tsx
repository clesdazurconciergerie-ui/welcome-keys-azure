import { Card, CardContent } from "@/components/ui/card";
import { FileEdit, Send, Share2 } from "lucide-react";
import { motion } from "framer-motion";

const Process = () => {
  const steps = [
    {
      number: "1",
      icon: FileEdit,
      title: "Créez",
      description: "Ajoutez vos informations, photos et personnalisez votre livret en quelques minutes.",
    },
    {
      number: "2",
      icon: Send,
      title: "Publiez",
      description: "Un code PIN unique est généré automatiquement pour sécuriser l'accès.",
    },
    {
      number: "3",
      icon: Share2,
      title: "Partagez",
      description: "Envoyez le lien ou le QR code. Vos invités accèdent à tout instantanément.",
    },
  ];

  return (
    <section id="process" className="py-20 md:py-24 bg-secondary/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Comment ça marche
          </h2>
          <p className="text-lg text-muted-foreground">
            Créez votre premier livret en 3 étapes simples
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              <Card className="h-full border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                <CardContent className="pt-8 text-center">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto mt-4">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="font-display font-semibold text-2xl text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>

              {/* Connector Arrow */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;
