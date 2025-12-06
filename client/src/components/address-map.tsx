import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, LoadScript, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Maximize2, Crosshair, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 }; // Riyadh

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

interface AddressMapProps {
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  readOnly?: boolean;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results && response.results[0]) {
      return response.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export function AddressMap({ onLocationSelect, initialLat, initialLng, readOnly = false }: AddressMapProps) {
  const { toast } = useToast();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (readOnly || !e.latLng) return;
    
    const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setPosition(newPos);
    
    if (onLocationSelect) {
      setIsLoadingAddress(true);
      reverseGeocode(newPos.lat, newPos.lng).then(address => {
        onLocationSelect(newPos.lat, newPos.lng, address || undefined);
        setIsLoadingAddress(false);
      });
    }
  }, [readOnly, onLocationSelect]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

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
        
        if (mapRef.current) {
          mapRef.current.panTo(newPos);
        }
        
        if (onLocationSelect) {
          setIsLoadingAddress(true);
          reverseGeocode(newPos.lat, newPos.lng).then(address => {
            onLocationSelect(newPos.lat, newPos.lng, address || undefined);
            setIsLoadingAddress(false);
            toast({ 
              title: "Location Updated", 
              description: address ? "Address found!" : "Coordinates updated." 
            });
          });
        } else {
           toast({ title: "Location Updated", description: "Map centered on your current location" });
        }
        setIsLocating(false);
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

  if (loadError) {
    return (
      <div className="w-full h-64 rounded-lg border border-border shadow-sm overflow-hidden flex items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-64 rounded-lg border border-border shadow-sm overflow-hidden flex items-center justify-center bg-muted">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const MapComponent = ({ className, controls = true }: { className?: string, controls?: boolean }) => (
    <div className={`relative w-full h-full bg-muted ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={position || DEFAULT_CENTER}
        zoom={13}
        onClick={readOnly ? undefined : handleMapClick}
        onLoad={handleMapLoad}
        options={{
          ...mapOptions,
          draggable: !readOnly,
          scrollwheel: !readOnly,
          disableDoubleClickZoom: readOnly,
        }}
      >
        {position && (
          <Marker position={position} />
        )}
      </GoogleMap>

      {!readOnly && controls && (
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-[10]">
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
                  <div className="absolute bottom-6 right-6 z-[10]">
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
      
      {!readOnly && isLoadingAddress && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10]">
            <span className="bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium shadow-sm flex items-center gap-2 border border-border">
               <Loader2 className="w-3 h-3 animate-spin" />
               Fetching address...
            </span>
         </div>
      )}

      {!readOnly && !position && !isLoadingAddress && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/5 z-[10]">
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
