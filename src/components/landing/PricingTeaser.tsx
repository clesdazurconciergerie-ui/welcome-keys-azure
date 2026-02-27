import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { pricingPlans } from "@/config/pricing";

const PricingTeaser = () => {
  const navigate = useNavigate();
  const plans = pricingPlans.sort((a, b) => a.order - b.order).slice(0, 3);

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-secondary scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">
            Une formule pour chaque ambition
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Commencez gratuitement, évoluez à votre rythme</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-card rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-lg ${
                plan.is_featured ? 'border-gold shadow-lg sm:col-span-2 lg:col-span-1' : 'border-border'
              }`}
            >
              {plan.badge && (
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-primary-foreground bg-gold mb-4">
                  {plan.badge}
                </div>
              )}
              <h3 className="!text-[1.25rem] font-bold text-foreground mb-1">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{plan.livrets}</p>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-foreground">{plan.price}€</span>
                <span className="text-sm text-muted-foreground">/mois</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.is_featured ? 'text-gold' : 'text-green-500'}`} strokeWidth={2.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={`/tarifs?plan=${encodeURIComponent(plan.id)}`}
                className={`block w-full text-center rounded-xl px-5 py-3 font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  plan.is_featured 
                    ? 'bg-gold text-primary hover:bg-gold-light' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }} className="text-center">
          <button
            onClick={() => navigate("/tarifs")}
            className="text-sm font-medium px-6 py-3 rounded-xl border-2 border-primary text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
          >
            Voir tous les tarifs →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingTeaser;
