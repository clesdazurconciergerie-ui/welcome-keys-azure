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
        "relative w-[280px] h-[560px] bg-slate-900 rounded-[42px] p-3 shadow-2xl",
        variant === "back" && "opacity-90",
        className
      )}
      aria-hidden={variant === "back"}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-3xl z-10" />
      
      {/* Screen */}
      <div className="relative w-full h-full bg-white rounded-[32px] overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={variant === "front" ? "Aperçu du livret d'accueil sur mobile" : ""}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-[#071552] rounded-2xl flex items-center justify-center">
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
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-800 rounded-full" />
    </div>
  );
};

export default PhoneMockup;
