import { Card, CardContent } from "@/components/ui/card";
import { LifeBuoy, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function SPSupportPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Support</h1>
        <p className="text-muted-foreground mt-1">Besoin d'aide ? Contactez votre conciergerie</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Par email</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Contactez votre conciergerie directement par email pour toute question ou problème.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Phone className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold">Par téléphone</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  En cas d'urgence, appelez directement votre responsable de conciergerie.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-black/20 bg-black/[0.03]">
        <CardContent className="pt-6 text-center">
          <LifeBuoy className="w-10 h-10 mx-auto text-black mb-3" />
          <h3 className="font-semibold text-lg">Centre d'aide</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Consultez les guides et FAQ pour répondre à vos questions courantes sur l'utilisation de la plateforme.
          </p>
          <p className="text-sm text-black font-medium mt-3">🚧 Bientôt disponible</p>
        </CardContent>
      </Card>
    </div>
  );
}
