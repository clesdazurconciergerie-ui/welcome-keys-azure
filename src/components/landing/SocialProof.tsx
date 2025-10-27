import { motion } from "framer-motion";
import { Building2, Home, Hotel, Tent, QrCode } from "lucide-react";

const SocialProof = () => {
  const icons = [
    { Icon: Home, label: "Airbnb" },
    { Icon: Hotel, label: "Hôtels" },
    { Icon: Building2, label: "Gîtes" },
    { Icon: Tent, label: "Campings" },
    { Icon: QrCode, label: "QR Code" },
  ];

  return (
    <section className="py-12 bg-white border-y border-slate-200">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          {/* Headline */}
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Fait pour les pros et les particuliers
          </p>

          {/* Icons */}
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {icons.map(({ Icon, label }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-200">
                  <Icon className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                </div>
                <span className="text-xs text-slate-500 font-medium">{label}</span>
              </motion.div>
            ))}
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg 
                  key={i}
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="#F59E0B"
                  aria-hidden="true"
                >
                  <path d="M12 2l2.9 6.9 7.6.6-5.7 4.8 1.8 7.3L12 17.9 5.4 21.6l1.8-7.3L1.5 9.5l7.6-.6L12 2z"/>
                </svg>
              ))}
            </div>
            <span className="text-sm font-semibold">4,9/5</span>
            <span className="text-sm text-slate-500">— Note moyenne</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProof;
