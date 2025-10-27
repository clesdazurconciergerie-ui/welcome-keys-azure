import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const PricingTeaser = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Gratuit",
      description: "Pour commencer",
      features: [
        "1 livret",
        "Fonctions essentielles",
        "Watermark discret",
        "Support communautaire"
      ]
    },
    {
      name: "Pro",
      description: "Pour les hôtes réguliers",
      features: [
        "Livrets illimités",
        "Branding complet",
        "Support prioritaire",
        "Analytics avancés"
      ],
      highlighted: true
    },
    {
      name: "Business",
      description: "Pour conciergeries",
      features: [
        "Multi-équipes",
        "Domaines personnalisés",
        "SLA garanti",
        "API & intégrations"
      ]
    }
  ];

  return (
    <section id="pricing" className="py-20 lg:py-24 bg-white scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-extrabold text-[clamp(32px,5vw,48px)] text-slate-900 leading-tight mb-4">
            Une formule pour chaque besoin
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Commencez gratuitement, évoluez à votre rythme
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-white rounded-2xl p-6 border-2 shadow-sm transition-all duration-300 hover:shadow-md ${
                plan.highlighted ? 'border-2 shadow-lg' : 'border-slate-200'
              }`}
              style={plan.highlighted ? { borderColor: '#071552' } : {}}
            >
              {plan.highlighted && (
                <div 
                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-4"
                  style={{ backgroundColor: '#071552' }}
                >
                  Populaire
                </div>
              )}

              <h3 className="text-2xl font-bold text-slate-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {plan.description}
              </p>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check 
                      className="w-5 h-5 flex-shrink-0 mt-0.5" 
                      style={{ color: plan.highlighted ? '#071552' : '#10B981' }} 
                      strokeWidth={2.5} 
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={() => navigate("/tarifs")}
            className="text-sm font-medium px-6 py-3 rounded-xl border-2 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
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
