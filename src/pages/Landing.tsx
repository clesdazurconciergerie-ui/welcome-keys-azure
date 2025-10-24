import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Waves, 
  FileText, 
  Lock, 
  MessageSquare, 
  Smartphone, 
  Sparkles,
  ArrowRight,
  Check
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Livrets élégants",
      description: "Créez des livrets d'accueil numériques professionnels et personnalisés"
    },
    {
      icon: Lock,
      title: "Accès sécurisé par PIN",
      description: "Vos invités accèdent facilement via un code unique et sécurisé"
    },
    {
      icon: MessageSquare,
      title: "Chatbot intelligent",
      description: "Un assistant conversationnel pour répondre aux questions 24/7"
    },
    {
      icon: Smartphone,
      title: "Mobile-first",
      description: "Interface optimisée pour tous les appareils mobiles"
    },
    {
      icon: Sparkles,
      title: "Design premium",
      description: "Interface moderne inspirée des standards iOS"
    }
  ];

  const steps = [
    "Créez votre livret avec notre éditeur visuel",
    "Ajoutez infos pratiques, équipements et lieux d'intérêt",
    "Générez un PIN unique pour vos invités",
    "Partagez le lien ou le QR code"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Waves className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold gradient-text">Clés d'Azur</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Connexion
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Commencer
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Livrets d'accueil nouvelle génération
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
            Des livrets d'accueil
            <br />
            <span className="gradient-text">numériques premium</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Offrez une expérience d'accueil inoubliable à vos locataires avec des livrets 
            numériques élégants, accessibles via PIN et équipés d'un chatbot intelligent.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Créer un livret
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-muted-foreground">
              Une solution complète pour vos livrets d'accueil numériques
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass border-0 shadow-md transition-smooth hover:shadow-premium">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-xl text-muted-foreground">
              Créez votre livret en quelques étapes simples
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4 items-start glass p-6 rounded-xl border-0 shadow-md">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium">{step}</p>
                </div>
                <Check className="w-6 h-6 text-primary flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="glass border-0 shadow-premium max-w-4xl mx-auto">
          <CardContent className="py-16 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Prêt à commencer ?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Créez votre premier livret d'accueil numérique dès maintenant
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Créer mon premier livret
              <ArrowRight className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Clés d'Azur. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
