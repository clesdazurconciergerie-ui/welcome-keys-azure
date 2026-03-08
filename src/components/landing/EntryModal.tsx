import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Home } from "lucide-react";

const EntryModal = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = sessionStorage.getItem("entry-modal-dismissed");
    if (!dismissed) setOpen(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("entry-modal-dismissed", "1");
    setOpen(false);
  };

  const handleConciergerie = () => dismiss();

  const handleProprietaire = () => {
    dismiss();
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
          <div className="absolute inset-0 bg-[#061452]/60 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg rounded-2xl border border-[#C4A45B]/20 bg-[#061452] p-8 shadow-2xl shadow-[#C4A45B]/10"
          >
            {/* Glow accent */}
            <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#C4A45B]/60 to-transparent" />

            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
              Vous êtes :
            </h2>
            <p className="mt-2 text-center text-sm text-white/60">
              Choisissez votre accès pour continuer
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Conciergerie */}
              <button
                onClick={handleConciergerie}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-[#C4A45B]/20 bg-white/5 px-6 py-8 text-white transition-all duration-200 hover:border-[#C4A45B]/60 hover:bg-[#C4A45B]/10 hover:shadow-lg hover:shadow-[#C4A45B]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A45B]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C4A45B]/10 transition-colors group-hover:bg-[#C4A45B]/20">
                  <Building2 className="h-7 w-7 text-[#C4A45B]" />
                </div>
                <span className="text-lg font-semibold">Conciergerie</span>
                <span className="text-xs text-white/50">Accéder à la plateforme</span>
              </button>

              {/* Propriétaire */}
              <button
                onClick={handleProprietaire}
                className="group flex flex-col items-center gap-3 rounded-xl border-2 border-[#C4A45B]/20 bg-white/5 px-6 py-8 text-white transition-all duration-200 hover:border-[#C4A45B]/60 hover:bg-[#C4A45B]/10 hover:shadow-lg hover:shadow-[#C4A45B]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A45B]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C4A45B]/10 transition-colors group-hover:bg-[#C4A45B]/20">
                  <Home className="h-7 w-7 text-[#C4A45B]" />
                </div>
                <span className="text-lg font-semibold">Propriétaire</span>
                <span className="text-xs text-white/50">Accéder à mon espace</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EntryModal;
