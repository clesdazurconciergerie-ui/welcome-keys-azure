import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit,
  Eye,
  Copy,
  Trash2,
  QrCode,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  ImageIcon,
  Clock,
  BarChart3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Pin {
  pin_code: string;
  status: string;
}

interface BookletCardProps {
  booklet: {
    id: string;
    property_name?: string;
    title?: string;
    welcome_message?: string;
    subtitle?: string;
    status: string;
    updated_at: string;
    views_count?: number;
    cover_image_url?: string;
  };
  pin?: Pin;
  index: number;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onCopyCode: (code: string) => void;
  onCopyLink: (code: string) => void;
  onGenerateQR: (code: string, propertyName: string) => void;
  onRegeneratePin: (id: string) => void;
  onDuplicate: (booklet: any) => void;
  onDelete: (id: string) => void;
}

const BookletCard = ({
  booklet,
  pin,
  index,
  onEdit,
  onPreview,
  onCopyCode,
  onCopyLink,
  onGenerateQR,
  onRegeneratePin,
  onDuplicate,
  onDelete,
}: BookletCardProps) => {
  const navigate = useNavigate();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const propertyName = booklet.property_name || booklet.title || "Sans titre";
  const hasCoverImage = booklet.cover_image_url && !imageError;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "published":
        return {
          label: "Publié",
          className: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
          dotColor: "bg-emerald-500",
        };
      case "disabled":
        return {
          label: "Désactivé",
          className: "bg-amber-500/10 text-amber-700 border-amber-200",
          dotColor: "bg-amber-500",
        };
      default:
        return {
          label: "Brouillon",
          className: "bg-muted text-muted-foreground border-border",
          dotColor: "bg-muted-foreground",
        };
    }
  };

  const statusConfig = getStatusConfig(booklet.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group"
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-2xl bg-card border border-border",
          "shadow-sm hover:shadow-lg transition-all duration-300 ease-out",
          "hover:-translate-y-1"
        )}
      >
        {/* Cover Image Section */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {hasCoverImage ? (
            <>
              <img
                src={booklet.cover_image_url}
                alt={propertyName}
                className={cn(
                  "w-full h-full object-cover transition-all duration-500",
                  "group-hover:scale-105",
                  isImageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setIsImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {!isImageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-muted" />
              )}
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            /* Elegant placeholder */
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-8 h-8 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground/60">Pas de couverture</p>
              </div>
            </div>
          )}

          {/* Status Badge - Positioned on image */}
          <div className="absolute top-3 left-3">
            <Badge
              className={cn(
                "px-2.5 py-1 text-xs font-medium border backdrop-blur-sm",
                statusConfig.className
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.dotColor)} />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Quick Actions Menu - Top Right */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
                >
                  <MoreHorizontal className="h-4 w-4 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onPreview(booklet.id)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Prévisualiser
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(booklet)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer
                </DropdownMenuItem>
                {pin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onCopyCode(pin.pin_code)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier le code PIN
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopyLink(pin.pin_code)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Copier le lien
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onGenerateQR(pin.pin_code, propertyName)}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Télécharger QR Code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRegeneratePin(booklet.id)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Régénérer le PIN
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(booklet.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Property Name Overlay - Bottom of image (if has cover) */}
          {hasCoverImage && (
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-display text-lg font-semibold text-white truncate drop-shadow-md">
                {propertyName}
              </h3>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-4">
          {/* Property Name (if no cover image) */}
          {!hasCoverImage && (
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground truncate">
                {propertyName}
              </h3>
              {(booklet.subtitle || booklet.welcome_message) && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {booklet.subtitle || booklet.welcome_message}
                </p>
              )}
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{booklet.views_count || 0} vues</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="truncate">
                {formatDistanceToNow(new Date(booklet.updated_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
          </div>

          {/* PIN Section (if published) */}
          {booklet.status === "published" && pin && (
            <div className="p-3 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Code PIN
                </span>
                <code className="text-base font-bold text-primary font-mono bg-background px-2.5 py-0.5 rounded-lg border border-border">
                  {pin.pin_code}
                </code>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs hover:bg-background"
                  onClick={() => onCopyCode(pin.pin_code)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Code
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs hover:bg-background"
                  onClick={() => onCopyLink(pin.pin_code)}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Lien
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs hover:bg-background"
                  onClick={() => onGenerateQR(pin.pin_code, propertyName)}
                >
                  <QrCode className="w-3 h-3 mr-1" />
                  QR
                </Button>
              </div>
            </div>
          )}

          {/* Primary Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 font-medium transition-all duration-200 hover:shadow-md"
              onClick={() => navigate(`/booklets/${booklet.id}/wizard`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-10 w-10 p-0 hover:bg-secondary transition-colors"
              onClick={() => onPreview(booklet.id)}
              title="Prévisualiser"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-10 w-10 p-0 hover:bg-secondary transition-colors"
              onClick={() => onDuplicate(booklet)}
              title="Dupliquer"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              onClick={() => onDelete(booklet.id)}
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BookletCard;
