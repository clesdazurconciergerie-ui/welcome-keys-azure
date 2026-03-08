import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useMissionChecklist } from "@/hooks/useMissionChecklist";
import { CheckCircle2, ListChecks, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MissionChecklistProps {
  missionId: string;
  propertyId: string;
  readOnly?: boolean;
}

export function MissionChecklist({ missionId, propertyId, readOnly = false }: MissionChecklistProps) {
  const {
    templates,
    loading,
    toggleCompletion,
    isCompleted,
    getNotes,
    allMandatoryCompleted,
    completionProgress,
  } = useMissionChecklist(missionId, propertyId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ListChecks className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune checklist configurée pour ce logement</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="w-5 h-5 text-primary" />
            Checklist de ménage
            {allMandatoryCompleted && (
              <Badge variant="default" className="ml-2">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Terminé
              </Badge>
            )}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {completionProgress.toFixed(0)}%
          </span>
        </div>
        <Progress value={completionProgress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map((template) => {
          const completed = isCompleted(template.id);
          const notes = getNotes(template.id);

          return (
            <div
              key={template.id}
              className={`p-4 rounded-lg border ${
                completed ? "border-primary/20 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`task-${template.id}`}
                  checked={completed}
                  onCheckedChange={(checked) =>
                    !readOnly && toggleCompletion(template.id, checked as boolean)
                  }
                  disabled={readOnly}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`task-${template.id}`}
                    className={`text-sm font-medium cursor-pointer ${
                      completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {template.task_text}
                    {template.is_mandatory && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Obligatoire
                      </Badge>
                    )}
                  </Label>
                  {!readOnly && (
                    <Textarea
                      placeholder="Notes optionnelles..."
                      value={notes}
                      onChange={(e) =>
                        toggleCompletion(template.id, completed, e.target.value)
                      }
                      className="mt-2 text-xs"
                      rows={2}
                    />
                  )}
                  {readOnly && notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{notes}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
