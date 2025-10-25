import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import AnnouncementBar from "@/components/landing/AnnouncementBar";
import TrustLogos from "@/components/landing/TrustLogos";
import Features from "@/components/landing/Features";
import Process from "@/components/landing/Process";
import Security from "@/components/landing/Security";
import Examples from "@/components/landing/Examples";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <AnnouncementBar />
      <TrustLogos />
      <Features />
      <Process />
      <Security />
      <Examples />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Landing;
