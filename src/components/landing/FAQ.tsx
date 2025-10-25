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
      question: "Comment accéder à mon livret ?",
      answer:
        "Entrez simplement votre code PIN à 6 chiffres sur la page d'accès. Vous recevrez ce code de votre hôte par email ou message. L'accès est instantané et ne nécessite aucune inscription.",
    },
    {
      question: "Le code PIN expire-t-il ?",
      answer:
        "Non, le code PIN reste actif tant que le propriétaire ne le désactive pas. Vous pouvez accéder à votre livret pendant toute la durée de votre séjour et même après si nécessaire.",
    },
    {
      question: "Puis-je partager le livret avec d'autres personnes ?",
      answer:
        "Oui, vous pouvez partager le lien et le code PIN avec les membres de votre groupe. Plusieurs personnes peuvent accéder au livret en même temps sans aucun problème.",
    },
    {
      question: "Que fait le chatbot exactement ?",
      answer:
        "Le chatbot répond automatiquement à vos questions en se basant sur toutes les informations du livret : horaires d'arrivée, équipements, Wi-Fi, restaurants à proximité, etc. Il est disponible 24/7 pour vous aider.",
    },
    {
      question: "Mes données sont-elles protégées ?",
      answer:
        "Absolument. Nous ne collectons aucune donnée personnelle lors de la consultation du livret. Le code PIN est le seul élément nécessaire pour accéder aux informations. Les données sensibles du propriétaire (email, téléphone) ne sont jamais affichées.",
    },
    {
      question: "Le livret fonctionne-t-il hors connexion ?",
      answer:
        "Le livret nécessite une connexion internet pour l'accès initial. Une fois chargé, vous pouvez consulter les informations principales même en cas de connexion instable. Le chatbot nécessite internet pour fonctionner.",
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-32 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg md:text-xl text-[#6C6C6C] max-w-2xl mx-auto">
            Tout ce que vous devez savoir sur Wlekom
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
                className="border border-[#ECEEF3] rounded-xl px-6 data-[state=open]:shadow-md transition-all duration-300"
              >
                <AccordionTrigger className="text-left font-display font-semibold text-lg text-primary hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#6C6C6C] leading-relaxed pb-6">
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
