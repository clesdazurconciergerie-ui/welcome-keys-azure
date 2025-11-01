import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  imageUrl?: string;
  variant?: "front" | "back";
  className?: string;
}

const PhoneMockup = ({ imageUrl, variant = "front", className }: PhoneMockupProps) => {
  return (
    <div 
      className={cn(
        "relative w-[280px] h-[560px] rounded-[42px] p-3 transition-all duration-300",
        variant === "back" && "opacity-90 scale-90",
        className
      )}
      style={{
        backgroundColor: '#071552',
        boxShadow: variant === "front" 
          ? '0 20px 40px rgba(7, 21, 82, 0.25), 0 10px 20px rgba(0, 0, 0, 0.1)' 
          : '0 15px 30px rgba(7, 21, 82, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08)'
      }}
      aria-hidden={variant === "back"}
    >
      {/* Notch */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 rounded-b-3xl z-10"
        style={{ backgroundColor: '#071552' }}
      />
      
      {/* Screen */}
      <div className="relative w-full h-full bg-white rounded-[32px] overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={variant === "front" ? "Aperçu du livret d'accueil numérique MyWelkom sur smartphone - Interface mobile responsive pour locations saisonnières" : "Livret d'accueil digital sur mobile"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-white flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div 
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#071552' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">Livret d'accueil digital</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Home indicator */}
      <div 
        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full"
        style={{ backgroundColor: '#071552', opacity: 0.5 }}
      />
    </div>
  );
};

export default PhoneMockup;
