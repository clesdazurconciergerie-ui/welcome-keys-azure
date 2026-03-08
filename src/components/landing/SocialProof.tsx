import { motion } from "framer-motion";
import { TrendingUp, Clock, Shield, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CountUpValue = ({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) => {
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
            const progress = Math.min(elapsed / 1800, 1);
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
  }, [end]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
};

const SocialProof = () => {
  const metrics = [
    { icon: TrendingUp, end: 35, prefix: "+", suffix: "%", label: "de revenus en moyenne", color: "from-gold/20 to-gold/5" },
    { icon: Clock, end: 10, suffix: "h", label: "gagnées par semaine", color: "from-blue-500/20 to-blue-500/5" },
    { icon: Shield, end: 100, suffix: "%", label: "transparence propriétaires", color: "from-emerald-500/20 to-emerald-500/5" },
    { icon: Star, end: 49, suffix: "/5", label: "satisfaction clients", displayValue: "4.9", color: "from-gold/20 to-gold/5" },
  ];

  return (
    <section className="py-14 bg-background relative">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {metrics.map(({ icon: Icon, end, prefix, suffix, label, color, displayValue }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group relative rounded-2xl border border-border bg-card p-5 text-center
                hover:border-gold/20 hover:shadow-lg transition-all duration-300"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-3 group-hover:bg-gold/10 transition-colors">
                  <Icon className="w-5 h-5 text-primary group-hover:text-gold transition-colors" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-foreground mb-1">
                  {displayValue ? displayValue : <CountUpValue end={end} prefix={prefix || ""} suffix={suffix || ""} />}
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProof;
