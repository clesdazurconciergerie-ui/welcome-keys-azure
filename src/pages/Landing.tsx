import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import ProblemSolution from "@/components/landing/ProblemSolution";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import DemoSection from "@/components/landing/DemoSection";
import PricingTeaser from "@/components/landing/PricingTeaser";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

const Landing = () => {
  return (
    <>
      <SEOHead 
        title="MyWelkom - Livret d'Accueil Digital pour Conciergerie et Location Saisonnière"
        description="Créez facilement un livret d'accueil numérique interactif pour vos locations saisonnières. Solution professionnelle de conciergerie digitale avec chatbot IA, QR code et gestion centralisée. Parfait pour Airbnb, gîtes et résidences de tourisme."
        keywords="livret d'accueil digital, livret de bienvenue numérique, conciergerie digitale, logiciel conciergerie, guest book digital, livret numérique location saisonnière, MyWelkom, Welkom, livret interactif Airbnb, outil conciergerie automatisé"
      />
      <div className="min-h-screen bg-white">
        <Navigation />
        <Hero />
        <SocialProof />
        <ProblemSolution />
        <FeaturesGrid />
        <HowItWorks />
        <DemoSection />
        <PricingTeaser />
        <Testimonials />
        <FAQ />
        <Footer />
      </div>
    </>
  );
};

export default Landing;