import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Phone, PhoneOff, Mic, MicOff, Settings, History, Brain, MessageSquare,
  TrendingUp, AlertTriangle, ThumbsUp, Lightbulb, RotateCcw,
  Volume2, Shield, Activity, User, Users, HelpCircle, Clock, Hash, Eye, ArrowLeft,
  CheckCircle, Trash2, AudioLines,
} from "lucide-react";
import { useCallPrompter, CallAnalysis, CallSession, TranscriptEntry } from "@/hooks/useCallPrompter";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CallPrompterPage = () => {
  const {
    settings, saveSettings,
    sessions,
    transcript, suggestion, callStatus,
    isAnalyzing, analysis,
    loading,
    startCall, endCall, regenerateSuggestion,
    micStatus, audioLevel, sttStatus,
    speakerState, lastDetectedSpeaker,
    chunksTranscribed, lastTranscriptionTime,
    hasVoiceProfile,
    isRecordingVoice, voiceRecordProgress,
    startVoiceRecording, cancelVoiceRecording, deleteVoiceProfile,
  } = useCallPrompter();

  const [tab, setTab] = useState("prompter");
  const [editSettings, setEditSettings] = useState(settings);
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && callStatus === "listening" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        regenerateSuggestion();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callStatus, regenerateSuggestion]);

  const statusLabel = {
    idle: "Prêt",
    listening: "Écoute en cours...",
    processing: "Analyse IA...",
  }[callStatus];

  const statusColor = {
    idle: "bg-muted text-muted-foreground",
    listening: "bg-green-500/20 text-green-600",
    processing: "bg-blue-500/20 text-blue-600",
  }[callStatus];

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              AI Call Prompter
            </h1>
            <p className="text-muted-foreground mt-1">Coach de vente IA en temps réel</p>
          </div>
          <div className="flex items-center gap-2">
            {hasVoiceProfile ? (
              <Badge className="bg-green-500/20 text-green-600 gap-1">
                <CheckCircle className="w-3 h-3" /> Voix enregistrée
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <MicOff className="w-3 h-3" /> Voix non enregistrée
              </Badge>
            )}
            <Badge className={statusColor}>{statusLabel}</Badge>
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="prompter" className="gap-2">
            <Phone className="w-4 h-4" /> Appel
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Historique
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" /> Paramètres
          </TabsTrigger>
        </TabsList>

        {/* PROMPTER TAB */}
        <TabsContent value="prompter" className="space-y-4">
          {/* Warning if no voice profile */}
          {!hasVoiceProfile && callStatus === "idle" && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="py-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Enregistrez votre voix d'abord</p>
                  <p className="text-xs text-muted-foreground">
                    Allez dans l'onglet <strong>Paramètres</strong> pour enregistrer votre empreinte vocale. 
                    Cela permet au système de distinguer automatiquement votre voix de celle du prospect.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setTab("settings")}>
                  Configurer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Control buttons */}
          <div className="flex gap-3">
            {callStatus === "idle" ? (
              <Button
                onClick={startCall}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                disabled={!hasVoiceProfile}
              >
                <Phone className="w-5 h-5" /> Démarrer l'appel
              </Button>
            ) : (
              <Button onClick={endCall} size="lg" variant="destructive" className="gap-2">
                <PhoneOff className="w-5 h-5" /> Terminer l'appel
              </Button>
            )}
            {callStatus === "listening" && (
              <Button onClick={regenerateSuggestion} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" /> Régénérer (Espace)
              </Button>
            )}
          </div>

          {/* Status Panel */}
          {callStatus !== "idle" && (
            <Card className="border border-border">
              <CardContent className="py-3 px-4 space-y-3">
                <div className="flex items-center gap-6 flex-wrap text-sm">
                  <div className="flex items-center gap-2">
                    {micStatus === "granted" ? (
                      <Mic className="w-4 h-4 text-green-500" />
                    ) : (
                      <MicOff className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-muted-foreground">Micro :</span>
                    <Badge variant={micStatus === "granted" ? "default" : "destructive"} className="text-xs">
                      {micStatus === "granted" ? "Actif" : "Inactif"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 min-w-[160px]">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <Progress value={audioLevel} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{audioLevel}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Whisper :</span>
                    <Badge variant={sttStatus === "active" ? "default" : "secondary"} className="text-xs">
                      {sttStatus === "active" ? "Actif" : sttStatus === "transcribing" ? "Transcription…" : "Inactif"}
                    </Badge>
                  </div>

                  {/* Speaker detection — automatic */}
                  <div className="flex items-center gap-2">
                    {speakerState === "listening_user" ? (
                      <User className="w-4 h-4 text-primary" />
                    ) : speakerState === "listening_prospect" ? (
                      <Users className="w-4 h-4 text-green-500" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-muted-foreground">Locuteur :</span>
                    <Badge
                      variant={speakerState === "listening_prospect" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {speakerState === "listening_user" ? "Vous" :
                       speakerState === "listening_prospect" ? "Prospect" :
                       "Détection…"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    Chunks : <span className="font-medium text-foreground">{chunksTranscribed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dernière : <span className="font-medium text-foreground">{lastTranscriptionTime || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teleprompter */}
          <AnimatePresence mode="wait">
            {callStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 min-h-[200px] flex items-center justify-center">
                  <CardContent className="py-10 px-8 text-center w-full">
                    {suggestion ? (
                      <motion.p
                        key={suggestion}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl md:text-3xl font-medium leading-relaxed text-foreground"
                      >
                        {suggestion}
                      </motion.p>
                    ) : (
                      <div className="space-y-3">
                        <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="text-lg text-muted-foreground">
                          {callStatus === "processing" ? "Analyse IA en cours..." :
                           speakerState === "listening_user" ? "Vous parlez — en attente du prospect…" :
                           audioLevel < 3 ? "En attente d'entrée audio…" :
                           "Écoute du prospect…"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live transcript */}
          {transcript.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Transcription en direct
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto space-y-2">
                {transcript.map((entry, i) => (
                  <div key={i} className={`flex gap-2 text-sm ${entry.speaker === "user" ? "justify-end" : ""}`}>
                    <Badge variant={entry.speaker === "user" ? "default" : "secondary"} className="shrink-0">
                      {entry.speaker === "user" ? "Vous" : "Prospect"}
                    </Badge>
                    <span className={`${entry.speaker === "user" ? "text-right" : ""} text-foreground`}>
                      {entry.text}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(isAnalyzing || analysis) && (
            <AnalysisSection analysis={analysis} isAnalyzing={isAnalyzing} />
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-3">
          {selectedSession ? (
            <SessionDetailView session={selectedSession} onBack={() => setSelectedSession(null)} />
          ) : (
            <>
              {sessions.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Aucun appel enregistré</p>
                  </CardContent>
                </Card>
              ) : (
                sessions.map((s) => (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedSession(s)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(s.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Durée : {s.duration_seconds ? `${Math.floor(s.duration_seconds / 60)}min ${s.duration_seconds % 60}s` : "—"}
                              {Array.isArray(s.transcript_json) && ` • ${s.transcript_json.length} échanges`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.analysis_json && (
                            <Badge variant="secondary" className="text-xs">
                              {(s.analysis_json as any).conversion_probability}% conv.
                            </Badge>
                          )}
                          <Badge variant={s.status === "completed" ? "default" : "secondary"}>
                            {s.status === "completed" ? "Terminé" : "Actif"}
                          </Badge>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          {/* Voice Profile Section */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AudioLines className="w-5 h-5 text-primary" /> Empreinte vocale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enregistrez votre voix pour que le système puisse automatiquement distinguer 
                votre voix de celle du prospect pendant les appels. Parlez normalement pendant 10 secondes.
              </p>

              {isRecordingVoice ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-destructive animate-pulse" />
                    <span className="text-sm font-medium text-foreground">Enregistrement en cours… Parlez normalement</span>
                  </div>
                  <Progress value={voiceRecordProgress} className="h-3" />
                  <p className="text-xs text-muted-foreground">{voiceRecordProgress}%</p>
                  <Button variant="outline" size="sm" onClick={cancelVoiceRecording}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {hasVoiceProfile ? (
                    <>
                      <Badge className="bg-green-500/20 text-green-600 gap-1">
                        <CheckCircle className="w-3 h-3" /> Profil enregistré
                      </Badge>
                      <Button variant="outline" size="sm" onClick={startVoiceRecording} className="gap-2">
                        <RotateCcw className="w-4 h-4" /> Ré-enregistrer
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deleteVoiceProfile} className="gap-2 text-destructive">
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </Button>
                    </>
                  ) : (
                    <Button onClick={startVoiceRecording} className="gap-2">
                      <Mic className="w-4 h-4" /> Enregistrer ma voix (10s)
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personnalisation IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input
                    value={editSettings.company_name || settings.company_name}
                    onChange={(e) => setEditSettings({ ...settings, ...editSettings, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Taux de commission</Label>
                  <Input
                    value={editSettings.commission_rate || settings.commission_rate}
                    onChange={(e) => setEditSettings({ ...settings, ...editSettings, commission_rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Zone géographique</Label>
                  <Input
                    value={editSettings.geographic_area || settings.geographic_area}
                    onChange={(e) => setEditSettings({ ...settings, ...editSettings, geographic_area: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Client cible</Label>
                  <Input
                    value={editSettings.target_client || settings.target_client}
                    onChange={(e) => setEditSettings({ ...settings, ...editSettings, target_client: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ton de la voix</Label>
                  <Select
                    value={editSettings.tone || settings.tone}
                    onValueChange={(v) => setEditSettings({ ...settings, ...editSettings, tone: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium & Expert</SelectItem>
                      <SelectItem value="friendly">Amical & Chaleureux</SelectItem>
                      <SelectItem value="direct">Direct & Professionnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Services proposés</Label>
                <Textarea
                  value={editSettings.services_offered || settings.services_offered}
                  onChange={(e) => setEditSettings({ ...settings, ...editSettings, services_offered: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Arguments de vente clés</Label>
                <Textarea
                  value={editSettings.selling_points || settings.selling_points}
                  onChange={(e) => setEditSettings({ ...settings, ...editSettings, selling_points: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={() => saveSettings({ ...settings, ...editSettings })}>
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Session Detail View ────────────────────────────────────────
function SessionDetailView({ session, onBack }: { session: CallSession; onBack: () => void }) {
  const transcriptEntries = Array.isArray(session.transcript_json) ? session.transcript_json as TranscriptEntry[] : [];
  const analysis = session.analysis_json as CallAnalysis | null;
  const prospectEntries = transcriptEntries.filter(e => e.speaker === "prospect");

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Retour à l'historique
      </Button>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Appel du {format(new Date(session.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>Durée : {session.duration_seconds ? `${Math.floor(session.duration_seconds / 60)}min ${session.duration_seconds % 60}s` : "—"}</span>
                <span>{transcriptEntries.length} échanges</span>
                <span>{prospectEntries.length} interventions prospect</span>
              </div>
            </div>
            {analysis && (
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{analysis.conversion_probability}%</p>
                <p className="text-xs text-muted-foreground">Probabilité conversion</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Timeline de la conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
          {transcriptEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune transcription</p>
          ) : (
            transcriptEntries.map((entry, i) => (
              <div key={i} className={`flex gap-3 ${entry.speaker === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  entry.speaker === "user" ? "bg-primary/10" : "bg-secondary"
                }`}>
                  {entry.speaker === "user" ? (
                    <User className="w-4 h-4 text-primary" />
                  ) : (
                    <Users className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className={`flex-1 max-w-[80%] ${entry.speaker === "user" ? "text-right" : ""}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {entry.speaker === "user" ? "Vous" : "Prospect"}
                    </span>
                    {entry.timestamp && (
                      <span className="text-xs text-muted-foreground/60">
                        {format(new Date(entry.timestamp), "HH:mm:ss")}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm p-2 rounded-lg inline-block ${
                    entry.speaker === "user" ? "bg-primary/10" : "bg-secondary"
                  } text-foreground`}>
                    {entry.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {analysis && <AnalysisSection analysis={analysis} isAnalyzing={false} />}
    </div>
  );
}

// ─── Analysis sub-component ─────────────────────────────────────
function AnalysisSection({ analysis, isAnalyzing }: { analysis: CallAnalysis | null; isAnalyzing: boolean }) {
  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Brain className="w-8 h-8 text-primary mx-auto animate-pulse mb-2" />
          <p className="text-muted-foreground">Analyse de l'appel en cours...</p>
        </CardContent>
      </Card>
    );
  }
  if (!analysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Analyse post-appel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">RÉSUMÉ</p>
          <p className="text-sm text-foreground">{analysis.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Niveau d'intérêt</p>
            <Badge variant={
              analysis.interest_level === "very_high" || analysis.interest_level === "high" ? "default" : "secondary"
            }>
              {analysis.interest_level === "very_high" ? "Très élevé" :
               analysis.interest_level === "high" ? "Élevé" :
               analysis.interest_level === "medium" ? "Moyen" : "Faible"}
            </Badge>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Probabilité conversion</p>
            <p className="text-lg font-bold text-foreground">{analysis.conversion_probability}%</p>
          </div>
        </div>

        {analysis.objections?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Objections détectées
            </p>
            <ul className="text-sm space-y-1">
              {analysis.objections.map((o, i) => <li key={i} className="text-foreground">• {o}</li>)}
            </ul>
          </div>
        )}

        {analysis.key_moments?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Moments clés
            </p>
            <ul className="text-sm space-y-1">
              {analysis.key_moments.map((m, i) => <li key={i} className="text-foreground">• {m}</li>)}
            </ul>
          </div>
        )}

        {analysis.strengths?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> Points forts
            </p>
            <ul className="text-sm space-y-1">
              {analysis.strengths.map((s, i) => <li key={i} className="text-foreground">• {s}</li>)}
            </ul>
          </div>
        )}

        {analysis.improvements?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> À améliorer
            </p>
            <ul className="text-sm space-y-1">
              {analysis.improvements.map((s, i) => <li key={i} className="text-foreground">• {s}</li>)}
            </ul>
          </div>
        )}

        {analysis.better_responses?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">RÉPONSES ALTERNATIVES</p>
            <div className="space-y-2">
              {analysis.better_responses.map((r, i) => (
                <div key={i} className="text-xs p-2 rounded bg-secondary/30">
                  <p className="text-muted-foreground line-through">{r.original}</p>
                  <p className="text-foreground font-medium mt-1">→ {r.suggested}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CallPrompterPage;
