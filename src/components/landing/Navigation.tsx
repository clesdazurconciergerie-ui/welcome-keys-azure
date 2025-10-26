import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "@/components/BrandMark";

const Navigation = () => {
  const location = useLocation();
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
    // If not on home page, navigate to home first
    if (location.pathname !== "/") {
      window.location.href = `/#${id}`;
      setIsMobileMenuOpen(false);
      return;
    }
    
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { label: "Accueil", href: "/", isRoute: true },
    { label: "Fonctionnalités", id: "features" },
    { label: "Tarifs", href: "/tarifs", isRoute: true },
    { label: "Accéder à un livret", href: "/acces-livret", isRoute: true },
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
          <Link
            to="/"
            onClick={scrollToTop}
            className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
          >
            <BrandMark variant="compact" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              if (link.isRoute && link.href) {
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-3 py-2 border-b-2 ${
                      isActive(link.href)
                        ? "text-[#18c0df] border-[#18c0df]"
                        : "text-[#0F172A] border-transparent hover:text-[#18c0df]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id!)}
                  className="text-sm font-medium text-[#0F172A] hover:text-[#18c0df] transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-3 py-2"
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth">
              <Button
                variant="outline"
                className="border-2 border-[#E6EDF2] text-[#0F172A] hover:border-[#18c0df] hover:text-[#18c0df] rounded-xl px-6 transition-all"
              >
                Connexion
              </Button>
            </Link>
            <Link to="/auth?mode=demo">
              <Button className="bg-[#18c0df] hover:bg-[#1199c7] text-white rounded-xl px-6 shadow-md hover:shadow-lg transition-all">
                Essayer gratuitement
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
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
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                if (link.isRoute && link.href) {
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block w-full text-left py-3 px-3 text-sm font-medium transition-colors rounded-md ${
                        isActive(link.href)
                          ? "text-[#18c0df] bg-[#F7FAFC] border-l-2 border-[#18c0df]"
                          : "text-[#0F172A] hover:bg-[#F7FAFC] hover:text-[#18c0df]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id!)}
                    className="block w-full text-left py-3 px-3 text-sm font-medium text-[#0F172A] hover:bg-[#F7FAFC] hover:text-[#18c0df] transition-colors rounded-md"
                  >
                    {link.label}
                  </button>
                );
              })}
              <div className="h-px bg-[#E6EDF2] my-2" />
              <Link
                to="/auth"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full"
              >
                <Button
                  variant="outline"
                  className="w-full border-2 border-[#E6EDF2] text-[#0F172A] hover:border-[#18c0df] rounded-xl justify-center"
                >
                  Connexion
                </Button>
              </Link>
              <Link
                to="/auth?mode=demo"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full"
              >
                <Button className="w-full bg-[#18c0df] hover:bg-[#1199c7] text-white rounded-xl justify-center">
                  Essayer gratuitement
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;
