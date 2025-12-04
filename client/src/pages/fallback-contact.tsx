import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { 
  MapPin, Camera, CheckCircle2, ChevronRight, ChevronLeft, 
  Upload, Home, Users, Phone, User as UserIcon
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressMap } from "@/components/address-map";
import { VoiceInput } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, Address } from "@shared/schema";

interface UserWithAddresses extends User {
  addresses: Address[];
}

const fallbackSchema = z.object({
  addressId: z.number().min(1, "Please select an address"),
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(9, "Phone number is required"),
  relationship: z.string().optional(),
  textAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  specialNote: z.string().optional(),
});

type FallbackData = z.infer<typeof fallbackSchema>;

const FileUploadBox = ({ label, icon: Icon, onDrop, file }: { label: string, icon: any, onDrop: (files: File[]) => void, file: File | null }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    accept: {'image/*': []}
  });

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
          flex flex-col items-center justify-center gap-2 h-24
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'}
          ${file ? 'bg-purple-50/50 border-purple-200' : ''}
        `}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <p className="text-xs font-medium truncate max-w-[100px]">{file.name}</p>
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
    </div>
  );
};

export default function FallbackContact() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [files, setFiles] = useState<{building?: File; gate?: File; door?: File;}>({});

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
      specialNote: ""
    }
  });

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
        photoBuilding: files.building?.name,
        photoGate: files.gate?.name,
        photoDoor: files.door?.name,
      };
      const res = await apiRequest("POST", "/api/fallback-contacts", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Fallback Contact Added!",
        description: "Your backup contact has been saved.",
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

  const onSubmit = (data: FallbackData) => {
    fallbackMutation.mutate(data);
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger(["addressId", "name", "phone"]);
      if (valid) setStep(2);
    }
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
    <div className="min-h-screen bg-muted/30 p-3 md:p-8 flex justify-center items-start pt-6 md:pt-20 relative">
      <div className="absolute top-4 left-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="w-4 h-4" /> Dashboard
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
                        <SelectTrigger>
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
                      <Input id="name" placeholder="Full name" className="pl-9" {...form.register("name")} />
                    </div>
                    {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" placeholder="+966 5XXXXXXXX" className="pl-9" {...form.register("phone")} />
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
                        <SelectTrigger>
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

            {/* Step 2: Location (Optional) */}
            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  Location details are optional. Fill them in if the fallback contact has a different address.
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    Map Location (Optional)
                  </Label>
                  <div className="overflow-hidden border-2 border-muted rounded-lg">
                    <AddressMap 
                      onLocationSelect={(lat, lng, address) => {
                        form.setValue("latitude", lat);
                        form.setValue("longitude", lng);
                        if (address) form.setValue("textAddress", address);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textAddress">Address (Optional)</Label>
                  <Controller
                    control={form.control}
                    name="textAddress"
                    render={({ field }) => (
                      <VoiceInput 
                        as="textarea"
                        id="textAddress" 
                        placeholder="Building, Street, District..." 
                        className="resize-none h-20"
                        {...field}
                        value={field.value || ""}
                      />
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-600">
                    <Camera className="w-4 h-4" />
                    Location Photos (Optional)
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <FileUploadBox 
                      label="Building" 
                      icon={Upload} 
                      file={files.building || null}
                      onDrop={(f) => setFiles(p => ({...p, building: f[0]}))} 
                    />
                    <FileUploadBox 
                      label="Gate" 
                      icon={Upload} 
                      file={files.gate || null}
                      onDrop={(f) => setFiles(p => ({...p, gate: f[0]}))} 
                    />
                    <FileUploadBox 
                      label="Door" 
                      icon={Upload} 
                      file={files.door || null}
                      onDrop={(f) => setFiles(p => ({...p, door: f[0]}))} 
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
                <Button type="button" onClick={nextStep}>
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={fallbackMutation.isPending}>
                  {fallbackMutation.isPending ? "Saving..." : "Save Contact"} <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
