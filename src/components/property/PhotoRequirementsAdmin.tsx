import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePhotoRequirements, type PhotoRequirement } from '@/hooks/usePhotoRequirements';
import { Camera, GripVertical, Plus, Trash2, Loader2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

interface Props {
  propertyId: string;
}

export function PhotoRequirementsAdmin({ propertyId }: Props) {
  const { requirements, loading, addRequirement, updateRequirement, deleteRequirement, reorder } = usePhotoRequirements(propertyId);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    await addRequirement(newLabel.trim(), newDesc.trim() || undefined);
    setNewLabel('');
    setNewDesc('');
    setAdding(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(requirements);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    reorder(items);
  };

  const presets = ['Toilettes', 'Sol pièce principale', 'Cuisine propre', 'Miroir salle de bain', 'Lit refait', 'Poubelles vidées'];
  const existingLabels = requirements.map(r => r.label.toLowerCase());
  const availablePresets = presets.filter(p => !existingLabels.includes(p.toLowerCase()));

  if (loading) {
    return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="w-5 h-5 text-primary" />
          Checklist photos ménage
        </CardTitle>
        <p className="text-sm text-muted-foreground">Définissez les photos que vos prestataires doivent prendre pour chaque mission.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        {availablePresets.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Ajout rapide</Label>
            <div className="flex flex-wrap gap-1.5">
              {availablePresets.map(p => (
                <Button key={p} variant="outline" size="sm" className="text-xs h-7" onClick={() => addRequirement(p)}>
                  <Plus className="w-3 h-3 mr-1" />{p}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Current list with drag & drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="photo-requirements">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {requirements.map((req, index) => (
                  <Draggable key={req.id} draggableId={req.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                          snapshot.isDragging ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-background'
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing shrink-0">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{req.label}</p>
                          {req.description && <p className="text-xs text-muted-foreground truncate">{req.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={req.required}
                              onCheckedChange={(v) => updateRequirement(req.id, { required: v })}
                            />
                            <Badge variant={req.required ? 'default' : 'secondary'} className="text-[10px]">
                              {req.required ? 'Obligatoire' : 'Optionnel'}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteRequirement(req.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {requirements.length === 0 && (
          <div className="text-center py-6 border rounded-lg border-dashed">
            <Camera className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune checklist photo configurée</p>
            <p className="text-xs text-muted-foreground">Utilisez les boutons ci-dessus ou ajoutez manuellement</p>
          </div>
        )}

        {/* Manual add */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-medium">Ajouter un élément</Label>
          <div className="flex gap-2">
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Ex: Cuisine propre"
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={adding || !newLabel.trim()} size="sm">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <Input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description courte (optionnel)"
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
