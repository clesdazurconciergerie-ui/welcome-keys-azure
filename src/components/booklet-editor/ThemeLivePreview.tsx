import { Theme } from "@/types/theme";
import { Card } from "@/components/ui/card";
import { Home, MapPin, Wifi, Star } from "lucide-react";

interface ThemeLivePreviewProps {
  theme: Theme;
}

export default function ThemeLivePreview({ theme }: ThemeLivePreviewProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-[#0F172A]">Aperçu en temps réel</h3>
      
      <Card 
        className="p-6 rounded-xl border-2 transition-all overflow-hidden"
        style={{
          backgroundColor: theme.bgHex,
          borderColor: theme.primaryHex + '20',
        }}
      >
        {/* Hero section miniature */}
        <div 
          className="p-4 rounded-lg mb-4 -mx-2"
          style={{ 
            backgroundColor: theme.primaryHex,
            color: '#ffffff'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-5 w-5" />
            <h2 className="text-lg font-bold" style={{ fontFamily: theme.fontFamily }}>
              Votre Propriété
            </h2>
          </div>
          <p className="text-sm opacity-90" style={{ fontSize: theme.baseFontSize === 'sm' ? '13px' : theme.baseFontSize === 'lg' ? '15px' : theme.baseFontSize === 'xl' ? '17px' : '14px' }}>
            Bienvenue dans votre livret d'accueil
          </p>
        </div>

        {/* Content preview */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: theme.primaryHex + '15',
                color: theme.primaryHex 
              }}
            >
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 
                className="font-semibold mb-1" 
                style={{ 
                  color: theme.textHex,
                  fontFamily: theme.fontFamily,
                  fontSize: theme.baseFontSize === 'sm' ? '14px' : theme.baseFontSize === 'lg' ? '16px' : theme.baseFontSize === 'xl' ? '18px' : '15px'
                }}
              >
                Adresse
              </h3>
              <p 
                className="text-sm"
                style={{ 
                  color: theme.mutedHex,
                  fontSize: theme.baseFontSize === 'sm' ? '12px' : theme.baseFontSize === 'lg' ? '14px' : theme.baseFontSize === 'xl' ? '16px' : '13px'
                }}
              >
                123 Rue de la Plage, Nice
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: theme.accentHex ? theme.accentHex + '15' : theme.primaryHex + '15',
                color: theme.accentHex || theme.primaryHex
              }}
            >
              <Wifi className="h-4 w-4" />
            </div>
            <div>
              <h3 
                className="font-semibold mb-1"
                style={{ 
                  color: theme.textHex,
                  fontFamily: theme.fontFamily,
                  fontSize: theme.baseFontSize === 'sm' ? '14px' : theme.baseFontSize === 'lg' ? '16px' : theme.baseFontSize === 'xl' ? '18px' : '15px'
                }}
              >
                WiFi
              </h3>
              <p 
                className="text-sm"
                style={{ 
                  color: theme.mutedHex,
                  fontSize: theme.baseFontSize === 'sm' ? '12px' : theme.baseFontSize === 'lg' ? '14px' : theme.baseFontSize === 'xl' ? '16px' : '13px'
                }}
              >
                Réseau: MonReseau
              </p>
            </div>
          </div>

          {/* Button preview */}
          <button
            className="w-full py-2.5 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 mt-2"
            style={{
              backgroundColor: theme.primaryHex,
              color: '#ffffff',
              fontFamily: theme.fontFamily
            }}
          >
            Voir le plan d'accès
          </button>

          {/* Rating preview */}
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star 
                key={i} 
                className="h-4 w-4" 
                fill={theme.accentHex || theme.primaryHex}
                style={{ color: theme.accentHex || theme.primaryHex }}
              />
            ))}
            <span 
              className="text-sm ml-1"
              style={{ 
                color: theme.mutedHex,
                fontFamily: theme.fontFamily
              }}
            >
              4.9 / 5
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
