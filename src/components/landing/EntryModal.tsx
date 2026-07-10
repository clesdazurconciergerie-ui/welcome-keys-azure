import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Home, Sparkles } from "lucide-react";

const STORAGE_KEY = "entry-modal-choice";

const EntryModal = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const choice = localStorage.getItem(STORAGE_KEY);
    if (!choice) setOpen(true);
  }, []);

  const persist = (choice: "conciergerie" | "proprietaire" | "prestataire") => {
    localStorage.setItem(STORAGE_KEY, choice);
    setOpen(false);
  };

  const handleConciergerie = () => {
    persist("conciergerie");
    navigate("/auth");
  };

  const handleProprietaire = () => {
    persist("proprietaire");
    navigate("/auth");
  };

  const handlePrestataire = () => {
    persist("prestataire");
    navigate("/auth");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-[#000000]/60 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl rounded-2xl border border-[#FFFFFF]/20 bg-[#000000] p-8 shadow-2xl shadow-[#FFFFFF]/10"
          >
            <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#FFFFFF]/60 to-transparent" />

            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
              Vous êtes :
            </h2>
            <p className="mt-2 text-center text-sm text-white/60">
              Choisissez votre accès — nous mémorisons votre choix sur cet appareil.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={handleConciergerie}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-[#FFFFFF]/20 bg-white/5 px-4 py-7 text-white transition-all duration-200 hover:border-[#FFFFFF]/60 hover:bg-[#FFFFFF]/10 hover:shadow-lg hover:shadow-[#FFFFFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFFFF]/10 transition-colors group-hover:bg-[#FFFFFF]/20">
                  <Building2 className="h-7 w-7 text-[#FFFFFF]" />
                </div>
                <span className="text-base font-semibold">Conciergerie</span>
                <span className="text-xs text-white/50 text-center">Accéder à la plateforme</span>
              </button>

              <button
                onClick={handleProprietaire}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-[#FFFFFF]/20 bg-white/5 px-4 py-7 text-white transition-all duration-200 hover:border-[#FFFFFF]/60 hover:bg-[#FFFFFF]/10 hover:shadow-lg hover:shadow-[#FFFFFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFFFF]/10 transition-colors group-hover:bg-[#FFFFFF]/20">
                  <Home className="h-7 w-7 text-[#FFFFFF]" />
                </div>
                <span className="text-base font-semibold">Propriétaire</span>
                <span className="text-xs text-white/50 text-center">Accéder à mon espace</span>
              </button>

              <button
                onClick={handlePrestataire}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-[#FFFFFF]/20 bg-white/5 px-4 py-7 text-white transition-all duration-200 hover:border-[#FFFFFF]/60 hover:bg-[#FFFFFF]/10 hover:shadow-lg hover:shadow-[#FFFFFF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFFFFF]/10 transition-colors group-hover:bg-[#FFFFFF]/20">
                  <Sparkles className="h-7 w-7 text-[#FFFFFF]" />
                </div>
                <span className="text-base font-semibold">Prestataire ménage</span>
                <span className="text-xs text-white/50 text-center">Accéder à mes missions</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EntryModal;
