import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface ChatbotSectionProps {
  bookletId?: string;
}

export default function ChatbotSection({ bookletId }: ChatbotSectionProps) {
  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Chatbot & FAQ</h2>
          <p className="text-sm text-[#64748B]">
            Questions fréquentes et assistant conversationnel
          </p>
        </div>
        <Badge variant="secondary">À venir</Badge>
      </div>

      <div className="text-center py-12 border-2 border-dashed border-[#E6EDF2] rounded-xl">
        <MessageSquare className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
        <p className="text-[#64748B] mb-4">
          Le chatbot et la FAQ seront bientôt disponibles
        </p>
        <p className="text-sm text-[#64748B]">
          Vos invités pourront poser des questions et obtenir des réponses instantanées
        </p>
      </div>
    </section>
  );
}
