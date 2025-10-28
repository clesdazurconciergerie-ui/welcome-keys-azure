import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, ArrowRight } from "lucide-react";

export default function ExpiredDemoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
            <Clock className="h-10 w-10 text-orange-600" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Votre période d'essai est terminée
          </CardTitle>
          <CardDescription className="text-lg">
            Merci d'avoir testé Wlekom ! Votre période d'essai de 7 jours est maintenant terminée.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Continuez avec la version complète
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Accès illimité à tous vos livrets</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Chatbot IA intelligent pour vos invités</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Personnalisation complète (couleurs, logo, contenu)</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Galerie photos, équipements, points d'intérêt</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Support prioritaire</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => navigate('/pricing')}
              size="lg"
              className="flex-1"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Voir les offres
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Retour au tableau de bord
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Vos données sont conservées et seront accessibles dès que vous souscrivez à une offre.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
