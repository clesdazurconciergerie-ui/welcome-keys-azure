import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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

  return (
    <section className="relative flex flex-col justify-center items-center text-center min-h-[90vh] overflow-hidden bg-gradient-to-br from-white via-[#f9fbff] to-[#eef3ff]">
      {/* Halo lumineux central */}
      <div 
        className="absolute inset-0 blur-[100px] opacity-30"
        style={{
          background: 'radial-gradient(circle at center, rgba(7, 21, 82, 0.25) 0%, transparent 70%)'
        }}
      />

      {/* Grille géométrique animée */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(120deg, rgba(7, 21, 82, 0.08) 1px, transparent 1px),
            linear-gradient(60deg, rgba(7, 21, 82, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'moveGrid 40s linear infinite'
        }}
      />

      {/* Contenu principal avec effet verre */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-5xl px-6 py-12 mx-4"
      >
        {/* Titre principal */}
        <motion.h1 
          variants={itemVariants}
          className="font-extrabold leading-[1.05] text-[clamp(48px,7vw,88px)] text-slate-900 mb-6"
        >
          Livret d'accueil digital pour conciergerie et location saisonnière
        </motion.h1>
        
        {/* Sous-titre */}
        <motion.p 
          variants={itemVariants}
          className="text-lg lg:text-xl leading-relaxed text-slate-600 max-w-[650px] mx-auto mb-10 opacity-80"
        >
          Créez un livret de bienvenue numérique moderne pour vos locations Airbnb, gîtes, hôtels et campings — accessible instantanément via QR code ou code PIN.
        </motion.p>
        
        {/* Boutons CTA */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={() => navigate("/booklets/new")}
            className="group inline-flex items-center justify-center rounded-2xl px-8 py-4 text-white font-semibold text-base
              transition-all duration-300 ease-out
              hover:-translate-y-0.5
              active:translate-y-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              motion-reduce:hover:translate-y-0
              shadow-lg"
            style={{ 
              backgroundColor: '#071552',
              boxShadow: '0 10px 25px rgba(7, 21, 82, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(7, 21, 82, 0.3), 0 15px 35px rgba(7, 21, 82, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(7, 21, 82, 0.15)';
            }}
            aria-label="Créer mon livret maintenant"
          >
            Créer mon livret maintenant →
          </button>
          
          <button
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center justify-center rounded-2xl px-8 py-4 font-semibold text-base
              transition-all duration-300 ease-out
              hover:bg-[#071552]/5
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ 
              border: '1px solid rgba(7, 21, 82, 0.2)',
              color: '#071552'
            }}
            aria-label="Voir la démo"
          >
            Voir la démo
          </button>
        </motion.div>

        {/* Badge confiance */}
        <motion.div 
          variants={itemVariants}
          className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-sm"
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
      </motion.div>

      {/* Animation CSS pour la grille */}
      <style>{`
        @keyframes moveGrid {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 120px 60px;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;