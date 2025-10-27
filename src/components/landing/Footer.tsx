import BrandMark from "@/components/BrandMark";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarifs", href: "/tarifs" },
    { label: "Aide", href: "#faq" },
    { label: "Mentions légales", href: "#legal" },
    { label: "CGV/CGU", href: "#terms" },
    { label: "Confidentialité", href: "#privacy" },
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
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          {/* Logo */}
          <BrandMark variant="compact" />

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.href}
                onClick={(e) => {
                  if (link.href.startsWith('#')) {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }
                }}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 rounded-md px-2 py-1"
                style={{
                  '--focus-ring-color': '#071552'
                } as React.CSSProperties}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-sm text-slate-500">
            © {currentYear} Wlekom by Clés d'Azur · Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
