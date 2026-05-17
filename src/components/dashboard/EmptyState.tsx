import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" strokeWidth={1.8} />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant === "secondary" ? "outline" : "default"}
          className={
            action.variant === "secondary"
              ? "rounded-lg"
              : "rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          }
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
