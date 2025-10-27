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
    <section id="how-it-works" className="py-20 lg:py-24 bg-white scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-extrabold text-[clamp(32px,5vw,48px)] text-slate-900 leading-tight mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Créez votre livret d'accueil en quelques minutes et partagez-le instantanément
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              {/* Connecting line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-slate-200" />
              )}

              {/* Number badge */}
              <div 
                className="relative w-32 h-32 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(7, 21, 82, 0.08)' }}
              >
                <div 
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: '#071552' }}
                >
                  {step.number}
                </div>
                <step.icon className="w-12 h-12" style={{ color: '#071552' }} strokeWidth={1.5} />
              </div>

              {/* Text */}
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
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
          className="text-center"
        >
          <button
            onClick={() => navigate("/booklets/new")}
            className="text-white font-semibold px-7 py-3 rounded-xl transition-all duration-300 hover:brightness-115 hover:shadow-lg hover:-translate-y-0.5"
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
