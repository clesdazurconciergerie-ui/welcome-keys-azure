import { Card, CardContent } from "@/components/ui/card";
import { FileEdit, Send, Share2 } from "lucide-react";
import { motion } from "framer-motion";

const Process = () => {
  const steps = [
    {
      icon: FileEdit,
      number: "01",
      title: "Créez",
      description: "Assistant guidé, sauvegarde automatique. Ajoutez toutes vos informations facilement.",
    },
    {
      icon: Send,
      number: "02",
      title: "Publiez",
      description: "Le code PIN est généré automatiquement. Votre livret est en ligne en quelques secondes.",
    },
    {
      icon: Share2,
      number: "03",
      title: "Partagez",
      description: "Envoyez le lien ou le QR code. Le chatbot prend le relais pour répondre aux questions.",
    },
  ];

  return (
    <section id="process" className="py-20 md:py-32 bg-[#F7F8FB] scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-lg md:text-xl text-[#6C6C6C] max-w-2xl mx-auto">
            Créez. Publiez. Partagez. C'est en ligne.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <Card className="h-full border-[#ECEEF3] bg-white hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6 text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 font-display font-bold text-5xl text-primary/10">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-2xl text-primary mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[#6C6C6C] leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;
