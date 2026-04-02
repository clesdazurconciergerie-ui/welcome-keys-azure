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

export type MicStatus = "not_requested" | "granted" | "denied" | "error";

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

  // Audio debug state
  const [micStatus, setMicStatus] = useState<MicStatus>("not_requested");
  const [audioLevel, setAudioLevel] = useState(0);
  const [sttStatus, setSttStatus] = useState<"inactive" | "active" | "restarting">("inactive");

  const recognitionRef = useRef<any>(null);
  const isUserRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  // Audio monitoring refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const restartCountRef = useRef(0);
  const isActiveRef = useRef(false);

  // Keep transcriptRef in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

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
    if (isActiveRef.current) setCallStatus("listening");
  }, [settings]);

  // Start audio level monitoring
  const startAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!isActiveRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.round((avg / 255) * 100));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.error("Audio monitoring error:", e);
    }
  }, []);

  // Stop audio monitoring
  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Create and start speech recognition
  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setSttStatus("active");
      restartCountRef.current = 0;
      console.log("[STT] Recognition started");
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const text = result[0].transcript.trim();
        if (!text || text.length < 2) return;

        const speaker = isUserRef.current ? "user" : "prospect";
        isUserRef.current = !isUserRef.current;

        const entry: TranscriptEntry = { speaker, text, timestamp: new Date().toISOString() };
        setTranscript(prev => {
          const updated = [...prev, entry];
          if (speaker === "prospect") {
            getSuggestion(text, updated);
          }
          return updated;
        });
        console.log(`[STT] ${speaker}: ${text}`);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[STT] Error:", event.error);
      if (event.error === "not-allowed") {
        setMicStatus("denied");
        setSttStatus("inactive");
        toast.error("Accès au microphone refusé. Vérifiez les permissions du navigateur.");
        return;
      }
      // For other errors (no-speech, network, aborted), we'll restart
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setSttStatus("restarting");
      }
    };

    recognition.onend = () => {
      console.log("[STT] Recognition ended, active:", isActiveRef.current);
      if (isActiveRef.current) {
        restartCountRef.current++;
        if (restartCountRef.current > 50) {
          console.warn("[STT] Too many restarts, pausing 3s...");
          setSttStatus("restarting");
          setTimeout(() => {
            if (isActiveRef.current) {
              restartCountRef.current = 0;
              try {
                recognition.start();
              } catch (e) {
                console.error("[STT] Restart failed:", e);
              }
            }
          }, 3000);
          return;
        }
        setSttStatus("restarting");
        setTimeout(() => {
          if (isActiveRef.current) {
            try {
              recognition.start();
              console.log("[STT] Restarted");
            } catch (e) {
              console.error("[STT] Restart failed:", e);
            }
          }
        }, 300);
      } else {
        setSttStatus("inactive");
      }
    };

    return recognition;
  }, [getSuggestion]);

  // Start call
  const startCall = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("La reconnaissance vocale n'est pas supportée. Utilisez Chrome ou Edge.");
      return;
    }

    // Request microphone permission first
    setCallStatus("calibrating");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      setMicStatus("granted");
      mediaStreamRef.current = stream;
      console.log("[MIC] Permission granted, tracks:", stream.getAudioTracks().length);
    } catch (e: any) {
      console.error("[MIC] Permission error:", e);
      setMicStatus(e.name === "NotAllowedError" ? "denied" : "error");
      setCallStatus("idle");
      toast.error("Impossible d'accéder au microphone. Vérifiez vos permissions.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Non connecté"); setCallStatus("idle"); return; }

    // Create session
    const { data: session, error } = await (supabase as any)
      .from("call_sessions")
      .insert({ user_id: user.id, status: "active" })
      .select()
      .single();
    if (error) { toast.error("Erreur création session"); setCallStatus("idle"); return; }

    sessionIdRef.current = session.id;
    setCurrentSession(session);
    setTranscript([]);
    setSuggestion("");
    setAnalysis(null);
    startTimeRef.current = new Date();
    isUserRef.current = false;
    isActiveRef.current = true;
    restartCountRef.current = 0;

    // Start audio level monitoring
    startAudioMonitoring(stream);

    toast.info("Calibration du micro en cours...");

    // Short calibration then start STT
    setTimeout(() => {
      if (!isActiveRef.current) return;
      
      const recognition = createRecognition();
      if (!recognition) {
        toast.error("Impossible de démarrer la reconnaissance vocale");
        setCallStatus("idle");
        return;
      }
      
      recognitionRef.current = recognition;
      
      try {
        recognition.start();
        setCallStatus("listening");
        toast.success("🎙️ Écoute active — Commencez l'appel !");
      } catch (e) {
        console.error("[STT] Start error:", e);
        toast.error("Erreur au démarrage de la reconnaissance vocale");
        setCallStatus("idle");
      }
    }, 2000);
  }, [createRecognition, startAudioMonitoring]);

  // End call
  const endCall = useCallback(async () => {
    isActiveRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    stopAudioMonitoring();
    setSttStatus("inactive");

    const duration = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current.getTime()) / 1000)
      : 0;

    const finalTranscript = transcriptRef.current;
    setCallStatus("idle");

    if (sessionIdRef.current) {
      await (supabase as any)
        .from("call_sessions")
        .update({
          status: "completed",
          transcript_json: finalTranscript,
          duration_seconds: duration,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionIdRef.current);

      // Generate analysis
      if (finalTranscript.length > 0) {
        setIsAnalyzing(true);
        try {
          const { data, error } = await supabase.functions.invoke("call-prompter-analyze", {
            body: { transcript: finalTranscript, settings },
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
  }, [settings, fetchSessions, stopAudioMonitoring]);

  // Regenerate suggestion
  const regenerateSuggestion = useCallback(() => {
    const lastProspect = [...transcriptRef.current].reverse().find(t => t.speaker === "prospect");
    if (lastProspect) {
      getSuggestion(lastProspect.text, transcriptRef.current);
    }
  }, [getSuggestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  return {
    settings, saveSettings,
    sessions, currentSession,
    transcript, suggestion, callStatus,
    isAnalyzing, analysis,
    loading,
    startCall, endCall, regenerateSuggestion,
    fetchSessions,
    // Debug state
    micStatus, audioLevel, sttStatus,
  };
}
