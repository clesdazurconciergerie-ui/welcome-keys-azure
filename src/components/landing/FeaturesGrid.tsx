import { motion } from "framer-motion";
import { Key, Info, Wrench, Wifi, MapPin, MessageCircleQuestion } from "lucide-react";

const FeaturesGrid = () => {
  const features = [
    {
      icon: Key,
      title: "Codes & accès",
      description: "Boîte à clés, interphone, portail… tous vos codes d'accès centralisés et accessibles."
    },
    {
      icon: Info,
      title: "Infos essentielles",
      description: "Check-in/out, règles de la maison, contacts d'urgence — tout ce qu'il faut savoir."
    },
    {
      icon: Wrench,
      title: "Consignes & équipements",
      description: "Mode d'emploi, déclaration de pannes, garanties — guidez vos voyageurs pas à pas."
    },
    {
      icon: Wifi,
      title: "Wi-Fi",
      description: "Partagez nom et mot de passe du réseau. Désactivez si vous n'en proposez pas."
    },
    {
      icon: MapPin,
      title: "À proximité",
      description: "Image + lien vers chaque lieu d'intérêt. Restaurants, commerces, activités."
    },
    {
      icon: MessageCircleQuestion,
      title: "FAQ & Chatbot",
      description: "FAQ éditable + chatbot intégré pour répondre automatiquement aux questions."
    }
  ];

  return (
    <section id="features" className="py-20 lg:py-24 bg-white scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-extrabold text-[clamp(32px,5vw,48px)] text-slate-900 leading-tight mb-4">
            Fonctionnalités clés
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour créer un livret d'accueil professionnel
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group hover:border-slate-300"
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: 'rgba(7, 21, 82, 0.1)' }}
              >
                <feature.icon className="w-7 h-7" style={{ color: '#071552' }} strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed text-[15px]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-white font-semibold px-7 py-3 rounded-xl transition-all duration-300 hover:brightness-115 hover:shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: '#071552' }}
          >
            Voir la démo →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
