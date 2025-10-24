import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import BookletWizard from "@/components/BookletWizard";

export default function BookletWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vous devez être connecté pour accéder au wizard");
      navigate("/auth");
      return;
    }
    setCheckingAuth(false);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return <BookletWizard bookletId={id} />;
}
