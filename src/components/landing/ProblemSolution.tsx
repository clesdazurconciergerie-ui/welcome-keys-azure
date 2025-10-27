import { motion } from "framer-motion";
import { MessageSquareX, MapPinOff, FileX2, TrendingDown, Sparkles, MousePointerClick, RefreshCw, TrendingUp } from "lucide-react";

const ProblemSolution = () => {
  const problems = [
    {
      icon: MessageSquareX,
      text: "Multi-messages aux voyageurs"
    },
    {
      icon: MapPinOff,
      text: "Infos introuvables / codes perdus"
    },
    {
      icon: FileX2,
      text: "Supports papier obsolètes"
    },
    {
      icon: TrendingDown,
      text: "Avis clients en baisse"
    }
  ];

  const solutions = [
    {
      icon: Sparkles,
      text: "Livret unique, QR code partout"
    },
    {
      icon: MousePointerClick,
      text: "Accès codes & consignes en 1 clic"
    },
    {
      icon: RefreshCw,
      text: "Mises à jour instantanées"
    },
    {
      icon: TrendingUp,
      text: "Expérience premium = meilleurs avis"
    }
  ];

  return (
    <section className="py-20 lg:py-24 bg-slate-50">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-extrabold text-[clamp(32px,5vw,48px)] text-slate-900 leading-tight mb-4">
            La solution aux problèmes du quotidien
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Simplifiez la gestion de vos locations et offrez une expérience inoubliable à vos voyageurs
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Problèmes */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <span className="text-2xl">😓</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Les problèmes</h3>
            </div>
            <ul className="space-y-4">
              {problems.map((problem, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <problem.icon className="w-5 h-5 text-red-500" strokeWidth={2} />
                  </div>
                  <span className="text-slate-700">{problem.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Solutions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl p-8 border-2 shadow-sm"
            style={{ borderColor: '#071552' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(7, 21, 82, 0.1)' }}>
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Avec Welcom</h3>
            </div>
            <ul className="space-y-4">
              {solutions.map((solution, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <solution.icon className="w-5 h-5" style={{ color: '#071552' }} strokeWidth={2} />
                  </div>
                  <span className="text-slate-700">{solution.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium px-6 py-3 rounded-xl border-2 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            style={{ borderColor: '#071552', color: '#071552' }}
          >
            Découvrir les fonctionnalités →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSolution;
