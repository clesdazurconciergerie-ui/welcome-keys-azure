import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Smartphone, Eye, QrCode } from "lucide-react";

const DemoSection = () => {
  const navigate = useNavigate();

  return (
    <section id="demo" className="py-20 lg:py-24 bg-slate-50 scroll-mt-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-extrabold text-[clamp(32px,5vw,48px)] text-slate-900 leading-tight mb-4">
            Essayez par vous-même
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Découvrez comment vos voyageurs accèdent au livret en un instant
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left: QR Code Demo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl p-8 border-2 shadow-lg text-center"
            style={{ borderColor: '#071552' }}
          >
            <div className="mb-6">
              <div className="w-48 h-48 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-200">
                {/* Placeholder QR code */}
                <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center border border-slate-300">
                  <div className="text-center space-y-2">
                    <QrCode className="w-12 h-12 mx-auto" style={{ color: '#071552' }} />
                    <p className="text-xs text-slate-500">QR Code de démo</p>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Scannez pour tester
            </h3>
            <p className="text-slate-600 mb-6">
              Accédez instantanément à un livret de démonstration complet
            </p>

            <button
              onClick={() => navigate("/auth?mode=demo")}
              className="w-full text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:brightness-115 hover:shadow-lg"
              style={{ backgroundColor: '#071552' }}
              aria-label="Essayer gratuitement"
            >
              <Smartphone className="inline-block w-5 h-5 mr-2 mb-1" />
              Essayer gratuitement
            </button>
          </motion.div>

          {/* Right: Features list */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(7, 21, 82, 0.1)' }}
              >
                <Eye className="w-5 h-5" style={{ color: '#071552' }} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Aperçu instantané</h4>
                <p className="text-slate-600 text-sm">
                  Visualisez comment vos voyageurs découvrent votre livret sur mobile
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(7, 21, 82, 0.1)' }}
              >
                <Smartphone className="w-5 h-5" style={{ color: '#071552' }} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Design responsive</h4>
                <p className="text-slate-600 text-sm">
                  Interface optimisée pour tous les smartphones et tablettes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(7, 21, 82, 0.1)' }}
              >
                <QrCode className="w-5 h-5" style={{ color: '#071552' }} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">QR code inclus</h4>
                <p className="text-slate-600 text-sm">
                  Générez automatiquement un QR code élégant prêt à imprimer
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Additional note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-slate-500">
            ⚡ Moins de 2,5s de chargement · 📱 Compatible tous appareils · 🔒 Données sécurisées
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default DemoSection;
