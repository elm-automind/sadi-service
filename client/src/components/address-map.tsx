import { useState, useEffect, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, MapMouseEvent } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Maximize2, Crosshair, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// IMPORTANT: Replace with your actual Google Maps API Key
// You need to enable the "Maps JavaScript API" in your Google Cloud Console
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; 

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh

interface AddressMapProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  readOnly?: boolean;
}

export function AddressMap({ onLocationSelect, initialLat, initialLng, readOnly = false }: AddressMapProps) {
  const { toast } = useToast();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Update parent when position changes
  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (readOnly || !e.detail.latLng) return;
    
    const newPos = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng };
    setPosition(newPos);
    
    if (onLocationSelect) {
      onLocationSelect(newPos.lat, newPos.lng);
    }
  }, [onLocationSelect, readOnly]);

  const handleCurrentLocation = () => {
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

  // Shared Map Component
  const MapComponent = ({ className, controls = true }: { className?: string, controls?: boolean }) => (
    <div className={`relative w-full h-full rounded-lg overflow-hidden ${className}`}>
      <Map
        mapId="DEMO_MAP_ID" // Required for AdvancedMarker
        defaultCenter={position || DEFAULT_CENTER}
        defaultZoom={13}
        center={position || DEFAULT_CENTER}
        onClick={handleMapClick}
        disableDefaultUI={readOnly}
        clickableIcons={!readOnly}
        gestureHandling={readOnly ? 'none' : 'cooperative'}
      >
        {position && (
          <AdvancedMarker position={position}>
            <Pin background={"#2563EB"} glyphColor={"white"} borderColor={"#1E40AF"} />
          </AdvancedMarker>
        )}
      </Map>

      {/* Controls Overlay */}
      {!readOnly && controls && (
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            title="Locate Me"
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
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle>Select Location</DialogTitle>
                  <DialogDescription>Tap on the map to pin your precise delivery location.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 relative">
                  <MapComponent className="h-full rounded-none" controls={false} />
                  {/* Floating locate button for maximized view */}
                  <div className="absolute bottom-6 right-6">
                    <Button 
                      size="lg" 
                      className="shadow-lg rounded-full"
                      onClick={handleCurrentLocation}
                    >
                      {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
                      Locate Me
                    </Button>
                  </div>
                </div>
                <div className="p-4 border-t bg-muted/20 flex justify-end">
                  <Button onClick={() => setIsMaximized(false)}>Confirm Location</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
      
      {!readOnly && !position && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/5">
          <span className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Tap to set location
          </span>
        </div>
      )}
    </div>
  );

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="w-full h-64 rounded-lg border border-border shadow-sm overflow-hidden">
         {/* Check if API key is the placeholder */}
         {GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" ? (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
               <MapPin className="w-10 h-10 mb-2 opacity-20" />
               <p className="font-medium">Google Maps Integration</p>
               <p className="text-xs max-w-xs mt-1">To enable the map, please add your Google Maps API Key in <code className="bg-muted-foreground/20 px-1 rounded">client/src/components/address-map.tsx</code></p>
               
               {/* Fallback visual for demo purposes when no key */}
               <div className="mt-4 w-full h-32 bg-blue-100/50 rounded border border-blue-200/50 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <span className="text-xs text-blue-600 font-medium">Map Preview (No Key)</span>
               </div>
            </div>
         ) : (
            <MapComponent />
         )}
      </div>
    </APIProvider>
  );
}
