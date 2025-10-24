import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Waves, ArrowLeft, KeyRound } from "lucide-react";
import { z } from "zod";

const codeSchema = z.string()
  .trim()
  .min(1, { message: "Veuillez entrer un code." })
  .max(20, { message: "Code invalide." })
  .regex(/^[A-Z0-9]+$/, { message: "Le code doit contenir uniquement des lettres majuscules et des chiffres." });

export default function AccessBooklet() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    try {
      const validatedCode = codeSchema.parse(code.toUpperCase());
      setLoading(true);
      
      // Redirect to view page - it will handle validation
      navigate(`/view/${validatedCode}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Une erreur est survenue");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Waves className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-3">Clés d'Azur</h1>
          <p className="text-muted-foreground text-lg">
            Votre bien, notre expertise.
          </p>
        </div>

        <Card className="glass shadow-premium border-0">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Entrez votre code d'accès</CardTitle>
            <CardDescription className="text-base">
              Saisissez le code fourni par votre hôte pour accéder à votre livret d'accueil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Ex : 4H9T7K"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-semibold tracking-wider h-14"
                  maxLength={20}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Le code est sensible à la casse
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base"
                disabled={loading || !code}
              >
                {loading ? "Vérification..." : "Ouvrir mon livret"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Vous êtes propriétaire ?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline font-medium"
            >
              Accéder au dashboard
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
