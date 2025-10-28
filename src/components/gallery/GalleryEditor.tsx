import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface GalleryItem {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  order: number;
  width?: number;
  height?: number;
}

interface GalleryEditorProps {
  enabled: boolean;
  items: GalleryItem[];
  bookletId: string;
  onToggle: (enabled: boolean) => void;
  onChange: (items: GalleryItem[]) => void;
}

export default function GalleryEditor({
  enabled,
  items,
  bookletId,
  onToggle,
  onChange,
}: GalleryEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth = 3000): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          file.type,
          0.82
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      reader.readAsDataURL(file);
    });
  };

  const handleAddFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newItems: GalleryItem[] = [];
    const maxOrder = items.reduce((max, item) => Math.max(max, item.order), -1);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image`);
          continue;
        }

        // Validate file size (20MB max)
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} est trop volumineux (max 20MB)`);
          continue;
        }

        // Compress if needed
        let fileToUpload: Blob = file;
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const width = img.naturalWidth;
        const height = img.naturalHeight;
        URL.revokeObjectURL(objectUrl);

        if (width > 3000 || height > 3000) {
          fileToUpload = await compressImage(file);
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${bookletId}/gallery/${crypto.randomUUID()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("booklet-images")
          .upload(fileName, fileToUpload, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Erreur lors de l'upload de ${file.name}`);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("booklet-images").getPublicUrl(uploadData.path);

        newItems.push({
          id: crypto.randomUUID(),
          url: publicUrl,
          alt: null,
          caption: null,
          order: maxOrder + i + 1,
          width,
          height,
        });
      }

      if (newItems.length > 0) {
        onChange([...items, ...newItems]);
        toast.success(`${newItems.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Erreur lors de l'upload des fichiers");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<GalleryItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleRemoveItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Extract file path from URL
    const urlParts = item.url.split("/booklet-images/");
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      await supabase.storage.from("booklet-images").remove([filePath]);
    }

    onChange(items.filter((i) => i.id !== id));
    toast.success("Photo supprimée");
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    // Update order
    const updatedItems = newItems.map((item, idx) => ({ ...item, order: idx }));
    onChange(updatedItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={onToggle} id="gallery-enabled" />
          <Label htmlFor="gallery-enabled" className="cursor-pointer">
            Afficher la galerie dans le livret
          </Label>
        </div>
      </div>

      {enabled && (
        <>
          {items.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Aucune photo dans la galerie. Ajoutez des photos pour créer une belle galerie.
              </p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter des photos
                  </>
                )}
              </Button>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter des photos
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-4">
                {items
                  .sort((a, b) => a.order - b.order)
                  .map((item, index) => (
                    <Card
                      key={item.id}
                      className={`p-4 ${draggedIndex === index ? "opacity-50" : ""}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center cursor-move">
                          <GripVertical className="w-5 h-5 text-muted-foreground" />
                        </div>

                        <div className="flex-shrink-0">
                          <img
                            src={item.url}
                            alt={item.alt || ""}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`alt-${item.id}`} className="text-xs">
                              Texte alternatif (accessibilité)
                            </Label>
                            <Input
                              id={`alt-${item.id}`}
                              value={item.alt || ""}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { alt: e.target.value })
                              }
                              placeholder="Description de l'image"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`caption-${item.id}`} className="text-xs">
                              Légende (optionnelle)
                            </Label>
                            <Textarea
                              id={`caption-${item.id}`}
                              value={item.caption || ""}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { caption: e.target.value })
                              }
                              placeholder="Légende affichée sous la photo"
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(item.url, "_blank")}
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleAddFiles(e.target.files)}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
