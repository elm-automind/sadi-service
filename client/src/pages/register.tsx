import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { 
  User, MapPin, Camera, Clock, CheckCircle2, 
  ChevronRight, ChevronLeft, Upload, FileText, Lock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AddressMap } from "@/components/address-map";
import { VoiceInput } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";

// --- Schemas ---

const registrationSchema = z.object({
  iqamaId: z.string()
    .min(10, "National ID must be at least 10 digits")
    .max(10, "National ID must be 10 digits")
    .regex(/^\d+$/, "National ID must contain only numbers"),
  phone: z.string()
    .min(9, "Phone number is too short")
    .max(14, "Phone number is too long")
    .regex(/^\+?[\d\s]+$/, "Invalid phone number format"),
  email: z.string().email("Valid email is required"),
  name: z.string().min(2, "Full name is required"),
  // Optional for quick reg
  password: z.string().optional(),
  
  // Address (optional if quick reg)
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  textAddress: z.string().optional(),
  preferredTime: z.string().optional(),
  specialNote: z.string().optional(),
}).refine((data) => {
  // If password is provided (quick reg), ensure it meets criteria
  if (data.password && data.password.length < 6) return false;
  return true;
}, {
  message: "Password must be at least 6 characters",
  path: ["password"]
});

type FormData = z.infer<typeof registrationSchema>;

// --- Utilities ---

