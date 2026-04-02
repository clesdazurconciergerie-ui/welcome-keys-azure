import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TranscriptEntry {
  speaker: "user" | "prospect";
  text: string;
  timestamp: string;
}

export interface CallPrompterSettings {
  services_offered: string;
  commission_rate: string;
  geographic_area: string;
  selling_points: string;
  target_client: string;
  tone: string;
  company_name: string;
}

export interface CallSession {
  id: string;
  status: string;
  transcript_json: TranscriptEntry[];
  analysis_json: any;
  duration_seconds: number | null;
  created_at: string;
  ended_at: string | null;
  prospect_id: string | null;
}

export interface CallAnalysis {
  summary: string;
  key_moments: string[];
  objections: string[];
  interest_level: string;
  conversion_probability: number;
  strengths: string[];
  improvements: string[];
  better_responses: { original: string; suggested: string }[];
}

const DEFAULT_SETTINGS: CallPrompterSettings = {
  services_offered: "Gestion locative saisonnière complète",
  commission_rate: "20%",
  geographic_area: "Côte d'Azur",
  selling_points: "Revenus optimisés, gestion complète, transparence totale",
  target_client: "Propriétaires de biens saisonniers",
  tone: "premium",
  company_name: "MyWelkom Conciergerie",
};

export function useCallPrompter() {
  const [settings, setSettings] = useState<CallPrompterSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [callStatus, setCallStatus] = useState<"idle" | "calibrating" | "listening" | "processing">("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const recognitionRef = useRef<any>(null);
  const isUserRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase as any)
      .from("call_prompter_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setSettings({
        services_offered: data.services_offered || DEFAULT_SETTINGS.services_offered,
        commission_rate: data.commission_rate || DEFAULT_SETTINGS.commission_rate,
        geographic_area: data.geographic_area || DEFAULT_SETTINGS.geographic_area,
        selling_points: data.selling_points || DEFAULT_SETTINGS.selling_points,
        target_client: data.target_client || DEFAULT_SETTINGS.target_client,
        tone: data.tone || DEFAULT_SETTINGS.tone,
        company_name: data.company_name || DEFAULT_SETTINGS.company_name,
      });
    }
    setLoading(false);
  }, []);

  // Save settings
  const saveSettings = async (newSettings: CallPrompterSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any)
      .from("call_prompter_settings")
      .upsert({ ...newSettings, user_id: user.id }, { onConflict: "user_id" });
    setSettings(newSettings);
    toast.success("Paramètres sauvegardés");
  };

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("call_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setSessions(data || []);
  }, []);

  useEffect(() => { fetchSettings(); fetchSessions(); }, [fetchSettings, fetchSessions]);

  // Get AI suggestion
  const getSuggestion = useCallback(async (prospectSpeech: string, history: TranscriptEntry[]) => {
    setCallStatus("processing");
    try {
      const { data, error } = await supabase.functions.invoke("call-prompter-suggest", {
        body: { prospect_speech: prospectSpeech, conversation_history: history, settings },
      });
      if (error) throw error;
      setSuggestion(data.suggestion || "");
    } catch (e: any) {
      console.error("Suggestion error:", e);
      toast.error("Erreur IA");
    }
    setCallStatus("listening");
  }, [settings]);

  // Start call
  const startCall = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("La reconnaissance vocale n'est pas supportée par ce navigateur. Utilisez Chrome.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Non connecté"); return; }

    // Create session
    const { data: session, error } = await (supabase as any)
      .from("call_sessions")
      .insert({ user_id: user.id, status: "active" })
      .select()
      .single();
    if (error) { toast.error("Erreur création session"); return; }

    sessionIdRef.current = session.id;
    setCurrentSession(session);
    setTranscript([]);
    setSuggestion("");
    setAnalysis(null);
    startTimeRef.current = new Date();

    // Calibration phase
    setCallStatus("calibrating");
    toast.info("Parlez quelques secondes pour calibrer votre voix...");

    setTimeout(() => {
      setCallStatus("listening");
      isUserRef.current = false;

      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (!text) return;

          // Simple heuristic: alternate speaker detection
          const speaker = isUserRef.current ? "user" : "prospect";
          isUserRef.current = !isUserRef.current;

          const entry: TranscriptEntry = { speaker, text, timestamp: new Date().toISOString() };
          setTranscript(prev => {
            const updated = [...prev, entry];
            // If prospect spoke, get suggestion
            if (speaker === "prospect") {
              getSuggestion(text, updated);
            }
            return updated;
          });
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          console.error("Speech error:", event.error);
        }
      };

      recognition.onend = () => {
        // Restart if still in call
        if (sessionIdRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      toast.success("Écoute active — Commencez l'appel");
    }, 3000);
  }, [getSuggestion]);

  // End call
  const endCall = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const duration = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current.getTime()) / 1000)
      : 0;

    setCallStatus("idle");

    if (sessionIdRef.current) {
      await (supabase as any)
        .from("call_sessions")
        .update({
          status: "completed",
          transcript_json: transcript,
          duration_seconds: duration,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionIdRef.current);

      // Generate analysis
      if (transcript.length > 0) {
        setIsAnalyzing(true);
        try {
          const { data, error } = await supabase.functions.invoke("call-prompter-analyze", {
            body: { transcript, settings },
          });
          if (!error && data?.analysis) {
            setAnalysis(data.analysis);
            await (supabase as any)
              .from("call_sessions")
              .update({ analysis_json: data.analysis })
              .eq("id", sessionIdRef.current);
          }
        } catch (e) {
          console.error("Analysis error:", e);
        }
        setIsAnalyzing(false);
      }

      sessionIdRef.current = null;
      fetchSessions();
    }

    toast.success("Appel terminé");
  }, [transcript, settings, fetchSessions]);

  // Regenerate suggestion
  const regenerateSuggestion = useCallback(() => {
    const lastProspect = [...transcript].reverse().find(t => t.speaker === "prospect");
    if (lastProspect) {
      getSuggestion(lastProspect.text, transcript);
    }
  }, [transcript, getSuggestion]);

  return {
    settings, saveSettings,
    sessions, currentSession,
    transcript, suggestion, callStatus,
    isAnalyzing, analysis,
    loading,
    startCall, endCall, regenerateSuggestion,
    fetchSessions,
  };
}
