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
  Check,
  KeyRound,
  Info
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
    <div className="min-h-screen bg-white">
      {/* Hero Section - Simplified for travelers */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
            <Waves className="w-12 h-12 text-primary" />
          </div>
          
          {/* Title & Slogan */}
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold gradient-text mb-4">
              Clés d'Azur
            </h1>
            <p className="text-2xl text-muted-foreground font-medium">
              Votre bien, notre expertise.
            </p>
          </div>

          {/* Explanation */}
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Accédez à votre livret d'accueil numérique en quelques secondes 
            grâce à votre code d'accès personnel.
          </p>

          {/* Main CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/acces-livret")}
              className="gap-2 h-14 text-lg px-8"
            >
              <KeyRound className="w-5 h-5" />
              Accéder à un livret
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="gap-2 h-14 text-lg px-8"
            >
              <Info className="w-5 h-5" />
              Découvrir Clés d'Azur
            </Button>
          </div>

          {/* Small link for owners */}
          <div className="pt-8 border-t border-gray-200 mt-8">
            <p className="text-sm text-muted-foreground">
              Vous êtes propriétaire ou gestionnaire de biens ?{" "}
              <button
                onClick={() => navigate("/auth")}
                className="text-primary hover:underline font-medium"
              >
                Accéder au dashboard
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="container mx-auto px-4 py-20 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Livrets d'accueil nouvelle génération
            </div>
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

      {/* CTA Section for property owners */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <Card className="glass border-0 shadow-premium max-w-4xl mx-auto">
          <CardContent className="py-16 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Propriétaire de location saisonnière ?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Créez votre premier livret d'accueil numérique dès maintenant et offrez 
              une expérience inoubliable à vos voyageurs.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Créer mon premier livret
              <ArrowRight className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Waves className="w-5 h-5 text-primary" />
            <span className="font-semibold gradient-text">Clés d'Azur</span>
          </div>
          <p className="text-sm">© 2024 Clés d'Azur. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
