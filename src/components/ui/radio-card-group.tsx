import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface RadioCardOption {
  value: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

interface RadioCardGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioCardOption[];
  className?: string;
  columns?: 1 | 2;
}

export function RadioCardGroup({
  value,
  onValueChange,
  options,
  className,
  columns = 2,
}: RadioCardGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-3",
        columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "hover:shadow-sm",
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-background hover:border-primary/30"
            )}
          >
            {/* Selection indicator */}
            <div
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              )}
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {option.icon && (
                  <span className="text-muted-foreground">{option.icon}</span>
                )}
                <span className="font-medium text-sm text-foreground">
                  {option.title}
                </span>
              </div>
              {option.subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {option.subtitle}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
