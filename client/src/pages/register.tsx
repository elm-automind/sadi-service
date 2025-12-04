import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { 
  User, MapPin, Camera, Clock, CheckCircle2, 
  ChevronRight, ChevronLeft, Upload, QrCode, FileText 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressMap } from "@/components/address-map";
import { useToast } from "@/hooks/use-toast";

// --- Schemas ---

const registrationSchema = z.object({
  iqamaId: z.string().min(5, "National ID is required"),
  phone: z.string().min(9, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
  name: z.string().min(2, "Full name is required"),
  // Address
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  textAddress: z.string().min(5, "Address details are required"),
  preferredTime: z.string().optional(),
  specialNote: z.string().optional(),
});

type FormData = z.infer<typeof registrationSchema>;

// --- Components ---

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
          flex flex-col items-center justify-center gap-2 h-32
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'}
          ${file ? 'bg-blue-50/50 border-blue-200' : ''}
        `}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <p className="text-xs font-medium text-foreground truncate max-w-[150px]">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">Click to replace</p>
          </>
        ) : (
          <>
            <div className="p-2 bg-muted rounded-full">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {isDragActive ? "Drop here" : "Tap to upload"}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default function Register() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [files, setFiles] = useState<{
    building?: File;
    gate?: File;
    door?: File;
    qr?: File;
  }>({});

  const form = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      preferredTime: "morning",
    }
  });

  const onSubmit = (data: FormData) => {
    // Simulate API call
    console.log("Submitting:", { ...data, files });
    
    // Save to local storage for demo purposes so the success page can read it
    localStorage.setItem("registrationData", JSON.stringify({
      ...data,
      filePreview: files.building ? URL.createObjectURL(files.building) : null // Just save one preview URL mock
    }));

    toast({
      title: "Registration Successful",
      description: "Your profile has been created.",
    });

    setLocation("/success");
  };

  const nextStep = async () => {
    let valid = false;
    if (step === 1) {
      valid = await form.trigger(["iqamaId", "phone", "email", "name"]);
    } else if (step === 2) {
      valid = await form.trigger(["textAddress"]); // We don't strictly enforce photo uploads in this prototype, but in real app we might
    }
    
    if (valid || step === 2) { // Allow skipping validation on step 2 for easier prototyping if needed, but trigger checks textAddress
      setStep(s => s + 1);
    }
  };

  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8 flex justify-center items-start pt-10 md:pt-20">
      <Card className="w-full max-w-3xl shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-primary">Registration</CardTitle>
              <CardDescription>Complete your profile for secure delivery services.</CardDescription>
            </div>
            <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Step {step} of 3
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-muted mt-6 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            
            {/* STEP 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="name" placeholder="John Doe" className="pl-9" {...form.register("name")} />
                    </div>
                    {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iqamaId">Iqama / National ID</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="iqamaId" placeholder="10XXXXXXXX" className="pl-9" {...form.register("iqamaId")} />
                    </div>
                    {form.formState.errors.iqamaId && <p className="text-destructive text-xs">{form.formState.errors.iqamaId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">+966</span>
                      <Input id="phone" placeholder="5XXXXXXXX" className="pl-12" {...form.register("phone")} />
                    </div>
                    {form.formState.errors.phone && <p className="text-destructive text-xs">{form.formState.errors.phone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="name@example.com" {...form.register("email")} />
                    {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Address & Passport Entity */}
            {step === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 fade-in">
                
                {/* Map Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Map Location
                  </Label>
                  <Card className="overflow-hidden border-2 border-muted hover:border-primary/20 transition-colors">
                    <AddressMap 
                      onLocationSelect={(lat, lng) => {
                        form.setValue("latitude", lat);
                        form.setValue("longitude", lng);
                      }}
                    />
                  </Card>
                  <p className="text-xs text-muted-foreground text-right">Tap on the map to pin your location</p>
                </div>

                {/* Text Address */}
                <div className="space-y-2">
                  <Label htmlFor="textAddress">Detailed Address</Label>
                  <Textarea 
                    id="textAddress" 
                    placeholder="Building No., Street Name, District, Landmarks..." 
                    className="resize-none h-24"
                    {...form.register("textAddress")} 
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FileUploadBox 
                      label="Building" 
                      icon={Upload} 
                      file={files.building || null}
                      onDrop={(f) => setFiles(p => ({...p, building: f[0]}))} 
                    />
                    <FileUploadBox 
                      label="Main Gate" 
                      icon={Upload} 
                      file={files.gate || null}
                      onDrop={(f) => setFiles(p => ({...p, gate: f[0]}))} 
                    />
                    <FileUploadBox 
                      label="Flat Door" 
                      icon={Upload} 
                      file={files.door || null}
                      onDrop={(f) => setFiles(p => ({...p, door: f[0]}))} 
                    />
                    <FileUploadBox 
                      label="QR Code" 
                      icon={QrCode} 
                      file={files.qr || null}
                      onDrop={(f) => setFiles(p => ({...p, qr: f[0]}))} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Preferences & Summary */}
            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Delivery Instructions</h3>
                  
                  <div className="space-y-3">
                    <Label>Preferred Delivery Time</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['Morning (8am - 12pm)', 'Afternoon (1pm - 5pm)', 'Evening (6pm - 9pm)'].map((time) => (
                        <div 
                          key={time}
                          className={`
                            p-3 rounded-lg border-2 text-sm font-medium cursor-pointer transition-all
                            flex items-center justify-center text-center gap-2
                            ${form.watch('preferredTime') === time 
                              ? 'border-primary bg-primary/5 text-primary' 
                              : 'border-muted hover:border-muted-foreground/30'}
                          `}
                          onClick={() => form.setValue('preferredTime', time)}
                        >
                          <Clock className="w-4 h-4" />
                          {time}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialNote">Special Notes</Label>
                    <Textarea 
                      id="specialNote" 
                      placeholder="e.g., Leave at the reception, call before arrival..." 
                      className="h-24"
                      {...form.register("specialNote")} 
                    />
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border/50">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Quick Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span> 
                      <p className="font-medium">{form.getValues("name")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span> 
                      <p className="font-medium">{form.getValues("phone")}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Address:</span> 
                      <p className="font-medium truncate">{form.getValues("textAddress")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
                disabled={step === 1}
                className="w-28"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              
              {step < 3 ? (
                <Button type="button" onClick={nextStep} className="w-28">
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="w-32 bg-primary hover:bg-primary/90">
                  Submit <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
