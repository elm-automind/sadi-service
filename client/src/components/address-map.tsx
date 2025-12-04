import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Maximize2, Crosshair, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fix for default marker icon in Leaflet with Webpack/Vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh

interface AddressMapProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  readOnly?: boolean;
}

// Component to handle map clicks and updates
function LocationMarker({ 
  position, 
  setPosition, 
  readOnly, 
  onLocationSelect 
}: { 
  position: { lat: number; lng: number } | null; 
  setPosition: (pos: { lat: number; lng: number }) => void;
  readOnly: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (readOnly) return;
      const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPosition(newPos);
      if (onLocationSelect) {
        onLocationSelect(newPos.lat, newPos.lng);
      }
    },
  });

  // Fly to position when it changes externally (e.g. geolocation)
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

export function AddressMap({ onLocationSelect, initialLat, initialLng, readOnly = false }: AddressMapProps) {
  const { toast } = useToast();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [key, setKey] = useState(0); // Force re-render map on resize/modal open

  // Handle "Locate Me"
  const handleCurrentLocation = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        if (onLocationSelect) {
          onLocationSelect(newPos.lat, newPos.lng);
        }
        setIsLocating(false);
        toast({ title: "Location Updated", description: "Map centered on your current location" });
      },
      (error) => {
        console.error(error);
        setIsLocating(false);
        toast({
          title: "Location Error",
          description: "Could not fetch your location. Please enable permissions.",
          variant: "destructive"
        });
      }
    );
  };

  // Force map resize when maximized
  useEffect(() => {
    if (isMaximized) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        setKey(k => k + 1);
      }, 100);
    }
  }, [isMaximized]);

  const MapComponent = ({ className, controls = true }: { className?: string, controls?: boolean }) => (
    <div className={`relative w-full h-full bg-muted ${className}`}>
      <MapContainer
        key={key} // Force re-render to fix sizing issues in modals
        center={position || DEFAULT_CENTER}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        scrollWheelZoom={!readOnly}
        doubleClickZoom={!readOnly}
        dragging={!readOnly}
        zoomControl={false} // We'll add our own or rely on scroll
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationMarker 
          position={position} 
          setPosition={setPosition} 
          readOnly={readOnly}
          onLocationSelect={onLocationSelect}
        />
      </MapContainer>

      {/* Controls Overlay */}
      {!readOnly && controls && (
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-[400]">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            title="Locate Me"
            type="button"
          >
            {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          </Button>
          
          {!isMaximized && (
            <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
              <DialogTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
                  title="Maximize Map"
                  type="button"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0 z-[500]">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle>Select Location</DialogTitle>
                  <DialogDescription>Tap on the map to pin your precise delivery location.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 relative">
                  <MapComponent className="h-full rounded-none" controls={false} />
                  {/* Floating locate button for maximized view */}
                  <div className="absolute bottom-6 right-6 z-[500]">
                    <Button 
                      size="lg" 
                      className="shadow-lg rounded-full"
                      onClick={handleCurrentLocation}
                      type="button"
                    >
                      {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
                      Locate Me
                    </Button>
                  </div>
                </div>
                <div className="p-4 border-t bg-muted/20 flex justify-end">
                  <Button onClick={() => setIsMaximized(false)} type="button">Confirm Location</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
      
      {!readOnly && !position && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/5 z-[400]">
          <span className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Tap to set location
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-64 rounded-lg border border-border shadow-sm overflow-hidden isolate">
       <MapComponent />
    </div>
  );
}
