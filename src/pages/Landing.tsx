import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import TrustLogos from "@/components/landing/TrustLogos";
import SatisfiedGuests from "@/components/landing/SatisfiedGuests";
import SaveTime from "@/components/landing/SaveTime";
import Metrics from "@/components/landing/Metrics";
import Customization from "@/components/landing/Customization";
import Process from "@/components/landing/Process";
import ConcreteResults from "@/components/landing/ConcreteResults";
import ForEveryone from "@/components/landing/ForEveryone";
import Personas from "@/components/landing/Personas";
import Testimonials from "@/components/landing/Testimonials";
import Regions from "@/components/landing/Regions";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
const Landing = () => {
  return <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <TrustLogos />
      <SatisfiedGuests />
      <SaveTime />
      <Metrics />
      <Customization />
      <Process />
      <ConcreteResults />
      
      
      <Testimonials />
      <Regions />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>;
};
export default Landing;