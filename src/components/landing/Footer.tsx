import BrandMark from "@/components/BrandMark";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: "Sécurité", href: "#security" },
    { label: "Tarifs", href: "#pricing" },
    { label: "Mentions légales", href: "#" },
    { label: "Contact", href: "#" },
  ];

  const scrollToSection = (id: string) => {
    if (id.startsWith("#")) {
      const element = document.getElementById(id.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="border-t border-border bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <BrandMark variant="compact" />

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link, index) => (
              <button
                key={index}
                onClick={() => scrollToSection(link.href)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-2 py-1"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {currentYear} Wlekom by Clés d'Azur — Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
