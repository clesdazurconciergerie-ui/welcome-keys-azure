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

const Landing = () => {
  return (
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
  );
};

export default Landing;