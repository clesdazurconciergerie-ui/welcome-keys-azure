import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[DashboardErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Une erreur est survenue</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message || "Erreur inattendue"}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
              Réessayer
            </Button>
            <Button onClick={() => window.location.href = "/dashboard/finance"}>
              Retour à Finance
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
