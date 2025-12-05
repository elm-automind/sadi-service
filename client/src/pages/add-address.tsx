import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { 
  MapPin, Camera, CheckCircle2, 
  Upload, X
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { PageNavigation } from "@/components/page-navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AddressMap } from "@/components/address-map";
import { VoiceInput } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { processImage, revokePreviewUrl, type ProcessedImage } from "@/lib/image";

// --- Schema ---
const addressSchema = z.object({
  label: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  textAddress: z.string().min(10, "Please provide a detailed address (min 10 chars)"),
});

type AddressData = z.infer<typeof addressSchema>;

interface FileUploadBoxProps {
  label: string;
  icon: any;
  onDrop: (files: File[]) => void;
  processedImage: ProcessedImage | null;
  onRemove: () => void;
  isProcessing?: boolean;
}

const FileUploadBox = ({ label, icon: Icon, onDrop, processedImage, onRemove, isProcessing }: FileUploadBoxProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    accept: {'image/*': []}
  });

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      {processedImage ? (
        <div className="relative rounded-lg overflow-hidden h-24 md:h-32 border-2 border-green-200 bg-green-50/50">
          <img 
            src={processedImage.previewUrl} 
            alt={label}
            className="w-full h-full object-cover"
            data-testid={`preview-${label.toLowerCase().replace(' ', '-')}`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
            data-testid={`remove-${label.toLowerCase().replace(' ', '-')}`}
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center truncate">
            {processedImage.originalName}
          </div>
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
            flex flex-col items-center justify-center gap-2 h-24 md:h-32
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <>
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Compressing...</p>
            </>
          ) : (
            <>
              <div className="p-2 bg-muted rounded-full">
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {isDragActive ? "Drop here" : "Tap to upload"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function AddAddress() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [images, setImages] = useState<{
    building?: ProcessedImage;
    gate?: ProcessedImage;
    door?: ProcessedImage;
  }>({});
  
  // Track images in ref for cleanup on unmount
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  
  const [processing, setProcessing] = useState<{
    building?: boolean;
    gate?: boolean;
    door?: boolean;
  }>({});

  const handleImageUpload = async (type: 'building' | 'gate' | 'door', files: File[]) => {
    if (files.length === 0) return;
    
    setProcessing(p => ({ ...p, [type]: true }));
    try {
      const processed = await processImage(files[0]);
      setImages(p => {
        // Revoke existing preview URL before replacing
        if (p[type]) {
          revokePreviewUrl(p[type]!.previewUrl);
        }
        return { ...p, [type]: processed };
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Image Error",
        description: "Failed to process image. Please try again."
      });
    } finally {
      setProcessing(p => ({ ...p, [type]: false }));
    }
  };

  const handleRemoveImage = (type: 'building' | 'gate' | 'door') => {
    const img = images[type];
    if (img) {
      revokePreviewUrl(img.previewUrl);
      setImages(p => {
        const updated = { ...p };
        delete updated[type];
        return updated;
      });
    }
  };

  useEffect(() => {
    return () => {
      // Use ref to get latest images on unmount
      Object.values(imagesRef.current).forEach(img => {
        if (img) revokePreviewUrl(img.previewUrl);
      });
    };
  }, []);

  const form = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      textAddress: "",
    }
  });

  // Check Auth
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Redirect if not logged in
  if (!isLoading && !user) {
    setLocation("/login");
  }

  const addressMutation = useMutation({
    mutationFn: async (data: AddressData) => {
      const payload = {
        label: data.label,
        lat: data.latitude,
        lng: data.longitude,
        textAddress: data.textAddress,
        photoBuilding: images.building?.dataUri,
        photoGate: images.gate?.dataUri,
        photoDoor: images.door?.dataUri,
      };
      const res = await apiRequest("POST", "/api/addresses", payload);
      return await res.json();
    },
    onSuccess: (data) => {
       toast({
        title: "Address Added!",
        description: `Digital ID ${data.digitalId} created successfully.`,
      });
      // Invalidate user query to refresh dashboard list
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Navigate to view the new address
      setLocation(`/view/${data.digitalId}`);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add address"
      });
    }
  });

  const onSubmit = (data: AddressData) => {
    addressMutation.mutate(data);
  };

  if (isLoading) return <div className="flex justify-center p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-muted/30 p-3 md:p-8 flex justify-center items-start pt-6 md:pt-20 relative">
      <PageNavigation className="absolute top-4 left-4" />

      <Card className="w-full max-w-3xl shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4 md:pb-6">
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold text-primary">Add New Address</CardTitle>
            <CardDescription className="text-xs md:text-sm">Register a new location for your deliveries.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6 md:space-y-8">
              {/* Address Label */}
              <div className="space-y-2">
                <Label htmlFor="label">Address Name</Label>
                <Input 
                  id="label"
                  placeholder="e.g., Home, Office, Parents House..."
                  {...form.register("label")}
                  data-testid="input-address-label"
                />
                <p className="text-xs text-muted-foreground">Give this address a friendly name to identify it easily</p>
              </div>

              {/* Map Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Map Location
                </Label>
                <div className="overflow-hidden border-2 border-muted hover:border-primary/20 transition-colors rounded-lg">
                  <AddressMap 
                    onLocationSelect={(lat, lng, address) => {
                      form.setValue("latitude", lat);
                      form.setValue("longitude", lng);
                      if (address) {
                         form.setValue("textAddress", address);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">Tap on the map to pin your location</p>
              </div>

              {/* Text Address */}
              <div className="space-y-2">
                <Label htmlFor="textAddress">Detailed Address</Label>
                <Controller
                  control={form.control}
                  name="textAddress"
                  render={({ field }) => (
                    <VoiceInput 
                      as="textarea"
                      id="textAddress" 
                      placeholder="Building No., Street Name, District, Landmarks..." 
                      className="resize-none h-24"
                      {...field} 
                    />
                  )}
                />
                {form.formState.errors.textAddress && <p className="text-destructive text-xs">{form.formState.errors.textAddress.message}</p>}
              </div>

              <Separator />

              {/* Photos Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Camera className="w-4 h-4" />
                  Location Photos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <FileUploadBox 
                    label="Building" 
                    icon={Upload} 
                    processedImage={images.building || null}
                    onDrop={(f) => handleImageUpload('building', f)}
                    onRemove={() => handleRemoveImage('building')}
                    isProcessing={processing.building}
                  />
                  <FileUploadBox 
                    label="Main Gate" 
                    icon={Upload} 
                    processedImage={images.gate || null}
                    onDrop={(f) => handleImageUpload('gate', f)}
                    onRemove={() => handleRemoveImage('gate')}
                    isProcessing={processing.gate}
                  />
                  <FileUploadBox 
                    label="Flat Door" 
                    icon={Upload} 
                    processedImage={images.door || null}
                    onDrop={(f) => handleImageUpload('door', f)}
                    onRemove={() => handleRemoveImage('door')}
                    isProcessing={processing.door}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-8 pt-4 border-t border-border/50">
              <Button type="submit" className="w-32 md:w-40 bg-primary hover:bg-primary/90" disabled={addressMutation.isPending}>
                 {addressMutation.isPending ? "Saving..." : "Save Address"} <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
