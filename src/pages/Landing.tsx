import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Waves, KeyRound } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-white relative overflow-hidden">
      {/* Radial gradient background */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: 'radial-gradient(circle at center, rgba(7,21,82,0.04), rgba(255,255,255,1))'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-10 animate-fade-in">
        {/* Logo icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/5 mb-4 animate-scale-in">
          <Waves className="w-10 h-10 text-primary" />
        </div>
        
        {/* Title & Subtitle */}
        <div className="space-y-3">
          <h1 className="font-display font-bold text-5xl md:text-6xl lg:text-7xl text-primary tracking-tight">
            Clés d'Azur
          </h1>
          <div className="w-24 h-px bg-primary/20 mx-auto" />
          <p className="font-display text-xl md:text-2xl text-muted-foreground font-medium tracking-wide">
            Votre bien, notre expertise.
          </p>
        </div>

        {/* Intro text */}
        <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed px-4">
          Accédez à votre livret d'accueil numérique en quelques secondes grâce à votre code personnel.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Button 
            size="lg" 
            onClick={() => navigate("/acces-livret")}
            className="gap-2 h-12 px-8 text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <KeyRound className="w-5 h-5" />
            Accéder à un livret
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/auth")}
            className="gap-2 h-12 px-8 text-base font-medium border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105"
          >
            Découvrir Clés d'Azur
          </Button>
        </div>

        {/* Footer link */}
        <div className="pt-12 mt-12">
          <p className="text-sm text-muted-foreground">
            Vous êtes propriétaire ou gestionnaire de biens ?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary font-medium hover:underline transition-all duration-200"
            >
              Accéder au tableau de bord
            </button>
          </p>
        </div>
      </div>

      {/* Minimal footer */}
      <footer className="relative z-10 mt-auto pt-12 pb-6 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Waves className="w-4 h-4 text-primary" />
          <span className="font-medium text-primary">Clés d'Azur</span>
          <span>© 2024</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
