import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";

export default function DemoExpirationBanner() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkDemoStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('role, demo_token_expires_at')
        .eq('id', user.id)
        .single();

      if (userData?.role === 'demo_user' && userData.demo_token_expires_at) {
        const expiresAt = new Date(userData.demo_token_expires_at);
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0 && diffDays <= 7) {
          setIsDemo(true);
          setDaysRemaining(diffDays);
        } else if (diffDays <= 0) {
          // Demo expired
          setIsDemo(true);
          setDaysRemaining(0);
        }
      }
    };

    checkDemoStatus();
  }, []);

  if (!isDemo || daysRemaining === null) return null;

  if (daysRemaining === 0) {
    return (
      <Alert className="border-destructive bg-destructive/10 mb-4">
        <Clock className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-destructive font-medium">
            Votre période d'essai est terminée. Passez à la version complète pour continuer à utiliser vos livrets.
          </span>
          <Button 
            onClick={() => navigate('/tarifs')}
            variant="destructive"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Passer à la version complète
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const bgColor = daysRemaining <= 2 ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200";
  const textColor = daysRemaining <= 2 ? "text-orange-800" : "text-blue-800";
  const iconColor = daysRemaining <= 2 ? "text-orange-600" : "text-blue-600";

  return (
    <Alert className={`${bgColor} mb-4`}>
      <Clock className={`h-4 w-4 ${iconColor}`} />
      <AlertDescription className="flex items-center justify-between">
        <span className={`${textColor} font-medium`}>
          {daysRemaining === 1 
            ? "Dernier jour d'essai ! Ne perdez pas l'accès à votre livret." 
            : `Plus que ${daysRemaining} jours d'essai gratuit.`}
        </span>
        <Button 
          onClick={() => navigate('/tarifs')}
          variant="outline"
          size="sm"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Passer à la version complète
        </Button>
      </AlertDescription>
    </Alert>
  );
}
