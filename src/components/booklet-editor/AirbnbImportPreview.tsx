import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface ImportedData {
  title?: string;
  description?: string;
  addressApprox?: string;
  city?: string;
  photos?: string[];
  amenities?: Array<{ category: string; items: string[] }>;
  houseRules?: {
    checkInFrom?: string;
    checkOutBefore?: string;
    quietHours?: string;
    pets?: boolean;
    smoking?: boolean;
    parties?: boolean;
  };
  maxGuests?: number;
  beds?: number;
  bathrooms?: number;
  spaces?: string[];
  host?: { name?: string; superhost?: boolean };
  neighborhood?: string;
  wifi?: { note?: string };
}

interface AirbnbImportPreviewProps {
  open: boolean;
  onClose: () => void;
  data: ImportedData;
  onApply: (selectedSections: string[]) => void;
}

export default function AirbnbImportPreview({ open, onClose, data, onApply }: AirbnbImportPreviewProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>([
    'general',
    'description',
    'photos',
    'amenities',
    'rules',
    'nearby',
  ]);

  const toggleSection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleApply = () => {
    onApply(selectedSections);
    onClose();
  };

  const sections = [
    {
      id: 'general',
      label: 'Informations générales',
      data: data.title || data.addressApprox || data.city,
      preview: `${data.title || 'Non disponible'}\n${data.addressApprox || ''} ${data.city || ''}`.trim()
    },
    {
      id: 'description',
      label: 'Description',
      data: data.description,
      preview: data.description ? `${data.description.slice(0, 200)}...` : 'Non disponible'
    },
    {
      id: 'photos',
      label: 'Photos',
      data: data.photos?.length,
      preview: data.photos ? `${data.photos.length} photo(s) trouvée(s)` : 'Aucune photo'
    },
    {
      id: 'amenities',
      label: 'Équipements',
      data: data.amenities?.length,
      preview: data.amenities 
        ? data.amenities.map(a => `${a.category}: ${a.items.length} item(s)`).join(', ')
        : 'Aucun équipement'
    },
    {
      id: 'rules',
      label: 'Règles de la maison',
      data: data.houseRules,
      preview: data.houseRules 
        ? `Check-in: ${data.houseRules.checkInFrom || '?'}, Check-out: ${data.houseRules.checkOutBefore || '?'}`
        : 'Non disponible'
    },
    {
      id: 'nearby',
      label: 'À proximité / Quartier',
      data: data.neighborhood,
      preview: data.neighborhood ? data.neighborhood.slice(0, 150) : 'Non disponible'
    },
    {
      id: 'capacity',
      label: 'Capacité & couchages',
      data: data.maxGuests || data.beds || data.bathrooms,
      preview: `${data.maxGuests || '?'} voyageurs, ${data.beds || '?'} lit(s), ${data.bathrooms || '?'} salle(s) de bain`
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Aperçu de l'import Airbnb</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les sections à importer dans votre livret
          </p>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedSections.includes(section.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                    disabled={!section.data}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{section.label}</span>
                      {section.data ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Disponible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Non trouvé
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {section.preview}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedSections.length} section(s) sélectionnée(s)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleApply}
              disabled={selectedSections.length === 0}
            >
              Appliquer la sélection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
