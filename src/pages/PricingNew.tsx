import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  features: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour démarrer en douceur",
    features: [
      "1 logement",
      "1 livret d'accueil digital",
      "Synchronisation iCal",
      "Portail propriétaire",
      "Support par email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pour les conciergeries en croissance",
    popular: true,
    features: [
      "5 logements",
      "5 livrets d'accueil",
      "Tout Starter inclus",
      "Missions & prestataires",
      "Messagerie voyageurs",
      "Module Finance",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pour les conciergeries établies",
    features: [
      "50 logements",
      "50 livrets d'accueil",
      "Tout Pro inclus",
      "CRM prospection",
      "États des lieux digitalisés",
      "Rapports IA",
      "Branding personnalisé",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Sans limite, accompagnement dédié",
    features: [
      "Logements illimités",
      "Livrets illimités",
      "Tout Business inclus",
      "Onboarding dédié",
      "Support prioritaire",
    ],
  },
];

const faqs = [
  {
    question: "Puis-je changer de plan ?",
    answer:
      "Oui, à tout moment depuis votre espace abonnement. Le changement est immédiat et la facturation est ajustée au prorata.",
  },
  {
    question: "Y a-t-il des frais cachés ?",
    answer:
      "Non. Le prix affiché est tout compris : hébergement, mises à jour, support et toutes les fonctionnalités du plan choisi.",
  },
  {
    question: "Comment fonctionne l'essai gratuit ?",
    answer:
      "Vous accédez à toutes les fonctionnalités pendant 30 jours sans carte bancaire. À la fin, vous choisissez librement votre plan ou restez sur la version gratuite.",
  },
  {
    question: "Puis-je inviter mon équipe ?",
    answer:
      "Oui. Vous pouvez inviter vos prestataires et vos propriétaires sur leurs portails dédiés. Le nombre d'utilisateurs internes dépend du plan choisi.",
  },
  {
    question: "Le portail propriétaire est-il inclus ?",
    answer:
      "Oui, dans tous les plans. Vos propriétaires accèdent à leur calendrier, leurs revenus, leurs états des lieux et leurs documents depuis un espace dédié.",
  },
];

const PricingNew = () => {
  return (
    <>
      <SEOHead
        title="Tarifs Welkom — Plans conciergerie et essai gratuit 30 jours"
        description="Welkom — 4 plans pour conciergeries : Starter, Pro, Business, Premium. Essai gratuit 30 jours sans CB. Livrets, missions, finance, CRM, états des lieux."
        keywords="tarifs conciergerie, prix logiciel conciergerie, abonnement Welkom, essai gratuit conciergerie"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />

        {/* Hero */}
        <section className="pt-32 pb-12 md:pb-16 bg-secondary">
          <div className="container mx-auto px-4 max-w-[1140px] text-center">
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-foreground mb-6">
              Des tarifs simples, à votre rythme
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Choisissez le plan adapté à la taille de votre conciergerie.
              Évoluez quand vous voulez.
            </p>
          </div>
        </section>

        {/* Pricing Grid */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-[1240px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const isPopular = plan.popular;
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl p-6 lg:p-8 transition-all ${
                      isPopular
                        ? "bg-primary text-primary-foreground shadow-xl lg:scale-105 border border-primary"
                        : "bg-white text-foreground border border-border shadow-sm hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary text-xs font-semibold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                        Le plus populaire
                      </span>
                    )}

                    <h3
                      className={`font-display font-bold text-2xl mb-1 ${
                        isPopular ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={`text-sm mb-6 ${
                        isPopular
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {plan.tagline}
                    </p>

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check
                            className={`w-5 h-5 shrink-0 mt-0.5 ${
                              isPopular ? "text-gold" : "text-primary"
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              isPopular
                                ? "text-primary-foreground/90"
                                : "text-muted-foreground"
                            }`}
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link to="/auth" className="block w-full">
                      <Button
                        className={`w-full rounded-lg font-semibold ${
                          isPopular
                            ? "bg-gold hover:bg-gold-light text-primary"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        }`}
                        size="lg"
                      >
                        Commencer l'essai gratuit 30 jours
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-10">
              Toutes les fonctionnalités en essai gratuit 30 jours, sans CB.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-20 bg-secondary">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-foreground text-center mb-10">
              Questions fréquentes
            </h2>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white border border-border rounded-lg px-6 shadow-sm"
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
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default PricingNew;
