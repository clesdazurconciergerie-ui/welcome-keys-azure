import BrandMark from "@/components/BrandMark";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarifs", href: "/tarifs" },
    { label: "FAQ", href: "#faq" },
    { label: "Mentions légales", href: "#legal" },
    { label: "CGV/CGU", href: "#terms" },
    { label: "Confidentialité", href: "#privacy" },
  ];

  const scrollToSection = (id: string) => {
    if (id.startsWith("#")) {
      const element = document.getElementById(id.substring(1));
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground py-12">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <BrandMark variant="compact" light />
          
          <div className="flex items-center gap-4">
            <img src="/brand/logo-azur-keys.png" alt="Azur Keys" className="w-8 h-8 brightness-0 invert opacity-60" />
            <span className="text-sm text-primary-foreground/60">Une technologie Azur Keys Conciergerie</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              onClick={(e) => {
                if (link.href.startsWith('#')) { e.preventDefault(); scrollToSection(link.href); }
              }}
              className="text-sm text-primary-foreground/60 hover:text-gold transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs text-primary-foreground/40">
            © {currentYear} MyWelkom by Azur Keys · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
