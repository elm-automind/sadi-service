import React, { useState } from "react";
import mapImage from "@assets/generated_images/minimalist_map_view_placeholder.png";
import { MapPin } from "lucide-react";

interface AddressMapProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  readOnly?: boolean;
}

export function AddressMap({ onLocationSelect, initialLat, initialLng, readOnly = false }: AddressMapProps) {
  const [pinPosition, setPinPosition] = useState<{ x: number; y: number } | null>(
    initialLat && initialLng ? { x: 50, y: 50 } : null // Mock center if coords exist
  );

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPinPosition({ x, y });
    
    // Mock lat/lng generation based on click
    const lat = 24.7136 + (y - 50) * 0.01;
    const lng = 46.6753 + (x - 50) * 0.01;
    
    if (onLocationSelect) {
      onLocationSelect(lat, lng);
    }
  };

  return (
    <div 
      className={`relative w-full h-64 bg-muted rounded-lg overflow-hidden border border-border group ${!readOnly ? 'cursor-crosshair' : ''}`}
      onClick={handleMapClick}
    >
      <img 
        src={mapImage} 
        alt="Map Location" 
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
      />
      
      {/* Grid Overlay for technical feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {pinPosition && (
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 ease-out"
          style={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}
        >
          <MapPin className="w-8 h-8 text-primary fill-primary/20 drop-shadow-lg animate-in fade-in zoom-in duration-200" />
          <div className="w-2 h-1 bg-black/20 blur-[2px] rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" />
        </div>
      )}
      
      {!readOnly && !pinPosition && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
            Tap to set location
          </span>
        </div>
      )}
    </div>
  );
}
