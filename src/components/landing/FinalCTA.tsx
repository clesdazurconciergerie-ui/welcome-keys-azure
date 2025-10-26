import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
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
      toast.loading("Activation de la démo...");
      
      const response = await supabase.functions.invoke('activate-demo', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        toast.dismiss();
        toast.error("Impossible d'activer la démo. Vous l'avez peut-être déjà utilisée.");
        return;
      }

      toast.dismiss();
      toast.success("Démo activée ! Redirection...");
      
      setTimeout(() => {
        navigate('/booklets/new');
      }, 1000);
    } catch (error) {
      toast.dismiss();
      console.error('Error activating demo:', error);
      toast.error("Une erreur est survenue lors de l'activation de la démo");
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
              onClick={handleDemoClick}
              className="h-12 px-8 bg-primary hover:bg-[hsl(var(--brand-cyan-hover))] text-white rounded-[18px] shadow-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Demander une démo
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/acces-livret")}
              className="h-12 px-8 border-2 rounded-[18px]"
            >
              Accéder à un livret
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
