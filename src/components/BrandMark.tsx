import { cn } from "@/lib/utils";

interface BrandMarkProps {
  variant?: "full" | "compact" | "icon-only";
  className?: string;
  showIcon?: boolean;
  light?: boolean;
}

const BrandMark = ({ variant = "full", className, showIcon = true, light = false }: BrandMarkProps) => {
  const textColor = light ? "text-white" : "text-primary";
  const subColor = light ? "text-white/60" : "text-muted-foreground";

  if (variant === "icon-only") {
    return (
      <img 
        src="/brand/logo-wlekom-icon.png" 
        alt="MyWelkom" 
        className={cn("w-8 h-8", className)}
      />
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        {showIcon && (
          <img 
            src="/brand/logo-wlekom-icon.png" 
            alt="MyWelkom" 
            className="w-7 h-7 sm:w-8 sm:h-8" 
          />
        )}
        <div className="flex flex-col">
          <span className={cn("font-display font-bold text-base sm:text-lg leading-tight tracking-tight", textColor)}>
            Welkom
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
          alt="MyWelkom" 
          className="w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6" 
        />
      )}
      <h1 className={cn("font-display font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight", textColor)}>
        Welkom
      </h1>
    </div>
  );
};

export default BrandMark;
