import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Shield, Zap, MessageSquare } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "9,90",
      livrets: "1 livret",
      features: [
        "Code PIN unique",
        "QR code à imprimer",
        "Chatbot inclus",
        "Support par email",
      ],
      cta: "Commencer maintenant",
      featured: false,
    },
    {
      name: "Pro",
      price: "24,90",
      livrets: "1 à 5 livrets",
      badge: "⭐ Populaire",
      features: [
        "Branding personnalisé",
        "Couleurs HEX + logo",
        "Support prioritaire",
        "Chatbot avancé",
      ],
      cta: "Commencer maintenant",
      featured: true,
    },
    {
      name: "Business",
      price: "49,90",
      livrets: "5 à 15 livrets",
      features: [
        "Multi-utilisateurs",
        "Gestion centralisée",
        "Tableaux de bord analytiques",
        "Support dédié",
      ],
      cta: "Commencer maintenant",
      featured: false,
    },
    {
      name: "Premium",
      price: "99,90",
      livrets: "Illimité",
      features: [
        "Domaine personnalisé",
        "API et export avancé",
        "Support prioritaire 24/7",
        "Accès bêta fonctionnalités",
      ],
      cta: "Commencer maintenant",
      featured: false,
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Sécurité RLS & accès par PIN",
      description: "Vos données sont protégées avec Row Level Security et un accès sécurisé par code PIN unique.",
    },
    {
      icon: Zap,
      title: "Facile à utiliser, aucun code requis",
      description: "Interface intuitive et conviviale. Créez votre livret en quelques minutes sans compétences techniques.",
    },
    {
      icon: MessageSquare,
      title: "Chatbot intégré et intelligent",
      description: "Répondez automatiquement aux questions de vos voyageurs 24/7 grâce à l'IA intégrée.",
    },
  ];

  const faqs = [
    {
      question: "Peut-on changer de plan ?",
      answer: "Oui, à tout moment depuis votre espace client. Vous pouvez passer à un plan supérieur ou inférieur selon vos besoins.",
    },
    {
      question: "Les tarifs sont-ils HT ?",
      answer: "Oui, les prix indiqués sont HT. La TVA sera ajoutée selon votre pays de facturation.",
    },
    {
      question: "Puis-je tester avant d'acheter ?",
      answer: "Oui, un essai gratuit est disponible. Testez toutes les fonctionnalités sans engagement ni carte bancaire requise.",
    },
    {
      question: "Le chatbot est-il inclus ?",
      answer: "Oui, dans tous les plans. Le chatbot intelligent est inclus et vous aide à répondre automatiquement aux questions fréquentes.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 md:pb-20 bg-secondary">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-foreground mb-6">
              Des tarifs simples et transparents
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Aucun frais caché. Chaque plan inclut un livret digital professionnel et le chatbot intégré.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 shadow-lg hover:shadow-xl transition-all"
            >
              Essayer gratuitement
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-[1140px]">
          {/* Mobile: Carousel */}
          <div className="md:hidden overflow-x-auto carousel-container snap-x snap-mandatory">
            <div className="flex gap-4 pb-4" style={{ width: `${plans.length * 320}px` }}>
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="snap-center shrink-0"
                  style={{ width: "300px" }}
                >
                  <div
                    className={`h-full bg-white rounded-2xl p-6 border-2 transition-all ${
                      plan.featured
                        ? "border-primary shadow-xl bg-secondary"
                        : "border-border hover:border-primary/50 shadow-md"
                    }`}
                  >
                    {plan.badge && (
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium mb-4 inline-block">
                        {plan.badge}
                      </div>
                    )}
                    <h3 className="font-display font-semibold text-2xl text-foreground mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.livrets}</p>
                    <div className="mb-6">
                      <span className="font-display font-bold text-4xl text-primary">
                        {plan.price}€
                      </span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>
                    <ul className="space-y-3 mb-6">
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
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className={`h-full bg-white rounded-2xl p-6 border-2 transition-all ${
                    plan.featured
                      ? "border-primary shadow-xl bg-secondary"
                      : "border-border hover:border-primary/50 shadow-md"
                  }`}
                >
                  {plan.badge && (
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium mb-4 inline-block">
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="font-display font-semibold text-2xl text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.livrets}</p>
                  <div className="mb-6">
                    <span className="font-display font-bold text-4xl text-primary">
                      {plan.price}€
                    </span>
                    <span className="text-muted-foreground">/mois</span>
                  </div>
                  <ul className="space-y-3 mb-6">
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
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                        : "bg-secondary hover:bg-secondary/80 text-foreground"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Welkom */}
      <section className="py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-4">
              Pourquoi Welkom ?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="bg-white rounded-2xl p-6 border border-border h-full">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-xl text-foreground mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-4">
              Questions fréquentes
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white border border-border rounded-2xl px-6"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-4 max-w-[1140px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-4">
              Prêt à créer votre premier livret ?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Testez Welkom gratuitement
            </p>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 shadow-lg hover:shadow-xl transition-all"
            >
              Essayer gratuitement
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
