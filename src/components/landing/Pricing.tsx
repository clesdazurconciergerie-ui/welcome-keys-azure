import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "Gratuit",
      description: "Pour tester Welkom",
      features: [
        "1 livret d'accueil",
        "Accès par code PIN",
        "QR code inclus",
        "Support par email",
      ],
      cta: "Commencer",
      featured: false,
    },
    {
      name: "Pro",
      price: "19€",
      period: "/mois",
      description: "Pour les hôtes actifs",
      features: [
        "10 livrets d'accueil",
        "Chatbot intégré",
        "Personnalisation complète",
        "Support prioritaire",
        "Analytics détaillées",
      ],
      cta: "Essayer gratuitement",
      featured: true,
    },
    {
      name: "Business",
      price: "49€",
      period: "/mois",
      description: "Pour les agences",
      features: [
        "Livrets illimités",
        "Multi-utilisateurs",
        "Branding complet",
        "Support dédié 24/7",
        "API d'intégration",
      ],
      cta: "Commencer",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-24 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Tarifs simples et transparents
          </h2>
          <p className="text-lg text-muted-foreground">
            Choisissez l'offre qui correspond à vos besoins. Sans engagement.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                className={`h-full relative ${
                  plan.featured
                    ? "border-primary border-2 shadow-xl scale-105"
                    : "border-border hover:border-primary/50"
                } transition-all duration-300`}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    Populaire
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <h3 className="font-display font-semibold text-2xl text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-display font-bold text-4xl text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => navigate("/auth")}
                    className={`w-full rounded-xl ${
                      plan.featured
                        ? "bg-primary hover:bg-primary/90 text-white shadow-lg"
                        : "bg-secondary hover:bg-secondary/80 text-foreground"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
