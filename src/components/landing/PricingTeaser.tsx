import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { pricingPlans } from "@/config/pricing";

const PricingTeaser = () => {
  const navigate = useNavigate();

  // Afficher les 3 premiers plans
  const plans = pricingPlans
    .sort((a, b) => a.order - b.order)
    .slice(0, 3);

  return (
    <section id="pricing" className="py-16 sm:py-20 lg:py-24 bg-white scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="font-extrabold text-[2rem] sm:text-[2.5rem] md:text-[3rem] text-slate-900 leading-tight mb-3 sm:mb-4 px-4">
            Une formule pour chaque besoin
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-4">
            Commencez gratuitement, évoluez à votre rythme
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto mb-8 sm:mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 border-2 shadow-sm transition-all duration-300 hover:shadow-md ${
                plan.is_featured ? 'border-2 shadow-lg sm:col-span-2 lg:col-span-1' : 'border-slate-200'
              }`}
              style={plan.is_featured ? { borderColor: '#071552' } : {}}
            >
              {plan.badge && (
                <div 
                  className="inline-block px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold text-white mb-3 sm:mb-4"
                  style={{ backgroundColor: '#071552' }}
                >
                  {plan.badge}
                </div>
              )}

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-2">
                {plan.livrets}
              </p>
              <div className="mb-5 sm:mb-6">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {plan.price}€
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-500">/mois</span>
              </div>

              <ul className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                    <Check 
                      className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" 
                      style={{ color: plan.is_featured ? '#071552' : '#10B981' }} 
                      strokeWidth={2.5} 
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`/tarifs?plan=${encodeURIComponent(plan.id)}`}
                data-source="home"
                data-plan={plan.id}
                className="block w-full text-center rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-white font-semibold text-sm sm:text-base transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: '#071552' }}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center px-4"
        >
          <button
            onClick={() => navigate("/tarifs")}
            className="text-xs sm:text-sm font-medium px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl border-2 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 w-full sm:w-auto max-w-xs"
            style={{ borderColor: '#071552', color: '#071552' }}
          >
            Voir tous les tarifs →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingTeaser;
