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

// RMS energy of an audio chunk — used to skip silence
function computeRMS(analyser: AnalyserNode): number {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

export function useCallPrompter() {
  const [settings, setSettings] = useState<CallPrompterSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [callStatus, setCallStatus] = useState<"idle" | "listening" | "processing">("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // Audio debug state
  const [micStatus, setMicStatus] = useState<MicStatus>("not_requested");
  const [audioLevel, setAudioLevel] = useState(0);
  const [sttStatus, setSttStatus] = useState<"inactive" | "active" | "transcribing">("inactive");
  const [chunksTranscribed, setChunksTranscribed] = useState(0);
  const [lastTranscriptionTime, setLastTranscriptionTime] = useState<string | null>(null);

  // Push-to-talk: true when user is holding spacebar (= user speaking, muted)
  const [userSpeaking, setUserSpeaking] = useState(false);
  const userSpeakingRef = useRef(false);

  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number>(0);
  const isActiveRef = useRef(false);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Whisper chunking refs
  const audioChunksRef = useRef<Blob[]>([]);
  const isTranscribingRef = useRef(false);
  const transcriptionQueueRef = useRef<{ blob: Blob; speaker: "user" | "prospect" }[]>([]);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // ─── Push-to-talk keyboard listeners ──────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !isActiveRef.current) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
      e.preventDefault();
      if (!userSpeakingRef.current) {
        userSpeakingRef.current = true;
        setUserSpeaking(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !isActiveRef.current) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;
      e.preventDefault();
      userSpeakingRef.current = false;
      setUserSpeaking(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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
      const { data: recentAnalyses } = await (supabase as any)
        .from("call_sessions")
        .select("analysis_json")
        .not("analysis_json", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      const pastPatterns = (recentAnalyses || [])
        .map((s: any) => s.analysis_json)
        .filter(Boolean);

      const { data, error } = await supabase.functions.invoke("call-prompter-suggest", {
        body: {
          prospect_speech: prospectSpeech,
          conversation_history: history,
          settings,
          past_analyses: pastPatterns,
        },
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
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
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

  // ─── Whisper transcription ────────────────────────────────────
  const transcribeChunk = useCallback(async (audioBlob: Blob, speaker: "user" | "prospect") => {
    if (audioBlob.size < 2000) return;

    setSttStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/call-prompter-transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${supabaseKey}` },
        body: formData,
      });

      if (!response.ok) {
        console.error("Transcription error:", response.status);
        if (response.status === 429) toast.error("Limite de requêtes atteinte");
        setSttStatus("active");
        return;
      }

      const data = await response.json();
      const text = (data.text || "").trim();

      const hallucinations = [
        "sous-titres", "sous-titrage", "merci d'avoir regardé", "merci de votre attention",
        "subscribe", "like", "bell", "amara.org", "transcrit par", "réalisé par",
      ];
      const isHallucination = text.length < 3 ||
        hallucinations.some(h => text.toLowerCase().includes(h)) ||
        /^[.\s,!?]+$/.test(text);

      if (text && !isHallucination) {
        setChunksTranscribed(prev => prev + 1);
        setLastTranscriptionTime(new Date().toLocaleTimeString("fr-FR"));

        const entry: TranscriptEntry = {
          speaker,
          text,
          timestamp: new Date().toISOString(),
        };

        setTranscript(prev => {
          const updated = [...prev, entry];
          // Only trigger AI suggestion for prospect speech
          if (speaker === "prospect") {
            getSuggestion(text, updated);
          }
          return updated;
        });
      }

      setSttStatus("active");
    } catch (e) {
      console.error("Transcription failed:", e);
      setSttStatus("active");
    }
  }, [getSuggestion]);

  const processQueue = useCallback(async () => {
    if (isTranscribingRef.current) return;
    const item = transcriptionQueueRef.current.shift();
    if (!item) return;

    isTranscribingRef.current = true;
    await transcribeChunk(item.blob, item.speaker);
    isTranscribingRef.current = false;

    if (transcriptionQueueRef.current.length > 0 && isActiveRef.current) {
      processQueue();
    }
  }, [transcribeChunk]);

  // ─── MediaRecorder chunking (6s chunks, skip when user speaking) ──
  const startRecording = useCallback((stream: MediaStream) => {
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      // Track speaker at chunk boundaries
      let chunkSpeaker: "user" | "prospect" = userSpeakingRef.current ? "user" : "prospect";

      recorder.start();
      setSttStatus("active");

      // 6-second chunks — always transcribe, tag with speaker
      recordingIntervalRef.current = setInterval(() => {
        if (!isActiveRef.current || recorder.state !== "recording") return;

        // Capture who was predominantly speaking during this chunk
        const speakerForChunk = chunkSpeaker;

        recorder.stop();
        setTimeout(() => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            audioChunksRef.current = [];
            // Energy filter: skip very small blobs (silence)
            if (blob.size > 4000) {
              transcriptionQueueRef.current.push({ blob, speaker: speakerForChunk });
              processQueue();
            }
          } else {
            audioChunksRef.current = [];
          }
          // Update speaker for next chunk
          chunkSpeaker = userSpeakingRef.current ? "user" : "prospect";
          if (isActiveRef.current) {
            try { recorder.start(); } catch {}
          }
        }, 100);
      }, 6000);
    } catch (e) {
      console.error("MediaRecorder error:", e);
      toast.error("Impossible de démarrer l'enregistrement audio");
    }
  }, [processQueue]);

  const stopRecording = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    transcriptionQueueRef.current = [];
    isTranscribingRef.current = false;
  }, []);

  // ─── Start call (no calibration needed) ───────────────────────
  const startCall = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setMicStatus("granted");
      mediaStreamRef.current = stream;
    } catch (e: any) {
      setMicStatus(e.name === "NotAllowedError" ? "denied" : "error");
      toast.error("Impossible d'accéder au microphone.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Non connecté"); return; }

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
    setChunksTranscribed(0);
    setLastTranscriptionTime(null);
    startTimeRef.current = new Date();
    isActiveRef.current = true;
    userSpeakingRef.current = false;
    setUserSpeaking(false);

    startAudioMonitoring(stream);
    startRecording(stream);
    setCallStatus("listening");
    toast.success("🎙️ Appel démarré — Maintenez [Espace] quand vous parlez");
  }, [startAudioMonitoring, startRecording]);

  // ─── End call ─────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    isActiveRef.current = false;
    userSpeakingRef.current = false;
    setUserSpeaking(false);
    stopRecording();

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
  }, [settings, fetchSessions, stopAudioMonitoring, stopRecording]);

  const regenerateSuggestion = useCallback(() => {
    const lastProspect = [...transcriptRef.current].reverse().find(t => t.speaker === "prospect");
    if (lastProspect) getSuggestion(lastProspect.text, transcriptRef.current);
  }, [getSuggestion]);

  // ─── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
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
    micStatus, audioLevel, sttStatus,
    chunksTranscribed, lastTranscriptionTime,
    userSpeaking,
  };
}
