import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Building2, DoorOpen, Home, Image, ZoomIn } from "lucide-react";

interface PhotoItem {
  label: string;
  icon: typeof Building2;
  src: string | null;
}

interface PhotoGalleryProps {
  photos: {
    building?: string | null;
    gate?: string | null;
    door?: string | null;
  };
  showHeader?: boolean;
  variant?: "default" | "compact";
}

export function PhotoGallery({ photos, showHeader = true, variant = "default" }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ src: string; label: string } | null>(null);

  const photoItems: PhotoItem[] = [
    { label: t('viewAddress.buildingView'), icon: Building2, src: photos.building || null },
    { label: t('viewAddress.mainGate'), icon: DoorOpen, src: photos.gate || null },
    { label: t('viewAddress.flatDoor'), icon: Home, src: photos.door || null }
  ];

  const hasAnyPhoto = photos.building || photos.gate || photos.door;

  if (!hasAnyPhoto && !showHeader) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        {showHeader && (
          <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
            <Image className="w-4 h-4" />
            {t('viewAddress.photos')}
          </div>
        )}
        <div className={`grid grid-cols-3 ${variant === "compact" ? "gap-2" : "gap-2 md:gap-3"}`}>
          {photoItems.map((img, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1 truncate">
                <img.icon className="w-3 h-3 shrink-0" /> 
                <span className="truncate">{img.label}</span>
              </p>
              <div 
                className={`${variant === "compact" ? "aspect-[4/3]" : "aspect-square"} bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden relative group ${img.src ? "cursor-pointer" : ""}`}
                onClick={() => img.src && setEnlargedPhoto({ src: img.src, label: img.label })}
                data-testid={`photo-${i === 0 ? "building" : i === 1 ? "gate" : "door"}`}
              >
                {img.src ? (
                  <>
                    <img 
                      src={img.src} 
                      alt={img.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/80 rounded-full p-2">
                        <ZoomIn className="w-4 h-4 text-foreground" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground p-2">
                    <Image className="w-6 h-6 mx-auto opacity-30" />
                    <p className="text-[8px] md:text-[10px] mt-1">{t('viewAddress.noPhoto')}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!enlargedPhoto} onOpenChange={() => setEnlargedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          {enlargedPhoto && (
            <div className="flex flex-col items-center">
              <img 
                src={enlargedPhoto.src} 
                alt={enlargedPhoto.label}
                className="max-h-[80vh] w-auto object-contain rounded-lg"
                data-testid="photo-enlarged"
              />
              <p className="text-white/80 text-sm mt-3 font-medium">{enlargedPhoto.label}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
