import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Navigation = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: "Fonctionnalités", id: "features" },
    { label: "Comment ça marche", id: "process" },
    { label: "Sécurité", id: "security" },
    { label: "Exemples", id: "examples" },
    { label: "FAQ", id: "faq" },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-[#ECEEF3]"
          : "bg-white border-b border-[#ECEEF3]"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 font-display font-semibold text-lg text-primary hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
          >
            <img src="/favicon.png" alt="Wlekom" className="w-8 h-8" />
            <span className="hidden sm:inline">Wlekom</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-2 py-1"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate("/auth")}
              className="text-sm text-primary hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-2 py-1"
            >
              Tableau de bord
            </button>
            <Button
              onClick={() => navigate("/acces-livret")}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-primary"
            >
              Accéder à un livret
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-[#ECEEF3] overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="block w-full text-left py-2 text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 space-y-2">
                <Button
                  onClick={() => {
                    navigate("/acces-livret");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
                >
                  Accéder à un livret
                </Button>
                <button
                  onClick={() => {
                    navigate("/auth");
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-center py-2 text-sm text-primary hover:underline font-medium"
                >
                  Tableau de bord
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;
