import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import TrustLogos from "@/components/landing/TrustLogos";
import Features from "@/components/landing/Features";
import Process from "@/components/landing/Process";
import Security from "@/components/landing/Security";
import Examples from "@/components/landing/Examples";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <TrustLogos />
      <Features />
      <Process />
      <Security />
      <Examples />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Landing;
