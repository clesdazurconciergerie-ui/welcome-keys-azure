import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import ProblemSolution from "@/components/landing/ProblemSolution";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import DemoSection from "@/components/landing/DemoSection";
import PricingTeaser from "@/components/landing/PricingTeaser";
import Testimonials from "@/components/landing/Testimonials";
import CredibilitySection from "@/components/landing/CredibilitySection";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

const Landing = () => {
  return (
    <>
      <SEOHead 
        title="MyWelkom by Azur Keys - Plateforme Digitale Premium pour Conciergeries"
        description="La plateforme digitale pensée pour les conciergeries orientées performance. CRM, livret d'accueil digital, espace propriétaire, dashboard analytics. Développé par Azur Keys Conciergerie."
        keywords="plateforme conciergerie, logiciel conciergerie, gestion conciergerie, livret d'accueil digital, espace propriétaire, CRM conciergerie, MyWelkom, Azur Keys, dashboard performance, conciergerie premium"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <Hero />
        <SocialProof />
        <ProblemSolution />
        <FeaturesGrid />
        <HowItWorks />
        <DemoSection />
        <PricingTeaser />
        <Testimonials />
        <CredibilitySection />
        <FAQ />
        <Footer />
      </div>
    </>
  );
};

export default Landing;
