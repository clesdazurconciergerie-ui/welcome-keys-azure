import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";

const FAQ = () => {
  const faqs = [
    { question: "Mes données sont-elles protégées ?", answer: "Oui. Nous utilisons un chiffrement de bout en bout et une architecture RLS avec Supabase. Vos données sont protégées selon les normes RGPD." },
    { question: "Le livret fonctionne-t-il hors connexion ?", answer: "Le livret nécessite une connexion internet pour être consulté. Cependant, le chatbot et toutes les informations sont disponibles 24/7." },
    { question: "Puis-je personnaliser l'apparence ?", answer: "Absolument. Couleurs, logo, photos, mise en page — tout est personnalisable pour refléter l'image de votre conciergerie." },
    { question: "Comment partager un livret ?", answer: "Code PIN par message, QR code à imprimer, ou lien direct. Vos voyageurs accèdent au livret en un instant." },
    { question: "MyWelkom est-il adapté aux grandes conciergeries ?", answer: "Oui, la plateforme est conçue pour scaler : multi-logements, multi-prestataires, analytics avancées et gestion d'équipe." },
  ];

  return (
    <section id="faq" className="py-20 lg:py-28 bg-background scroll-mt-20 relative">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <h2 className="!text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-foreground leading-tight mb-4">Questions fréquentes</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Tout ce que vous devez savoir sur MyWelkom</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-2xl px-6 bg-card hover:border-gold/20 hover:shadow-md transition-all duration-300"
              >
                <AccordionTrigger className="text-left text-foreground py-5 hover:no-underline">
                  <span className="font-semibold pr-2">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
