import { Link } from "react-router-dom";

interface FreeTrialWatermarkProps {
  userRole?: string;
}

const FreeTrialWatermark = ({ userRole }: FreeTrialWatermarkProps) => {
  if (userRole !== 'free_trial' && userRole !== 'demo_user') return null;

  const message = userRole === 'demo_user' 
    ? "Démo gratuite" 
    : "Version d'essai";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary/90 to-primary/80 text-primary-foreground py-2 px-4 text-center text-sm shadow-lg z-50">
      <p className="inline-flex items-center gap-2">
        <span>{message} — Créée avec</span>
        <Link 
          to="/" 
          className="font-semibold hover:underline inline-flex items-center gap-1"
        >
          Welkom
        </Link>
      </p>
    </div>
  );
};

export default FreeTrialWatermark;
