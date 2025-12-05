import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { 
  MapPin, Camera, CheckCircle2, 
  Upload, X, Loader2
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
  existingUrl?: string | null;
  onRemove: () => void;
  isProcessing?: boolean;
}

const FileUploadBox = ({ label, icon: Icon, onDrop, processedImage, existingUrl, onRemove, isProcessing }: FileUploadBoxProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    accept: {'image/*': []}
  });

  const displayUrl = processedImage?.previewUrl || existingUrl;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      {displayUrl ? (
        <div className="relative rounded-lg overflow-hidden h-24 md:h-32 border-2 border-green-200 bg-green-50/50">
          <img 
            src={displayUrl} 
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
          <div {...getRootProps()} className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center cursor-pointer hover:bg-black/70">
            <input {...getInputProps()} />
            Click to replace
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

export default function EditAddress() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const addressId = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [images, setImages] = useState<{
    building?: ProcessedImage;
    gate?: ProcessedImage;
    door?: ProcessedImage;
  }>({});

  const [existingImages, setExistingImages] = useState<{
    building?: string | null;
    gate?: string | null;
    door?: string | null;
  }>({});

  const [removedImages, setRemovedImages] = useState<{
    building?: boolean;
    gate?: boolean;
    door?: boolean;
  }>({});
  
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  
  const [processing, setProcessing] = useState<{
    building?: boolean;
    gate?: boolean;
    door?: boolean;
  }>({});

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const address = user?.addresses?.find((a: any) => a.id === addressId);

  const form = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      textAddress: "",
    }
  });

  useEffect(() => {
    if (address) {
      form.reset({
        label: address.label || "",
        latitude: address.lat,
        longitude: address.lng,
        textAddress: address.textAddress,
      });
      setExistingImages({
        building: address.photoBuilding,
        gate: address.photoGate,
        door: address.photoDoor,
      });
    }
  }, [address, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/login");
    }
  }, [user, userLoading, setLocation]);

  const handleImageUpload = async (type: 'building' | 'gate' | 'door', files: File[]) => {
    if (files.length === 0) return;
    
    setProcessing(p => ({ ...p, [type]: true }));
    try {
      const processed = await processImage(files[0]);
      setImages(p => {
        if (p[type]) {
          revokePreviewUrl(p[type]!.previewUrl);
        }
        return { ...p, [type]: processed };
      });
      setRemovedImages(p => ({ ...p, [type]: false }));
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
    setExistingImages(p => ({ ...p, [type]: null }));
    setRemovedImages(p => ({ ...p, [type]: true }));
  };

  useEffect(() => {
    return () => {
      Object.values(imagesRef.current).forEach(img => {
        if (img) revokePreviewUrl(img.previewUrl);
      });
    };
  }, []);

  const updateMutation = useMutation({
    mutationFn: async (data: AddressData) => {
      const payload: any = {
        label: data.label,
        lat: data.latitude,
        lng: data.longitude,
        textAddress: data.textAddress,
      };

      if (images.building) payload.photoBuilding = images.building.dataUri;
      else if (removedImages.building) payload.photoBuilding = null;

      if (images.gate) payload.photoGate = images.gate.dataUri;
      else if (removedImages.gate) payload.photoGate = null;

      if (images.door) payload.photoDoor = images.door.dataUri;
      else if (removedImages.door) payload.photoDoor = null;

      const res = await apiRequest("PATCH", `/api/addresses/${addressId}`, payload);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('address.addressAdded'),
        description: t('common.success'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message || t('errors.somethingWentWrong')
      });
    }
  });

  const onSubmit = (data: AddressData) => {
    updateMutation.mutate(data);
  };

  if (userLoading) return <div className="flex justify-center p-8">{t('common.loading')}</div>;
  if (!address) return <div className="flex justify-center p-8">{t('viewAddress.addressNotFound')}</div>;

  return (
    <div className="min-h-screen bg-muted/30 p-3 md:p-8 flex justify-center items-start pt-6 md:pt-20 relative">
      <PageNavigation className="absolute top-4 left-4" />

      <Card className="w-full max-w-3xl shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4 md:pb-6">
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold text-primary">{t('address.editAddress')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('address.registerNewLocation')}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6 md:space-y-8">
              <div className="space-y-2">
                <Label htmlFor="label">{t('register.addressName')}</Label>
                <Input 
                  id="label"
                  placeholder={t('register.addressNamePlaceholder')}
                  {...form.register("label")}
                  data-testid="input-address-label"
                />
                <p className="text-xs text-muted-foreground">{t('register.addressNameHint')}</p>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {t('register.mapLocation')}
                </Label>
                <div className="overflow-hidden border-2 border-muted hover:border-primary/20 transition-colors rounded-lg">
                  <AddressMap 
                    initialLat={address.lat}
                    initialLng={address.lng}
                    onLocationSelect={(lat, lng, addr) => {
                      form.setValue("latitude", lat);
                      form.setValue("longitude", lng);
                      if (addr) {
                        form.setValue("textAddress", addr);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">{t('register.tapToPin')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="textAddress">{t('register.detailedAddress')}</Label>
                <Controller
                  control={form.control}
                  name="textAddress"
                  render={({ field }) => (
                    <VoiceInput 
                      as="textarea"
                      id="textAddress" 
                      placeholder={t('register.addressPlaceholder')}
                      className="resize-none h-24"
                      {...field} 
                    />
                  )}
                />
                {form.formState.errors.textAddress && <p className="text-destructive text-xs">{form.formState.errors.textAddress.message}</p>}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Camera className="w-4 h-4" />
                  {t('register.locationPhotos')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <FileUploadBox 
                    label={t('register.building')}
                    icon={Upload} 
                    processedImage={images.building || null}
                    existingUrl={existingImages.building}
                    onDrop={(f) => handleImageUpload('building', f)}
                    onRemove={() => handleRemoveImage('building')}
                    isProcessing={processing.building}
                  />
                  <FileUploadBox 
                    label={t('register.mainGate')}
                    icon={Upload} 
                    processedImage={images.gate || null}
                    existingUrl={existingImages.gate}
                    onDrop={(f) => handleImageUpload('gate', f)}
                    onRemove={() => handleRemoveImage('gate')}
                    isProcessing={processing.gate}
                  />
                  <FileUploadBox 
                    label={t('register.flatDoor')}
                    icon={Upload} 
                    processedImage={images.door || null}
                    existingUrl={existingImages.door}
                    onDrop={(f) => handleImageUpload('door', f)}
                    onRemove={() => handleRemoveImage('door')}
                    isProcessing={processing.door}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateMutation.isPending}
                data-testid="btn-save-address"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
