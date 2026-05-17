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
import FinalCTA from "@/components/landing/FinalCTA";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";
import EntryModal from "@/components/landing/EntryModal";

const Landing = () => {
  return (
    <>
      <EntryModal />
      <SEOHead
        title="Welkom — Plateforme de gestion pour conciergeries"
        description="Welkom — Plateforme de gestion pour conciergeries. CRM, livret d'accueil digital, espace propriétaire, dashboard analytics."
        keywords="plateforme conciergerie, logiciel conciergerie, gestion conciergerie, livret d'accueil digital, espace propriétaire, CRM conciergerie, Welkom, dashboard performance"
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
        <FinalCTA />
        <FAQ />
        <Footer />
      </div>
    </>
  );
};

export default Landing;
