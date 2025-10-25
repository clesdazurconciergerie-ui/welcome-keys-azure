import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  pin: string;
  locale?: string;
}

const quickActions = [
  { label: "Heures d'arrivée et départ", prompt: "Quelles sont les heures d'arrivée et de départ ?" },
  { label: "Mot de passe Wi-Fi", prompt: "Comment obtenir le mot de passe Wi-Fi ?" },
  { label: "Où jeter les poubelles ?", prompt: "Où se trouvent les poubelles et comment trier ?" },
  { label: "Restaurants proches (général)", prompt: "Quels sont les restaurants à proximité ?" },
  { label: "Transports (général)", prompt: "Quels sont les transports publics disponibles ?" },
  { label: "Urgences", prompt: "Où se trouve la pharmacie de garde et les numéros d'urgence ?" },
];

export default function ChatWidget({ pin, locale = 'fr' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/chat-ask',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pin, message: messageText, locale }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur réseau');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.answer 
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Erreur chatbot:', error);
      toast({
        title: "Erreur",
        description: "Service momentanément indisponible. Réessayez plus tard.",
        variant: "destructive",
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Désolé, je rencontre un problème technique. Veuillez réessayer dans quelques instants."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 left-5 h-14 w-14 rounded-full shadow-lg z-[1000] bg-[#18C0DF] hover:bg-[#18C0DF] hover:scale-105 transition-all duration-250 md:bottom-6 md:left-6"
          size="icon"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-20 left-2.5 w-[calc(100vw-20px)] md:w-[380px] md:left-5 h-[600px] max-h-[70vh] shadow-2xl z-[1001] flex flex-col animate-chatbot-slide-up"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-[#18C0DF] text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Assistant virtuel</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Je m'appuie sur le livret. Si l'info n'y est pas, je peux donner des indications générales (pas de détails sensibles). Choisissez une question ou posez la vôtre :
                </p>
                <div className="grid gap-2">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action.prompt)}
                      className="text-left justify-start h-auto py-2 px-3 whitespace-normal"
                      disabled={isLoading}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-[#18C0DF] text-white'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );
}
