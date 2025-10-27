import { cn } from "@/lib/utils";

interface BrandMarkProps {
  variant?: "full" | "compact" | "icon-only";
  className?: string;
  showIcon?: boolean;
}

const BrandMark = ({ variant = "full", className, showIcon = true }: BrandMarkProps) => {
  if (variant === "icon-only") {
    return (
      <img 
        src="/brand/logo-wlekom-icon.png" 
        alt="Welcom" 
        className={cn("w-8 h-8", className)}
      />
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showIcon && (
          <img 
            src="/brand/logo-wlekom-icon.png" 
            alt="Welcom" 
            className="w-7 h-7 sm:w-8 sm:h-8" 
          />
        )}
        <div className="flex flex-col">
          <span className="font-display font-semibold text-base sm:text-lg leading-tight text-[#071552]">
            Welcom
          </span>
          <span className="text-[10px] sm:text-xs text-[#6C6C6C] tracking-wide leading-tight">
            by Clés d'Azur
          </span>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {showIcon && (
        <img 
          src="/brand/logo-wlekom.png" 
          alt="Welcom" 
          className="w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6" 
        />
      )}
      <h1 className="font-display font-semibold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight text-[#071552]">
        Welcom
      </h1>
      <p className="text-xs sm:text-sm md:text-base text-[#6C6C6C] mt-1 sm:mt-2 tracking-wide">
        by Clés d'Azur
      </p>
    </div>
  );
};

export default BrandMark;
