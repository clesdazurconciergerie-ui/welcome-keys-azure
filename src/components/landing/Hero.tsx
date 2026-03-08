import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Calendar, ClipboardCheck, TrendingUp, BookOpen, Bell, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CountUp = ({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(end * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* Floating UI card component */
const FloatingCard = ({ children, className, delay = 0, y = 0 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    <motion.div
      animate={{ y: [0, y, 0] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  </motion.div>
);

const Hero = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-primary" />
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(42 46% 56% / 0.3) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-30%] right-[-15%] w-[70%] h-[70%] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(232 85% 30% / 0.5) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[40%] right-[10%] w-[40%] h-[40%] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(42 46% 56% / 0.2) 0%, transparent 70%)' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-24 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-8 items-center">
          {/* LEFT: Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide border border-gold/30 text-gold bg-gold/10 backdrop-blur-sm">
                <img src="/brand/logo-azur-keys.png" alt="" className="w-4 h-4 object-contain brightness-0 invert" />
                Développé par Azur Keys Conciergerie
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className="!text-[clamp(2.25rem,5.5vw,4.25rem)] font-extrabold leading-[1.06] text-white max-w-xl mb-6"
            >
              La plateforme digitale pour les{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  conciergeries
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 w-full h-[3px] rounded-full bg-gradient-to-r from-gold to-gold-light"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'left' }}
                />
              </span>{" "}
              orientées{" "}
              <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">performance</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="!text-[clamp(1rem,1.6vw,1.2rem)] leading-relaxed text-white/65 max-w-lg mb-8"
            >
              Centralisez propriétaires, prestataires et données dans un écosystème premium. CRM, livret digital, suivi ménage et analytics réunis.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12"
            >
              <button
                onClick={() => navigate("/auth?mode=demo")}
                className="group relative inline-flex items-center justify-center rounded-xl px-7 py-3.5 font-semibold text-sm sm:text-base
                  bg-gold text-primary overflow-hidden
                  transition-all duration-300 ease-out
                  hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(196,164,91,0.45)]
                  active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                  w-full sm:w-auto"
                aria-label="Demander une démonstration"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-gold-light to-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center">
                  Demander une démonstration
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>

              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 font-semibold text-sm sm:text-base
                  border border-white/15 text-white/85 backdrop-blur-sm
                  transition-all duration-300 ease-out
                  hover:bg-white/[0.08] hover:border-white/25 hover:text-white
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 w-full sm:w-auto"
                aria-label="Découvrir la plateforme"
              >
                Découvrir la plateforme
              </button>
            </motion.div>

            {/* KPI Stats with count-up */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-3 gap-6 max-w-md"
            >
              {[
                { value: 500, suffix: "+", label: "Logements gérés" },
                { value: 98, suffix: "%", label: "Satisfaction" },
                { value: 35, suffix: "%", label: "Revenus optimisés", prefix: "+" },
              ].map((stat, i) => (
                <div key={i} className="text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {stat.prefix}<CountUp end={stat.value} suffix={stat.suffix} />
                  </div>
                  <span className="text-xs text-white/40">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT: Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            {/* Glow behind dashboard */}
            <div className="absolute inset-0 -m-10 rounded-3xl" style={{
              background: 'radial-gradient(ellipse at center, hsl(42 46% 56% / 0.12) 0%, transparent 70%)',
            }} />

            {/* Main Dashboard Card */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-1 shadow-2xl">
              <div className="rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-6 space-y-5">
                {/* Dashboard header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Dashboard Performance</div>
                      <div className="text-[10px] text-white/40">Temps réel · Mars 2026</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Revenu brut", value: "28 450€", change: "+12%", up: true },
                    { label: "Occupation", value: "87%", change: "+5%", up: true },
                    { label: "Logements", value: "42", change: "+3", up: true },
                  ].map((kpi, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="rounded-lg bg-white/[0.06] border border-white/[0.08] p-3"
                    >
                      <div className="text-[10px] text-white/40 mb-1">{kpi.label}</div>
                      <div className="text-lg font-bold text-white">{kpi.value}</div>
                      <div className="text-[10px] text-emerald-400 font-medium">{kpi.change}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-4 h-28 flex items-end gap-1.5">
                  {[35, 45, 30, 55, 48, 65, 58, 72, 68, 80, 75, 85].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-gold/40 to-gold/80"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 1 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                    />
                  ))}
                </div>

                {/* Recent activity */}
                <div className="space-y-2">
                  {[
                    { icon: Calendar, text: "Check-in Villa Riviera", time: "14:00", color: "text-blue-400" },
                    { icon: ClipboardCheck, text: "Ménage validé — Apt. Miramar", time: "11:30", color: "text-emerald-400" },
                    { icon: Users, text: "Nouveau propriétaire ajouté", time: "09:15", color: "text-gold" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.15 }}
                      className="flex items-center gap-3 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2"
                    >
                      <item.icon className={`w-3.5 h-3.5 ${item.color} flex-shrink-0`} />
                      <span className="text-xs text-white/70 flex-1 truncate">{item.text}</span>
                      <span className="text-[10px] text-white/30">{item.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <FloatingCard
              className="absolute -left-12 top-8"
              delay={0.6}
              y={-8}
            >
              <div className="rounded-xl bg-white/[0.1] backdrop-blur-lg border border-white/[0.12] px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold/20 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-white">Livret publié</div>
                    <div className="text-[9px] text-white/40">Villa Les Pins</div>
                  </div>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard
              className="absolute -right-8 top-1/3"
              delay={0.9}
              y={-6}
            >
              <div className="rounded-xl bg-white/[0.1] backdrop-blur-lg border border-white/[0.12] px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-400/20 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-white">Mission acceptée</div>
                    <div className="text-[9px] text-white/40">Ménage · 15h00</div>
                  </div>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard
              className="absolute -left-6 bottom-16"
              delay={1.2}
              y={-10}
            >
              <div className="rounded-xl bg-white/[0.1] backdrop-blur-lg border border-white/[0.12] px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-400/20 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-white">+18% ce mois</div>
                    <div className="text-[9px] text-white/40">Revenus en hausse</div>
                  </div>
                </div>
              </div>
            </FloatingCard>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
