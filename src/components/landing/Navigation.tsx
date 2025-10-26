import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
      setIsAuthLoading(false);
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

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
                        ? "text-primary border-primary"
                        : "text-foreground border-transparent hover:text-primary"
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
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-3 py-2"
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthLoading ? (
              <div className="h-10 w-32 bg-muted animate-pulse rounded-xl" />
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 rounded-xl px-4 gap-2"
                    aria-label="Menu utilisateur"
                  >
                    <User className="h-4 w-4" />
                    <span className="max-w-[150px] truncate">{userEmail}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Tableau de bord
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth">
                  <Button
                    variant="outline"
                    className="border-2 hover:bg-primary hover:text-primary-foreground rounded-xl px-6 transition-all"
                    aria-label="Se connecter"
                  >
                    Connexion
                  </Button>
                </Link>
                <Link to="/auth?mode=demo">
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 shadow-md hover:shadow-lg transition-all"
                    aria-label="Essayer gratuitement"
                  >
                    Essayer gratuitement
                  </Button>
                </Link>
              </>
            )}
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
                          ? "text-primary bg-secondary border-l-2 border-primary"
                          : "text-foreground hover:bg-secondary hover:text-primary"
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
                    className="block w-full text-left py-3 px-3 text-sm font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors rounded-md"
                  >
                    {link.label}
                  </button>
                );
              })}
              <div className="h-px bg-border my-2" />
              {isAuthLoading ? (
                <div className="w-full h-10 bg-muted animate-pulse rounded-xl" />
              ) : isAuthenticated ? (
                <>
                  {userEmail && (
                    <div className="px-3 py-2 text-sm text-muted-foreground truncate">
                      <User className="inline-block mr-2 h-4 w-4" />
                      {userEmail}
                    </div>
                  )}
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl justify-center"
                      aria-label="Accéder au tableau de bord"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Tableau de bord
                    </Button>
                  </Link>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl justify-center"
                    aria-label="Se déconnecter"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full border-2 hover:bg-primary hover:text-primary-foreground rounded-xl justify-center"
                      aria-label="Se connecter"
                    >
                      Connexion
                    </Button>
                  </Link>
                  <Link
                    to="/auth?mode=demo"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full"
                  >
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl justify-center"
                      aria-label="Essayer gratuitement"
                    >
                      Essayer gratuitement
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;
