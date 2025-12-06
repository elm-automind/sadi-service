import { useState, useCallback, useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Maximize2, Crosshair, MapPin, Loader2, Navigation, ExternalLink, Share2, Copy, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

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
  showActions?: boolean;
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

const openGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
};

const openDirections = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
};

const openStreetView = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`, "_blank");
};

const shareLocation = async (lat: number, lng: number, toast: any, t: any) => {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: t("map.shareLocation"),
        text: t("map.checkLocation"),
        url: url,
      });
    } catch (err) {
      console.log("Share cancelled");
    }
  } else {
    await navigator.clipboard.writeText(url);
    toast({
      title: t("map.linkCopied"),
      description: t("map.linkCopiedDesc"),
    });
  }
};

const copyCoordinates = async (lat: number, lng: number, toast: any, t: any) => {
  await navigator.clipboard.writeText(`${lat}, ${lng}`);
  toast({
    title: t("map.coordinatesCopied"),
    description: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
  });
};

export function AddressMap({ onLocationSelect, initialLat, initialLng, readOnly = false, showActions = true }: AddressMapProps) {
  const { t } = useTranslation();
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
        title: t("map.error"),
        description: t("map.geolocationNotSupported"),
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
              title: t("map.locationUpdated"), 
              description: address || t("map.coordinatesUpdated")
            });
          });
        } else {
           toast({ title: t("map.locationUpdated"), description: t("map.centeredOnLocation") });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        setIsLocating(false);
        toast({
          title: t("map.locationError"),
          description: t("map.enablePermissions"),
          variant: "destructive"
        });
      }
    );
  };

  if (loadError) {
    return (
      <div className="w-full h-64 rounded-lg border border-border shadow-sm overflow-hidden flex items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">{t("map.errorLoading")}</p>
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
        zoom={15}
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

      {controls && (
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-[10]">
          {!readOnly && (
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm"
              onClick={handleCurrentLocation}
              disabled={isLocating}
              title={t("map.locateMe")}
              type="button"
              data-testid="button-locate-me"
            >
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            </Button>
          )}

          {position && showActions && (
            <>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm"
                onClick={() => openDirections(position.lat, position.lng)}
                title={t("map.getDirections")}
                type="button"
                data-testid="button-get-directions"
              >
                <Navigation className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm"
                    type="button"
                    data-testid="button-map-actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => openGoogleMaps(position.lat, position.lng)} data-testid="menu-open-google-maps">
                    <ExternalLink className="h-4 w-4 me-2" />
                    {t("map.openInGoogleMaps")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openStreetView(position.lat, position.lng)} data-testid="menu-street-view">
                    <MapPin className="h-4 w-4 me-2" />
                    {t("map.streetView")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => shareLocation(position.lat, position.lng, toast, t)} data-testid="menu-share-location">
                    <Share2 className="h-4 w-4 me-2" />
                    {t("map.shareLocation")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyCoordinates(position.lat, position.lng, toast, t)} data-testid="menu-copy-coordinates">
                    <Copy className="h-4 w-4 me-2" />
                    {t("map.copyCoordinates")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          {!isMaximized && !readOnly && (
            <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
              <DialogTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm"
                  title={t("map.maximizeMap")}
                  type="button"
                  data-testid="button-maximize-map"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0 z-[500]">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle>{t("map.selectLocation")}</DialogTitle>
                  <DialogDescription>{t("map.tapToPin")}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 relative">
                  <MapComponent className="h-full rounded-none" controls={false} />
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between z-[10]">
                    {position && (
                      <Button 
                        variant="secondary"
                        className="shadow-lg"
                        onClick={() => openDirections(position.lat, position.lng)}
                        type="button"
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        {t("map.getDirections")}
                      </Button>
                    )}
                    <Button 
                      size="lg" 
                      className="shadow-lg rounded-full"
                      onClick={handleCurrentLocation}
                      type="button"
                    >
                      {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
                      {t("map.locateMe")}
                    </Button>
                  </div>
                </div>
                <div className="p-4 border-t bg-muted/20 flex justify-between items-center gap-4">
                  {position && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openGoogleMaps(position.lat, position.lng)} type="button">
                        <ExternalLink className="h-4 w-4 me-2" />
                        {t("map.openInGoogleMaps")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => shareLocation(position.lat, position.lng, toast, t)} type="button">
                        <Share2 className="h-4 w-4 me-2" />
                        {t("map.share")}
                      </Button>
                    </div>
                  )}
                  <Button onClick={() => setIsMaximized(false)} type="button">{t("map.confirmLocation")}</Button>
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
               {t("map.fetchingAddress")}
            </span>
         </div>
      )}

      {!readOnly && !position && !isLoadingAddress && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/5 z-[10]">
          <span className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {t("map.tapToSetLocation")}
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

export function MapActionButtons({ lat, lng, compact = false }: { lat: number; lng: number; compact?: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();

  if (compact) {
    return (
      <div className="flex gap-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={() => openDirections(lat, lng)}
          title={t("map.getDirections")}
          data-testid="button-directions-compact"
        >
          <Navigation className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={() => openGoogleMaps(lat, lng)}
          title={t("map.openInGoogleMaps")}
          data-testid="button-open-maps-compact"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => openDirections(lat, lng)}
        data-testid="button-get-directions"
      >
        <Navigation className="h-4 w-4 me-2" />
        {t("map.getDirections")}
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => openGoogleMaps(lat, lng)}
        data-testid="button-open-google-maps"
      >
        <ExternalLink className="h-4 w-4 me-2" />
        {t("map.openInGoogleMaps")}
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => shareLocation(lat, lng, toast, t)}
        data-testid="button-share-location"
      >
        <Share2 className="h-4 w-4 me-2" />
        {t("map.share")}
      </Button>
    </div>
  );
}
