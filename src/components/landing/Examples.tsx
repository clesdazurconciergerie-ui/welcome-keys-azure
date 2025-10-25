import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Examples = () => {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const examples = [
    {
      title: "T2 centre-ville",
      description: "Appartement moderne avec toutes commodités",
      image: "🏙️",
      color: "from-cyan-50 to-cyan-100",
    },
    {
      title: "Villa avec piscine",
      description: "Maison familiale avec jardin et piscine",
      image: "🏊",
      color: "from-cyan-50 to-cyan-100",
    },
    {
      title: "Studio vue mer",
      description: "Cosy studio avec vue panoramique",
      image: "🌊",
      color: "from-cyan-50 to-cyan-100",
    },
  ];

  return (
    <section id="examples" className="py-20 md:py-24 bg-secondary/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Exemples de livrets
          </h2>
          <p className="text-lg text-muted-foreground">
            Découvrez comment nos livrets s'adaptent à différents types de biens
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {examples.map((example, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
            >
              <Card className="h-full overflow-hidden border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white">
                <CardContent className="p-0">
                  <div
                    className={`h-40 flex items-center justify-center text-6xl bg-gradient-to-br ${example.color} transition-transform duration-300 ${
                      hoveredIndex === index ? "scale-110" : ""
                    }`}
                  >
                    {example.image}
                  </div>
                  <div className="p-6">
                    <h3 className="font-display font-semibold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                      {example.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">{example.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <button
            onClick={() => navigate("/acces-livret")}
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-lg focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-4 py-2"
          >
            Voir un exemple
            <ExternalLink className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Examples;
