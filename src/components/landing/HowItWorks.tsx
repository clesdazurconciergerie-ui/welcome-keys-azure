import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Edit3, QrCode, RefreshCcw } from "lucide-react";

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: Edit3,
      number: "1",
      title: "Créez votre livret",
      description: "Remplissez les informations en 5 minutes. Interface guidée et intuitive."
    },
    {
      icon: QrCode,
      number: "2",
      title: "Partagez le QR code",
      description: "Affichez-le au check-in, sur la porte, le frigo — où vous voulez."
    },
    {
      icon: RefreshCcw,
      number: "3",
      title: "Mettez à jour en un clic",
      description: "Changez les infos en temps réel. Vos voyageurs voient toujours la bonne version."
    }
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 bg-white scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="font-extrabold text-[2rem] sm:text-[2.5rem] md:text-[3rem] text-slate-900 leading-tight mb-3 sm:mb-4 px-4">
            Comment ça marche ?
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-4">
            Créez votre livret d'accueil en quelques minutes et partagez-le instantanément
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12 mb-10 sm:mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center px-4"
            >
              {/* Connecting line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-slate-200" />
              )}

              {/* Number badge */}
              <div 
                className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-5 sm:mb-6 rounded-xl sm:rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(7, 21, 82, 0.08)' }}
              >
                <div 
                  className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm"
                  style={{ backgroundColor: '#071552' }}
                >
                  {step.number}
                </div>
                <step.icon className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: '#071552' }} strokeWidth={1.5} />
              </div>

              {/* Text */}
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center px-4"
        >
          <button
            onClick={() => navigate("/booklets/new")}
            className="text-white font-semibold px-6 sm:px-7 py-2.5 sm:py-3 rounded-xl transition-all duration-300 hover:brightness-115 hover:shadow-lg hover:-translate-y-0.5 text-sm sm:text-base w-full sm:w-auto max-w-sm"
            style={{ backgroundColor: '#071552' }}
            aria-label="Créer mon livret maintenant"
          >
            Créer mon livret maintenant →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
