import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const FAQ = () => {
  const faqs = [
    {
      question: "Mes données sont-elles protégées ?",
      answer:
        "Oui. Nous utilisons un chiffrement de bout en bout et une architecture RLS avec Supabase. Vos données sont protégées selon les normes RGPD.",
    },
    {
      question: "Le livret fonctionne-t-il hors connexion ?",
      answer:
        "Le livret nécessite une connexion internet pour être consulté. Cependant, le chatbot et toutes les informations sont disponibles 24/7.",
    },
    {
      question: "Puis-je ajouter mon logo et mes couleurs ?",
      answer:
        "Absolument. Vous pouvez personnaliser entièrement l'apparence de votre livret : couleurs HEX, logo, photos, et mise en page.",
    },
    {
      question: "Comment partager un livret ?",
      answer:
        "Vous pouvez partager le code PIN par message ou email, générer un QR code à imprimer, ou envoyer un lien direct à vos invités.",
    },
    {
      question: "Le chatbot fonctionne-t-il sans API ?",
      answer:
        "Le chatbot est pré-configuré et alimenté par le contenu de votre livret. Aucune configuration API n'est nécessaire.",
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tout ce que vous devez savoir sur Welkom
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-[18px] px-6 bg-white hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary py-5 hover:no-underline">
                  <span className="font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
