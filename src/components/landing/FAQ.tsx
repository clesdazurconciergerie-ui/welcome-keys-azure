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
        "Oui, absolument. Toutes les données sont chiffrées et hébergées sur des serveurs sécurisés conformes RGPD. Nous utilisons Supabase avec Row Level Security (RLS) pour garantir que seul vous avez accès à vos livrets.",
    },
    {
      question: "Le livret fonctionne-t-il hors connexion ?",
      answer:
        "Le livret nécessite une connexion internet pour être consulté. Cependant, vos invités peuvent prendre des captures d'écran des informations importantes pour y accéder hors ligne.",
    },
    {
      question: "Puis-je ajouter mon logo et mes couleurs ?",
      answer:
        "Oui, avec les offres Pro et Business, vous pouvez personnaliser entièrement l'apparence de votre livret : logo, couleurs, typographie et mise en page.",
    },
    {
      question: "Le chatbot répond-il automatiquement ?",
      answer:
        "Oui, le chatbot utilise l'IA pour répondre 24/7 aux questions de vos voyageurs en se basant sur les informations de votre livret. Il apprend et s'améliore avec le temps.",
    },
    {
      question: "Puis-je essayer gratuitement ?",
      answer:
        "Oui, l'offre Starter est 100% gratuite et ne nécessite aucune carte bancaire. Vous pouvez créer votre premier livret et le tester sans engagement.",
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-24 bg-secondary/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-muted-foreground">
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
                className="border border-border rounded-2xl px-6 bg-white hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                  {faq.question}
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
