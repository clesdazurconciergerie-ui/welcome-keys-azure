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
export type SpeakerDetection = "calibrating" | "listening_prospect" | "listening_user" | "uncertain";

const DEFAULT_SETTINGS: CallPrompterSettings = {
  services_offered: "Gestion locative saisonnière complète",
  commission_rate: "20%",
  geographic_area: "Côte d'Azur",
  selling_points: "Revenus optimisés, gestion complète, transparence totale",
  target_client: "Propriétaires de biens saisonniers",
  tone: "premium",
  company_name: "MyWelkom Conciergerie",
};

// ─── Voice profile helpers ──────────────────────────────────────
function computeSpectralProfile(analyser: AnalyserNode): Float32Array {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const profile = new Float32Array(data.length);
  const max = Math.max(...data) || 1;
  for (let i = 0; i < data.length; i++) profile[i] = data[i] / max;
  return profile;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, magA = 0, magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

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
  
  // Speaker detection state
  const [speakerState, setSpeakerState] = useState<SpeakerDetection>("calibrating");
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [lastDetectedSpeaker, setLastDetectedSpeaker] = useState<"user" | "prospect" | null>(null);

  const recognitionRef = useRef<any>(null);
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

  // Voice calibration refs
  const userVoiceProfileRef = useRef<Float32Array | null>(null);
  const calibrationSamplesRef = useRef<Float32Array[]>([]);
  const calibrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const CALIBRATION_DURATION = 5000; // 5 seconds
  const CALIBRATION_INTERVAL = 200; // sample every 200ms
  const SIMILARITY_THRESHOLD = 0.75; // above = user, below = prospect

  // Keep transcriptRef in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // ─── Settings / Sessions CRUD ─────────────────────────────────
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

  const saveSettings = async (newSettings: CallPrompterSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any)
      .from("call_prompter_settings")
      .upsert({ ...newSettings, user_id: user.id }, { onConflict: "user_id" });
    setSettings(newSettings);
    toast.success("Paramètres sauvegardés");
  };

  const fetchSessions = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("call_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setSessions(data || []);
  }, []);

  useEffect(() => { fetchSettings(); fetchSessions(); }, [fetchSettings, fetchSessions]);

  // ─── AI suggestion ────────────────────────────────────────────
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

  // ─── Audio level monitoring ───────────────────────────────────
  const startAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
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

  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ─── Voice calibration ────────────────────────────────────────
  const startCalibration = useCallback(() => {
    calibrationSamplesRef.current = [];
    setCalibrationProgress(0);
    setSpeakerState("calibrating");

    let elapsed = 0;
    calibrationTimerRef.current = setInterval(() => {
      elapsed += CALIBRATION_INTERVAL;
      setCalibrationProgress(Math.min(100, Math.round((elapsed / CALIBRATION_DURATION) * 100)));

      if (analyserRef.current) {
        const profile = computeSpectralProfile(analyserRef.current);
        // Only add if there's actual audio (not silence)
        const energy = profile.reduce((a, b) => a + b, 0);
        if (energy > 1) {
          calibrationSamplesRef.current.push(profile);
        }
      }

      if (elapsed >= CALIBRATION_DURATION) {
        if (calibrationTimerRef.current) clearInterval(calibrationTimerRef.current);
        calibrationTimerRef.current = null;

        // Average the samples into a voice profile
        const samples = calibrationSamplesRef.current;
        if (samples.length >= 3) {
          const len = samples[0].length;
          const avg = new Float32Array(len);
          for (const s of samples) {
            for (let i = 0; i < len; i++) avg[i] += s[i];
          }
          for (let i = 0; i < len; i++) avg[i] /= samples.length;
          userVoiceProfileRef.current = avg;
          console.log(`[CALIBRATION] Voice profile created from ${samples.length} samples`);
          toast.success("✅ Profil vocal enregistré — l'IA ne répondra qu'au prospect !");
        } else {
          console.warn("[CALIBRATION] Not enough voiced samples, using fallback");
          toast.warning("Calibration partielle — parlez plus fort. Vous pouvez basculer manuellement.");
          userVoiceProfileRef.current = null;
        }
        setSpeakerState("listening_prospect");
      }
    }, CALIBRATION_INTERVAL);
  }, []);

  // ─── Speaker detection ────────────────────────────────────────
  const detectSpeaker = useCallback((): "user" | "prospect" | "uncertain" => {
    if (!analyserRef.current || !userVoiceProfileRef.current) return "uncertain";
    
    const currentProfile = computeSpectralProfile(analyserRef.current);
    const energy = currentProfile.reduce((a, b) => a + b, 0);
    if (energy < 0.5) return "uncertain"; // silence

    const similarity = cosineSimilarity(currentProfile, userVoiceProfileRef.current);
    console.log(`[SPEAKER] Similarity: ${similarity.toFixed(3)}`);

    if (similarity >= SIMILARITY_THRESHOLD) return "user";
    if (similarity < SIMILARITY_THRESHOLD - 0.1) return "prospect";
    return "uncertain";
  }, []);

  // Manual speaker toggle
  const toggleSpeakerManual = useCallback((speaker: "user" | "prospect") => {
    setLastDetectedSpeaker(speaker);
    setSpeakerState(speaker === "user" ? "listening_user" : "listening_prospect");
  }, []);

  // ─── Speech recognition ───────────────────────────────────────
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
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (!result.isFinal) return;

      const text = result[0].transcript.trim();
      if (!text || text.length < 2) return;

      // Detect who is speaking using voice profile
      const detected = detectSpeaker();
      let speaker: "user" | "prospect";

      if (detected === "uncertain") {
        // If uncertain, default to prospect (safer — AI only generates for prospect)
        // But if last was prospect, assume this is user now
        const lastSpeaker = transcriptRef.current.length > 0
          ? transcriptRef.current[transcriptRef.current.length - 1].speaker
          : null;
        speaker = lastSpeaker === "prospect" ? "user" : "prospect";
        setSpeakerState("uncertain");
      } else {
        speaker = detected;
        setSpeakerState(speaker === "user" ? "listening_user" : "listening_prospect");
      }

      setLastDetectedSpeaker(speaker);
      const entry: TranscriptEntry = { speaker, text, timestamp: new Date().toISOString() };
      
      setTranscript(prev => {
        const updated = [...prev, entry];
        // CRITICAL: Only trigger AI when PROSPECT finishes speaking
        if (speaker === "prospect") {
          getSuggestion(text, updated);
        }
        return updated;
      });
      console.log(`[STT] ${speaker}: ${text}`);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setMicStatus("denied");
        setSttStatus("inactive");
        toast.error("Accès au microphone refusé.");
        return;
      }
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setSttStatus("restarting");
      }
    };

    recognition.onend = () => {
      if (isActiveRef.current) {
        restartCountRef.current++;
        if (restartCountRef.current > 50) {
          setSttStatus("restarting");
          setTimeout(() => {
            if (isActiveRef.current) {
              restartCountRef.current = 0;
              try { recognition.start(); } catch {}
            }
          }, 3000);
          return;
        }
        setSttStatus("restarting");
        setTimeout(() => {
          if (isActiveRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 300);
      } else {
        setSttStatus("inactive");
      }
    };

    return recognition;
  }, [getSuggestion, detectSpeaker]);

  // ─── Start call ───────────────────────────────────────────────
  const startCall = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Reconnaissance vocale non supportée. Utilisez Chrome ou Edge.");
      return;
    }

    setCallStatus("calibrating");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setMicStatus("granted");
      mediaStreamRef.current = stream;
    } catch (e: any) {
      setMicStatus(e.name === "NotAllowedError" ? "denied" : "error");
      setCallStatus("idle");
      toast.error("Impossible d'accéder au microphone.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Non connecté"); setCallStatus("idle"); return; }

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
    isActiveRef.current = true;
    restartCountRef.current = 0;
    userVoiceProfileRef.current = null;
    setLastDetectedSpeaker(null);

    // Start audio monitoring first
    startAudioMonitoring(stream);

    // Start voice calibration
    toast.info("🎙️ Parlez pendant 5 secondes pour calibrer votre voix…");
    startCalibration();

    // After calibration, start STT
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
        toast.error("Erreur au démarrage STT");
        setCallStatus("idle");
      }
    }, CALIBRATION_DURATION + 500);
  }, [createRecognition, startAudioMonitoring, startCalibration]);

  // ─── End call ─────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    isActiveRef.current = false;

    if (calibrationTimerRef.current) {
      clearInterval(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    stopAudioMonitoring();
    setSttStatus("inactive");
    setSpeakerState("calibrating");
    setLastDetectedSpeaker(null);

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

  // ─── Regenerate ───────────────────────────────────────────────
  const regenerateSuggestion = useCallback(() => {
    const lastProspect = [...transcriptRef.current].reverse().find(t => t.speaker === "prospect");
    if (lastProspect) {
      getSuggestion(lastProspect.text, transcriptRef.current);
    }
  }, [getSuggestion]);

  // ─── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (calibrationTimerRef.current) clearInterval(calibrationTimerRef.current);
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
    // Debug / speaker state
    micStatus, audioLevel, sttStatus,
    speakerState, calibrationProgress, lastDetectedSpeaker,
    toggleSpeakerManual,
  };
}
