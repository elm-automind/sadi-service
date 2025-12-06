import { useState, useCallback, useRef } from "react";
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Maximize2, Crosshair, MapPin, Loader2, Navigation, ExternalLink, Share2, Copy, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

interface AddressMapProps {
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  readOnly?: boolean;
  showActions?: boolean;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "Marri-Delivery-App/1.0 (contact@marri.app)",
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
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
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: initialLng || DEFAULT_CENTER.lng,
    latitude: initialLat || DEFAULT_CENTER.lat,
    zoom: 15,
  });

  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    if (readOnly) return;
    
    const newPos = { lat: e.lngLat.lat, lng: e.lngLat.lng };
    setPosition(newPos);
    
    if (onLocationSelect) {
      setIsLoadingAddress(true);
      reverseGeocode(newPos.lat, newPos.lng).then(address => {
        onLocationSelect(newPos.lat, newPos.lng, address || undefined);
        setIsLoadingAddress(false);
      });
    }
  }, [readOnly, onLocationSelect]);

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
        setViewState(prev => ({
          ...prev,
          longitude: newPos.lng,
          latitude: newPos.lat,
        }));
        
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

  const MapComponent = ({ className, controls = true }: { className?: string, controls?: boolean }) => (
    <div className={`relative w-full h-full bg-muted ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={readOnly ? undefined : handleMapClick}
        mapLib={maplibregl}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        interactive={!readOnly}
        dragPan={!readOnly}
        scrollZoom={!readOnly}
        doubleClickZoom={!readOnly}
      >
        <NavigationControl position="bottom-left" />
        
        {position && (
          <Marker
            longitude={position.lng}
            latitude={position.lat}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <MapPin className="h-8 w-8 text-primary fill-primary" />
            </div>
          </Marker>
        )}
      </Map>

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
