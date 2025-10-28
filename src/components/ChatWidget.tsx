import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string, retryCount = 0) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(
        'https://otxnzjkyzkpoymeypmef.supabase.co/functions/v1/chat-ask',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pin, message: messageText, locale }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if ([429, 500, 502, 503, 504].includes(response.status) && retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 800 * (retryCount + 1)));
          return sendMessage(messageText, retryCount + 1);
        }
        throw new Error(`HTTP ${response.status}`);
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

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Erreur chatbot:', error);
      
      let errorMessage = "Désolé, je rencontre un problème technique. Veuillez réessayer dans quelques instants.";
      
      if (error.name === 'AbortError') {
        errorMessage = "La requête a pris trop de temps. Réessayez dans un instant.";
      } else if (error.message.includes('NetworkError') || error.message === 'Failed to fetch') {
        errorMessage = "Vérifiez votre connexion internet.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const widgetContent = (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-lg transition-all duration-250 md:bottom-6 md:right-6 text-white"
          size="icon"
          style={{ 
            zIndex: 9998, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: 'var(--theme-accent, #071552)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          aria-label="Ouvrir le chat"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card 
          className="fixed bottom-20 right-5 w-[calc(100vw-40px)] md:w-[380px] h-[600px] max-h-[70vh] shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300"
          style={{ zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          role="dialog"
          aria-labelledby="chat-header"
          aria-modal="true"
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 border-b rounded-t-lg text-white"
            style={{ backgroundColor: 'var(--theme-accent, #071552)' }}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 id="chat-header" className="font-semibold">Assistance · Clés d'Azur</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              aria-label="Fermer le chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div role="log" aria-live="polite" aria-atomic="false">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    Bonjour 👋
                    <br /><br />
                    Je suis là pour vous accompagner pendant votre séjour. 
                    <br /><br />
                    Posez-moi n'importe quelle question sur le logement - même si elle est vague ou incomplète. Je chercherai dans tout le livret pour vous donner la meilleure réponse possible.
                    <br /><br />
                    💬 Quelques suggestions pour commencer :
                  </p>
                  <div className="grid gap-2">
                   {quickActions.map((action, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.prompt)}
                        className="text-left justify-start h-auto py-2 px-3 whitespace-normal"
                        style={{ 
                          borderColor: 'color-mix(in srgb, var(--theme-accent, #071552) 25%, transparent)',
                          color: 'var(--theme-accent, #071552)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-accent, #071552) 10%, transparent)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
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
                        className="max-w-[80%] rounded-lg px-3.5 py-2.5"
                        style={{ 
                          wordWrap: 'break-word',
                          backgroundColor: msg.role === 'user' ? 'var(--theme-accent, #071552)' : '#F8F8F8',
                          color: msg.role === 'user' ? '#ffffff' : '#1A1A1A'
                        }}
                      >
                        <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
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
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
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
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écrivez votre message..."
                disabled={isLoading}
                className="flex-1"
                aria-label="Message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="text-white"
                style={{ backgroundColor: 'var(--theme-accent, #071552)' }}
                onMouseEnter={(e) => {
                  if (!isLoading && input.trim()) {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-accent, #071552) 85%, black)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-accent, #071552)';
                }}
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );

  // Utiliser un portal pour éviter les problèmes de z-index
  return typeof document !== 'undefined' 
    ? createPortal(widgetContent, document.body)
    : null;
}
