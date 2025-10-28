import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FinalCTA = () => {
  const navigate = useNavigate();

  const handleDemoClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth?mode=demo');
      return;
    }

    try {
      toast.loading("Création de votre livret de démo...");
      
      const response = await supabase.functions.invoke('activate-demo', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      toast.dismiss();

      if (response.error) {
        toast.error("Vous avez déjà utilisé votre démo gratuite.");
        return;
      }

      if (response.data?.pin_code) {
        toast.success("Livret de démo créé ! Redirection...");
        // Redirect to public view of the demo booklet
        setTimeout(() => {
          window.location.href = `/view/${response.data.pin_code}`;
        }, 1000);
      } else {
        toast.error("Erreur lors de la création du livret");
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error activating demo:', error);
      toast.error("Une erreur est survenue");
    }
  };

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-white to-primary/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-6"
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-foreground">
            Prêt à créer votre premier livret ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Testez gratuitement. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate("/acces-livret")}
              className="h-12 px-8 bg-[#071552] text-white rounded-[18px]
                shadow-[0_6px_18px_rgba(7,21,82,0.18)] transition-all duration-200 ease-out
                hover:bg-[#0b1b6a] hover:shadow-[0_10px_24px_rgba(7,21,82,0.28)]
                hover:-translate-y-[1px] hover:scale-[1.015]
                active:bg-[#061142] active:shadow-[0_4px_12px_rgba(7,21,82,0.24)] active:translate-y-0 active:scale-100
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
                disabled:bg-[#aab0c5] disabled:text-[#f4f5f9] disabled:shadow-none disabled:cursor-not-allowed
                disabled:transform-none
                motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
              aria-label="Voir un livret d'accueil via code PIN"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Voir un livret
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleDemoClick}
              className="h-12 px-8 border-2 border-[#071552] text-[#071552] bg-white rounded-[18px]
                transition-all duration-200 ease-out
                hover:bg-[#071552] hover:text-white hover:shadow-md
                active:bg-[#061142]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]"
              aria-label="Demander une démo gratuite"
            >
              Demander une démo
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
