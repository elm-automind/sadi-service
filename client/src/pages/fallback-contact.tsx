import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { 
  MapPin, Camera, CheckCircle2, ChevronRight, ChevronLeft, 
  Upload, Home, Users, Phone, User as UserIcon, AlertTriangle,
  Calendar, Clock, DollarSign, Info, X, ArrowLeft
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressMap } from "@/components/address-map";
import { VoiceInput } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateDistanceKm, formatDistance } from "@shared/utils";
import { processImage, revokePreviewUrl, type ProcessedImage } from "@/lib/image";
import type { User, Address } from "@shared/schema";

interface UserWithAddresses extends User {
  addresses: Address[];
}

const fallbackSchema = z.object({
  addressId: z.number().min(1, "Please select an address"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(9, "Phone number is required"),
  relationship: z.string().optional(),
  textAddress: z.string().min(5, "Please provide an address or select on the map"),
  latitude: z.number({ required_error: "Please select a location on the map" }),
  longitude: z.number({ required_error: "Please select a location on the map" }),
  specialNote: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTimeSlot: z.string().optional(),
  extraFeeAcknowledged: z.boolean().optional(),
});

type FallbackData = z.infer<typeof fallbackSchema>;

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
        <div className="relative rounded-lg overflow-hidden h-24 border-2 border-green-200 bg-green-50/50">
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
            flex flex-col items-center justify-center gap-2 h-24
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
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Tap to upload</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const MAX_FREE_DISTANCE_KM = 3;
const EXTRA_FEE_AMOUNT = 15;

const TIME_SLOTS = [
  { value: "morning-8-10", label: "Morning (8:00 AM - 10:00 AM)" },
  { value: "morning-10-12", label: "Morning (10:00 AM - 12:00 PM)" },
  { value: "afternoon-12-2", label: "Afternoon (12:00 PM - 2:00 PM)" },
  { value: "afternoon-2-4", label: "Afternoon (2:00 PM - 4:00 PM)" },
  { value: "afternoon-4-6", label: "Afternoon (4:00 PM - 6:00 PM)" },
  { value: "evening-6-8", label: "Evening (6:00 PM - 8:00 PM)" },
  { value: "evening-8-9", label: "Evening (8:00 PM - 9:00 PM)" },
];

export default function FallbackContact() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
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

  const { data: user, isLoading } = useQuery<UserWithAddresses>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const form = useForm<FallbackData>({
    resolver: zodResolver(fallbackSchema),
    defaultValues: {
      name: "",
      phone: "",
      relationship: "",
      textAddress: "",
      specialNote: "",
      scheduledDate: "",
      scheduledTimeSlot: "",
      extraFeeAcknowledged: false,
    }
  });

  const watchedAddressId = form.watch("addressId");
  const watchedLat = form.watch("latitude");
  const watchedLng = form.watch("longitude");
  const watchedExtraFeeAck = form.watch("extraFeeAcknowledged");
  const watchedScheduledDate = form.watch("scheduledDate");
  const watchedScheduledTimeSlot = form.watch("scheduledTimeSlot");

  const primaryAddress = useMemo(() => {
    if (!user?.addresses || !watchedAddressId) return null;
    return user.addresses.find(a => a.id === watchedAddressId);
  }, [user?.addresses, watchedAddressId]);

  const distance = useMemo(() => {
    if (!primaryAddress || !watchedLat || !watchedLng) return null;
    if (!primaryAddress.lat || !primaryAddress.lng) return null;
    return calculateDistanceKm(
      primaryAddress.lat,
      primaryAddress.lng,
      watchedLat,
      watchedLng
    );
  }, [primaryAddress, watchedLat, watchedLng]);

  const isOverMaxDistance = distance !== null && distance > MAX_FREE_DISTANCE_KM;
  const requiresScheduling = isOverMaxDistance;

  const canSubmit = useMemo(() => {
    if (!requiresScheduling) return true;
    return watchedExtraFeeAck && watchedScheduledDate && watchedScheduledTimeSlot;
  }, [requiresScheduling, watchedExtraFeeAck, watchedScheduledDate, watchedScheduledTimeSlot]);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    if (user && user.addresses && user.addresses.length > 0) {
      form.setValue("addressId", user.addresses[user.addresses.length - 1].id);
    }
  }, [user, isLoading]);

  const fallbackMutation = useMutation({
    mutationFn: async (data: FallbackData) => {
      const payload = {
        ...data,
        lat: data.latitude,
        lng: data.longitude,
        distanceKm: distance,
        requiresExtraFee: isOverMaxDistance,
        extraFeeAcknowledged: data.extraFeeAcknowledged,
        scheduledDate: data.scheduledDate,
        scheduledTimeSlot: data.scheduledTimeSlot,
        photoBuilding: images.building?.dataUri,
        photoGate: images.gate?.dataUri,
        photoDoor: images.door?.dataUri,
      };
      const res = await apiRequest("POST", "/api/fallback-contacts", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Fallback Contact Added!",
        description: isOverMaxDistance 
          ? "Your backup contact has been saved with scheduled delivery."
          : "Your backup contact has been saved.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add fallback contact"
      });
    }
  });

  const onSubmit = async (data: FallbackData) => {
    // Ensure location is selected with proper finite number validation
    if (data.latitude === undefined || data.longitude === undefined ||
        !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Please select a location on the map for the fallback contact."
      });
      return;
    }
    
    if (requiresScheduling && !canSubmit) {
      toast({
        variant: "destructive",
        title: "Scheduling Required",
        description: "Please complete the scheduling and acknowledge the extra fee for addresses over 3km."
      });
      return;
    }
    fallbackMutation.mutate(data);
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger(["addressId", "name", "phone"]);
      if (valid) setStep(2);
    }
  };
  
  const validateStep2 = async (): Promise<boolean> => {
    const valid = await form.trigger(["latitude", "longitude", "textAddress"]);
    if (!valid) {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Please select a location on the map for the fallback contact."
      });
      return false;
    }
    return true;
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  if (user.addresses.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Add an Address First</h2>
          <p className="text-muted-foreground mb-4">You need to register at least one address before adding a fallback contact.</p>
          <Link href="/add-address">
            <Button>Add Address</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-3 md:p-8 flex justify-center items-start pt-6 md:pt-12 relative">
      <div className="absolute top-4 left-4 flex gap-2">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="w-4 h-4" /> Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-2xl shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-primary">Add Fallback Contact</CardTitle>
              <CardDescription>Provide an alternative person/location for deliveries</CardDescription>
            </div>
          </div>
          
          <div className="w-full h-1.5 bg-muted mt-4 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all duration-500 ease-out" 
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            
            {/* Step 1: Contact Details */}
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>Select Address This Fallback is For</Label>
                  <Controller
                    control={form.control}
                    name="addressId"
                    render={({ field }) => (
                      <Select 
                        value={field.value?.toString()} 
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <SelectTrigger data-testid="select-address">
                          <SelectValue placeholder="Select an address" />
                        </SelectTrigger>
                        <SelectContent>
                          {user.addresses.map((addr) => (
                            <SelectItem key={addr.id} value={addr.id.toString()}>
                              <span className="font-mono text-xs mr-2">{addr.digitalId}</span>
                              {addr.textAddress.substring(0, 40)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.addressId && (
                    <p className="text-destructive text-xs">{form.formState.errors.addressId.message}</p>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Contact Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="name" 
                        placeholder="Full name" 
                        className="pl-9" 
                        data-testid="input-contact-name"
                        {...form.register("name")} 
                      />
                    </div>
                    {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="phone" 
                        placeholder="+966 5XXXXXXXX" 
                        className="pl-9"
                        data-testid="input-contact-phone" 
                        {...form.register("phone")} 
                      />
                    </div>
                    {form.formState.errors.phone && <p className="text-destructive text-xs">{form.formState.errors.phone.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship (Optional)</Label>
                  <Controller
                    control={form.control}
                    name="relationship"
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-relationship">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="neighbor">Neighbor</SelectItem>
                          <SelectItem value="family">Family Member</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="colleague">Colleague</SelectItem>
                          <SelectItem value="security">Security/Reception</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                {/* Info Banner */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Fallback locations within 3km are free.</p>
                    <p className="text-xs mt-1 opacity-80">Locations beyond 3km require scheduling and an extra fee of SAR {EXTRA_FEE_AMOUNT}.</p>
                  </div>
                </div>

                {/* Map Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    Fallback Location
                  </Label>
                  <div className="overflow-hidden border-2 border-muted hover:border-purple-300 transition-colors rounded-lg">
                    <AddressMap 
                      onLocationSelect={(lat, lng, address) => {
                        form.setValue("latitude", lat);
                        form.setValue("longitude", lng);
                        if (address) form.setValue("textAddress", address);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">Tap on the map to pin the fallback location</p>
                </div>

                {/* Distance Badge */}
                {distance !== null && (
                  <div className={`
                    p-4 rounded-lg border-2 flex items-center gap-3
                    ${isOverMaxDistance 
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' 
                      : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'}
                  `}>
                    <div className={`
                      p-2 rounded-full
                      ${isOverMaxDistance ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}
                    `}>
                      {isOverMaxDistance ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isOverMaxDistance ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
                        Distance: {formatDistance(distance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isOverMaxDistance 
                          ? `Exceeds ${MAX_FREE_DISTANCE_KM}km limit. Extra fee and scheduling required.`
                          : `Within ${MAX_FREE_DISTANCE_KM}km free zone.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Text Address - Auto-filled from map */}
                <div className="space-y-2">
                  <Label htmlFor="textAddress">Address</Label>
                  <Controller
                    control={form.control}
                    name="textAddress"
                    render={({ field }) => (
                      <VoiceInput 
                        as="textarea"
                        id="textAddress" 
                        placeholder="Select a location on the map, or enter manually..." 
                        className="resize-none h-20"
                        data-testid="input-fallback-address"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </div>

                {/* Extra Fee & Scheduling Section - Only shown when over 3km */}
                {isOverMaxDistance && (
                  <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Extra Distance Scheduling
                    </h3>
                    
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Since this location is {formatDistance(distance)} away (over {MAX_FREE_DISTANCE_KM}km), 
                      an extra fee of <strong>SAR {EXTRA_FEE_AMOUNT}</strong> applies and you must schedule the delivery in advance.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" /> Scheduled Date
                        </Label>
                        <Input 
                          id="scheduledDate"
                          type="date"
                          min={getMinDate()}
                          data-testid="input-scheduled-date"
                          {...form.register("scheduledDate")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Time Slot
                        </Label>
                        <Controller
                          control={form.control}
                          name="scheduledTimeSlot"
                          render={({ field }) => (
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-time-slot">
                                <SelectValue placeholder="Select time slot" />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_SLOTS.map((slot) => (
                                  <SelectItem key={slot.value} value={slot.value}>
                                    {slot.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
                      <Controller
                        control={form.control}
                        name="extraFeeAcknowledged"
                        render={({ field }) => (
                          <Checkbox
                            id="extraFeeAcknowledged"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-extra-fee"
                          />
                        )}
                      />
                      <label htmlFor="extraFeeAcknowledged" className="text-sm leading-tight cursor-pointer">
                        I understand and agree to pay the extra delivery fee of <strong>SAR {EXTRA_FEE_AMOUNT}</strong> for 
                        this fallback location that exceeds the {MAX_FREE_DISTANCE_KM}km free zone.
                      </label>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Photos Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-600">
                    <Camera className="w-4 h-4" />
                    Location Photos (Optional)
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <FileUploadBox 
                      label="Building" 
                      icon={Upload} 
                      processedImage={images.building || null}
                      onDrop={(f) => handleImageUpload('building', f)}
                      onRemove={() => handleRemoveImage('building')}
                      isProcessing={processing.building}
                    />
                    <FileUploadBox 
                      label="Gate" 
                      icon={Upload} 
                      processedImage={images.gate || null}
                      onDrop={(f) => handleImageUpload('gate', f)}
                      onRemove={() => handleRemoveImage('gate')}
                      isProcessing={processing.gate}
                    />
                    <FileUploadBox 
                      label="Door" 
                      icon={Upload} 
                      processedImage={images.door || null}
                      onDrop={(f) => handleImageUpload('door', f)}
                      onRemove={() => handleRemoveImage('door')}
                      isProcessing={processing.door}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialNote">Special Notes (Optional)</Label>
                  <Controller
                    control={form.control}
                    name="specialNote"
                    render={({ field }) => (
                      <VoiceInput 
                        as="textarea"
                        id="specialNote" 
                        placeholder="Any special instructions for this fallback..." 
                        className="resize-none h-20"
                        data-testid="input-special-note"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div />
              )}
              
              {step < 2 ? (
                <Button type="button" onClick={nextStep} data-testid="button-next">
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className={`${isOverMaxDistance ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                  disabled={fallbackMutation.isPending || (requiresScheduling && !canSubmit)}
                  data-testid="button-submit"
                >
                  {fallbackMutation.isPending ? "Saving..." : (
                    isOverMaxDistance ? "Schedule & Save" : "Save Contact"
                  )} <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
