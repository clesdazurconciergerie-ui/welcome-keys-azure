import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface IdentitySectionProps {
  data: {
    conciergeName: string;
    logoUrl: string;
  };
  onChange: (updates: Partial<IdentitySectionProps['data']>) => void;
  onLogoUpload?: (file: File) => Promise<void>;
  onLogoRemove?: () => void;
}

export default function IdentitySection({ data, onChange, onLogoUpload, onLogoRemove }: IdentitySectionProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLogoUpload) {
      await onLogoUpload(file);
    }
  };

  return (
    <section className="bg-white border border-[#E6EDF2] rounded-2xl p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Identité & Branding</h2>
        <p className="text-sm text-[#64748B]">
          Nom de votre conciergerie et logo personnalisé
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="concierge-name">Nom de la conciergerie</Label>
          <Input
            id="concierge-name"
            value={data.conciergeName}
            onChange={(e) => onChange({ conciergeName: e.target.value })}
            placeholder="Ex: Clés d'Azur"
          />
          <p className="text-xs text-[#64748B]">
            Ce nom sera affiché dans le footer du livret
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Logo de la conciergerie (optionnel)</Label>
          
          {data.logoUrl ? (
            <div className="relative border border-[#E6EDF2] rounded-xl p-4">
              <img
                src={data.logoUrl}
                alt="Logo"
                className="h-20 object-contain"
              />
              {onLogoRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={onLogoRemove}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#E6EDF2] rounded-xl p-8 text-center">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label
                htmlFor="logo"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-[#64748B]" />
                <span className="text-sm text-[#64748B]">
                  Cliquez pour télécharger un logo
                </span>
                <span className="text-xs text-[#64748B]">
                  PNG, JPG, WEBP (max 2 MB)
                </span>
              </Label>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
