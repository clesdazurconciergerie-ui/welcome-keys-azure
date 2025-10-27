import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PhoneMockup from "./PhoneMockup";

const Hero = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const mockupVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="bg-white min-h-[90vh] flex items-center">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 py-20 lg:py-24 w-full">
        <motion.div 
          className="grid lg:grid-cols-2 gap-8 lg:gap-24 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Colonne gauche - Texte */}
          <div className="order-2 lg:order-1">
            <motion.h1 
              variants={itemVariants}
              className="font-extrabold leading-[1.05] text-[clamp(40px,7vw,86px)] text-slate-900"
            >
              Le livret d'accueil qui simplifie leur séjour et votre quotidien !
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="mt-6 text-[18px] lg:text-[20px] leading-7 text-slate-600 max-w-[600px] opacity-80"
            >
              Votre livret d'accueil digital pour Airbnb, hôtels, gîtes, campings – accessible par simple QR code.
            </motion.p>
            
            <motion.div 
              variants={itemVariants}
              className="mt-8"
            >
              <button
                onClick={() => navigate("/booklets/new")}
                className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-white font-semibold text-base
                  transition-all duration-300 ease-out
                  hover:brightness-115 hover:shadow-lg hover:-translate-y-0.5
                  active:translate-y-0
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#071552]
                  motion-reduce:hover:translate-y-0"
                style={{ backgroundColor: '#071552' }}
                aria-label="Créer mon livret maintenant"
              >
                Créer mon livret maintenant →
              </button>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              className="mt-4 flex items-center gap-2 text-slate-500 text-sm"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="#F59E0B" 
                aria-hidden="true"
              >
                <path d="M12 2l2.9 6.9 7.6.6-5.7 4.8 1.8 7.3L12 17.9 5.4 21.6l1.8-7.3L1.5 9.5l7.6-.6L12 2z"/>
              </svg>
              <span>Déjà adopté par des hôtes partout en France !</span>
            </motion.div>
          </div>

          {/* Colonne droite - Mockups iPhone */}
          <motion.div 
            variants={itemVariants}
            className="relative flex justify-center lg:justify-end order-1 lg:order-2 min-h-[560px]"
          >
            {/* Back phone - hidden on mobile */}
            <motion.div 
              variants={mockupVariants}
              className="hidden sm:block absolute -left-8 top-5 -rotate-[10deg]"
              style={{ zIndex: 1 }}
            >
              <PhoneMockup variant="back" />
            </motion.div>
            
            {/* Front phone */}
            <motion.div 
              variants={mockupVariants}
              className="relative rotate-[10deg] lg:scale-100 scale-[0.8]"
              style={{ zIndex: 2 }}
            >
              <PhoneMockup variant="front" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;