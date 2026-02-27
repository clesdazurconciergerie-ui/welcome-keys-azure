import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Users, Building2 } from "lucide-react";

const Hero = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  const stats = [
    { icon: Building2, value: "500+", label: "Logements gérés" },
    { icon: Users, value: "98%", label: "Propriétaires satisfaits" },
    { icon: BarChart3, value: "+35%", label: "Revenus optimisés" },
  ];

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Background: deep blue gradient */}
      <div className="absolute inset-0 bg-primary" />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(196, 164, 91, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(196, 164, 91, 0.15) 0%, transparent 50%)'
        }}
      />
      {/* Subtle grid */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }}
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-20"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="flex justify-center lg:justify-start mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide border border-gold/30 text-gold bg-gold/10">
            <img src="/brand/logo-azur-keys.png" alt="" className="w-4 h-4 object-contain brightness-0 invert" />
            Développé par Azur Keys Conciergerie
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1 
          variants={itemVariants}
          className="!text-[clamp(2rem,5vw,4rem)] font-extrabold leading-[1.08] text-white max-w-4xl text-center lg:text-left mb-6"
        >
          La plateforme digitale pensée pour les conciergeries{" "}
          <span className="text-gold">orientées performance</span>
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          variants={itemVariants}
          className="!text-[clamp(1rem,1.8vw,1.25rem)] leading-relaxed text-white/70 max-w-2xl text-center lg:text-left mb-10"
        >
          Centralisez vos propriétaires, vos prestataires et vos données dans un seul écosystème premium. Livret d'accueil digital, CRM, suivi ménage et analytics réunis.
        </motion.p>
        
        {/* CTAs */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start items-stretch sm:items-center max-w-lg lg:max-w-none"
        >
          <button
            onClick={() => navigate("/auth?mode=demo")}
            className="group inline-flex items-center justify-center rounded-xl px-7 py-3.5 font-semibold text-sm sm:text-base
              bg-gold text-primary transition-all duration-300 ease-out
              hover:bg-gold-light hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(196,164,91,0.4)]
              active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
              w-full sm:w-auto"
            aria-label="Demander une démonstration"
          >
            Demander une démonstration
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 font-semibold text-sm sm:text-base
              border border-white/20 text-white/90 transition-all duration-300 ease-out
              hover:bg-white/10 hover:border-white/30
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 w-full sm:w-auto"
            aria-label="Découvrir la plateforme"
          >
            Découvrir la plateforme
          </button>
        </motion.div>

        {/* KPI Stats */}
        <motion.div 
          variants={itemVariants}
          className="mt-16 grid grid-cols-3 gap-6 max-w-lg lg:max-w-xl"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                <stat.icon className="w-4 h-4 text-gold" />
                <span className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</span>
              </div>
              <span className="text-xs sm:text-sm text-white/50">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
