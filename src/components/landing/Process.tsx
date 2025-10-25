import { Card } from "@/components/ui/card";
import { Edit, Globe, Share2 } from "lucide-react";
import { motion } from "framer-motion";

const Process = () => {
  const steps = [
    {
      number: "01",
      icon: Edit,
      title: "Créez",
      description: "Ajoutez vos infos, Wi-Fi, photos, règles en quelques minutes.",
    },
    {
      number: "02",
      icon: Globe,
      title: "Publiez",
      description: "Un code PIN unique est généré automatiquement pour votre livret.",
    },
    {
      number: "03",
      icon: Share2,
      title: "Partagez",
      description: "Vos invités accèdent via QR code ou chatbot instantanément.",
    },
  ];

  return (
    <section id="comment-ca-marche" className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Créer un livret n'a jamais été aussi simple
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trois étapes pour transformer votre gestion
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-8 h-full bg-white border-border hover:shadow-lg transition-all text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="font-display text-6xl font-bold text-primary mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;