const generateDigitalId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

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
          flex flex-col items-center justify-center gap-2 h-24 md:h-32
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50'}
          ${file ? 'bg-blue-50/50 border-blue-200' : ''}
        `}
      >
        <input {...getInputProps()} />
        {file ? (
          <>
            <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
            <p className="text-xs font-medium text-foreground truncate max-w-[120px] md:max-w-[150px]">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">Click to replace</p>
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
    </div>
  );
};

export default function Register() {
  const [step, setStep] = useState(1);
  const [regType, setRegType] = useState<"quick" | "full">("full"); // Default to full
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [files, setFiles] = useState<{
    building?: File;
    gate?: File;
    door?: File;
  }>({});

  const form = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      preferredTime: "morning",
      textAddress: "",
      name: "",
      iqamaId: "",
      phone: "",
      email: "",
      specialNote: "",
      password: ""
    }
  });

  // Load draft from memory
  useEffect(() => {
    const savedDraft = localStorage.getItem("registrationDraft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        form.reset(parsed);
        // Simple heuristic: if password was drafted, maybe it was quick reg
        if (parsed.password) setRegType("quick");
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  const onSubmit = (data: FormData) => {
    // Common save logic
    const digitalId = generateDigitalId();
    const usersDb = JSON.parse(localStorage.getItem("usersDb") || "{}");
    
    // If quick reg, we create user with password but maybe no address yet
    // If full reg, we add address + update user
    
    let userData = usersDb[data.iqamaId] || {
      iqamaId: data.iqamaId,
      personalInfo: {
        name: data.name,
        phone: data.phone,
        email: data.email
      },
      addresses: [],
      password: data.password // Only relevant for quick reg primarily
    };
    
    // If this is a full reg, add the address
    let newAddressEntry = null;
    if (regType === "full" || (data.textAddress && data.textAddress.length > 0)) {
       newAddressEntry = {
        id: digitalId,
        textAddress: data.textAddress || "Quick Addr",
        location: { lat: data.latitude || 0, lng: data.longitude || 0 },
        photos: {
          building: files.building ? files.building.name : null,
          mainGate: files.gate ? files.gate.name : null,
          flatDoor: files.door ? files.door.name : null,
        },
        instructions: {
          preferredTime: data.preferredTime,
          note: data.specialNote
        },
        timestamp: new Date().toISOString()
      };
      userData.addresses.push(newAddressEntry);
    }

    // Save User
    usersDb[data.iqamaId] = userData;
    localStorage.setItem("usersDb", JSON.stringify(usersDb));
    localStorage.removeItem("registrationDraft");

    if (regType === "quick") {
      toast({
        title: "Account Created!",
        description: "You can now login with your ID/Email and Password.",
      });
      setLocation("/login");
    } else {
      // Full flow -> Success page
      const fileData = {
        building: files.building ? URL.createObjectURL(files.building) : null,
        gate: files.gate ? URL.createObjectURL(files.gate) : null,
        door: files.door ? URL.createObjectURL(files.door) : null,
      };

      localStorage.setItem("currentSessionData", JSON.stringify({
        digitalId,
        user: userData,
        currentAddress: newAddressEntry,
        previews: fileData
      }));

      toast({
        title: "Address Registered!",
        description: `Digital ID ${digitalId} created successfully.`,
      });
      setLocation("/success");
    }
  };

  const nextStep = async () => {
    let valid = false;
    
    if (step === 1) {
      // Validate personal info first
      valid = await form.trigger(["iqamaId", "phone", "email", "name"]);
      
      if (valid) {
        if (regType === "quick") {
          // If quick, we need to validate password before "submitting" (which is effectively what Next does here)
          // Actually, for Quick Reg, step 1 IS the only step. So the button should be "Submit" not "Next".
          // We'll handle that in the render logic.
        } else {
          // Full flow -> Go to address step
          setStep(2);
        }
      }
    } else if (step === 2) {
      valid = await form.trigger(["textAddress"]); 
      if (valid) setStep(3);
    }
  };

  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="min-h-screen bg-muted/30 p-3 md:p-8 flex justify-center items-start pt-6 md:pt-20">
      <Card className="w-full max-w-3xl shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold text-primary">Registration</CardTitle>
              <CardDescription className="text-xs md:text-sm">Complete your profile for secure delivery services.</CardDescription>
            </div>
            {regType === "full" && (
              <div className="text-xs md:text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full w-fit">
                Step {step} of 3
              </div>
            )}
          </div>
          
          {/* Progress Bar for Full Flow */}
          {regType === "full" && (
            <div className="w-full h-1.5 bg-muted mt-4 md:mt-6 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out" 
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            
            {/* STEP 1: Personal Information & Reg Type Selection */}
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                
                {/* Registration Type Toggle */}
                <div className="bg-muted/50 p-1 rounded-lg flex mb-6">
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${regType === "full" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setRegType("full")}
                  >
                    Full Registration (Address)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${regType === "quick" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setRegType("quick")}
                  >
                    Quick Registration (Account)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <Controller
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <VoiceInput 
                            id="name" 
                            placeholder="John Doe" 
                            className="pl-9" 
                            {...field} 
                          />
                        )}
                      />
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iqamaId">Iqama / National ID</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
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
                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                           <VoiceInput 
                           id="email" 
                           type="email" 
                           placeholder="name@example.com" 
                           {...field} 
                           />
                        )}
                     />
                    {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>}
                  </div>

                  {/* Password Field - Only for Quick Reg */}
                  {regType === "quick" && (
                    <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="password">Create Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password" 
                          type="password" 
                          placeholder="Create a secure password" 
                          className="pl-9" 
                          {...form.register("password")} 
                        />
                      </div>
                      {form.formState.errors.password && <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>}
                      <p className="text-xs text-muted-foreground">Required for logging in later.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Address & Passport Entity */}
            {step === 2 && regType === "full" && (
              <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300 fade-in">
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
                  {/* Adjusted grid for better responsiveness */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Preferences & Summary */}
            {step === 3 && regType === "full" && (
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
                          {time.split(' (')[0]} <span className="hidden md:inline text-xs text-muted-foreground">({time.split(' (')[1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialNote">Special Notes</Label>
                    <Controller
                      control={form.control}
                      name="specialNote"
                      render={({ field }) => (
                        <VoiceInput 
                          as="textarea"
                          id="specialNote" 
                          placeholder="e.g., Leave at the reception, call before arrival..." 
                          className="h-24"
                          {...field} 
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border/50">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Quick Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span> 
                      <span className="ml-2 font-medium">{form.getValues("name")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span> 
                      <span className="ml-2 font-medium">{form.getValues("phone")}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground block md:inline">Address:</span> 
                      <p className="font-medium truncate mt-1 md:mt-0">{form.getValues("textAddress")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
              {step > 1 && regType === "full" ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  className="w-24 md:w-28"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div /> // Spacer
              )}
              
              {regType === "full" && step < 3 ? (
                <Button type="button" onClick={nextStep} className="w-24 md:w-28">
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="w-32 md:w-40 bg-primary hover:bg-primary/90">
                  {regType === "quick" ? "Create Account" : "Submit"} <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
