import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
}

const SEOHead = ({
  title = "MyWelkom - Livret d'Accueil Digital pour Conciergerie et Location Saisonnière",
  description = "Créez facilement un livret d'accueil numérique interactif pour vos locations saisonnières. Logiciel de conciergerie tout-en-un avec chatbot IA, QR code et gestion centralisée.",
  keywords = "livret d'accueil digital, livret de bienvenue numérique, conciergerie digitale, logiciel conciergerie, MyWelkom",
  canonicalUrl,
  ogImage = "https://storage.googleapis.com/gpt-engineer-file-uploads/uosWehRoi8X4kzE0b6KxmynEuFj2/social-images/social-1761358045619-Untitled design (1).png"
}: SEOHeadProps) => {
  const location = useLocation();
  const baseUrl = "https://mywelkom.fr";
  const fullUrl = canonicalUrl || `${baseUrl}${location.pathname}`;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Update basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Update Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:url', fullUrl, true);
    updateMetaTag('og:image', ogImage, true);

    // Update Twitter tags
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = fullUrl;
  }, [title, description, keywords, fullUrl, ogImage]);

  return null;
};

export default SEOHead;