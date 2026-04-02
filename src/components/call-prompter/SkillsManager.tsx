import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Brain, Plus, Trash2, Edit, ChevronUp, ChevronDown, Zap, FileText,
} from "lucide-react";
import { CallSkill, CustomScript, useCallPrompterSkills } from "@/hooks/useCallPrompterSkills";

export function SkillsManager() {
  const {
    skills, script, loading,
    addSkill, updateSkill, deleteSkill, toggleSkill, reorderSkills,
    saveScript,
  } = useCallPrompterSkills();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", prompt_content: "", priority: "medium" as "low" | "medium" | "high" });
  const [editScript, setEditScript] = useState(script);
  const [scriptDirty, setScriptDirty] = useState(false);

  // Sync script state when loaded
  if (!scriptDirty && (editScript.pitch !== script.pitch || editScript.key_phrases !== script.key_phrases || editScript.unique_selling_points !== script.unique_selling_points)) {
    setEditScript(script);
  }

  const priorityColor = (p: string) => {
    if (p === "high") return "bg-red-500/20 text-red-600";
    if (p === "medium") return "bg-amber-500/20 text-amber-600";
    return "bg-muted text-muted-foreground";
  };

  const priorityLabel = (p: string) => p === "high" ? "Haute" : p === "medium" ? "Moyenne" : "Basse";

  const handleAdd = async () => {
    if (!form.name || !form.prompt_content) return;
    await addSkill({ name: form.name, description: form.description, prompt_content: form.prompt_content, priority: form.priority, is_active: true });
    setForm({ name: "", description: "", prompt_content: "", priority: "medium" });
    setShowAdd(false);
  };

  const handleSaveEdit = async (skill: CallSkill) => {
    await updateSkill(skill.id, { name: form.name, description: form.description, prompt_content: form.prompt_content, priority: form.priority });
    setEditingId(null);
  };

  const moveSkill = (index: number, direction: -1 | 1) => {
    const newSkills = [...skills];
    const target = index + direction;
    if (target < 0 || target >= newSkills.length) return;
    [newSkills[index], newSkills[target]] = [newSkills[target], newSkills[index]];
    reorderSkills(newSkills);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Chargement des skills…</p>;

  return (
    <div className="space-y-6">
      {/* Skills List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Skills IA ({skills.filter(s => s.is_active).length} actifs)
          </CardTitle>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nouveau Skill</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nom</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Qualification Premium" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Courte description" />
                </div>
                <div>
                  <Label>Priorité</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="low">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contenu du prompt</Label>
                  <Textarea value={form.prompt_content} onChange={e => setForm({ ...form, prompt_content: e.target.value })} rows={8} placeholder="Collez ici le prompt du skill (ex: un skill Claude)" />
                </div>
                <Button onClick={handleAdd} disabled={!form.name || !form.prompt_content} className="w-full">
                  Ajouter le skill
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun skill configuré</p>
          ) : (
            skills.map((skill, index) => (
              <div key={skill.id} className={`border rounded-lg p-3 transition-colors ${skill.is_active ? "border-border" : "border-border/50 opacity-60"}`}>
                {editingId === skill.id ? (
                  <div className="space-y-3">
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" />
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="low">Basse</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea value={form.prompt_content} onChange={e => setForm({ ...form, prompt_content: e.target.value })} rows={6} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(skill)}>Sauvegarder</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveSkill(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveSkill(index, 1)} disabled={index === skills.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">{skill.name}</span>
                          <Badge className={`text-xs ${priorityColor(skill.priority)}`}>{priorityLabel(skill.priority)}</Badge>
                          {skill.is_default && <Badge variant="outline" className="text-xs">Défaut</Badge>}
                        </div>
                        {skill.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{skill.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={skill.is_active} onCheckedChange={() => toggleSkill(skill.id)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        setForm({ name: skill.name, description: skill.description || "", prompt_content: skill.prompt_content, priority: skill.priority });
                        setEditingId(skill.id);
                      }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      {!skill.is_default && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSkill(skill.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Custom Script */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Script personnalisé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Ce script est toujours injecté dans les réponses IA, en plus des skills actifs.</p>
          <div>
            <Label>Votre pitch</Label>
            <Textarea
              value={editScript.pitch}
              onChange={e => { setEditScript({ ...editScript, pitch: e.target.value }); setScriptDirty(true); }}
              rows={3}
              placeholder="Ex: Bonjour, je suis X de la conciergerie Y. Je vous appelle car..."
            />
          </div>
          <div>
            <Label>Phrases clés</Label>
            <Textarea
              value={editScript.key_phrases}
              onChange={e => { setEditScript({ ...editScript, key_phrases: e.target.value }); setScriptDirty(true); }}
              rows={3}
              placeholder="Ex: revenus optimisés, zéro stress, transparence totale..."
            />
          </div>
          <div>
            <Label>Arguments différenciants</Label>
            <Textarea
              value={editScript.unique_selling_points}
              onChange={e => { setEditScript({ ...editScript, unique_selling_points: e.target.value }); setScriptDirty(true); }}
              rows={3}
              placeholder="Ex: On a 98% de taux d'occupation, on gère tout de A à Z..."
            />
          </div>
          <Button onClick={() => { saveScript(editScript); setScriptDirty(false); }}>Sauvegarder le script</Button>
        </CardContent>
      </Card>
    </div>
  );
}
