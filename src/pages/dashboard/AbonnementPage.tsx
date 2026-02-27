import SubscriptionSection from "@/components/dashboard/SubscriptionSection";
import { motion } from "framer-motion";

const AbonnementPage = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Abonnement</h1>
        <p className="text-muted-foreground mt-1">Gérez votre plan et facturation</p>
      </motion.div>
      <SubscriptionSection />
    </div>
  );
};

export default AbonnementPage;
