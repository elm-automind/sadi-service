import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { useDropzone } from "react-dropzone";
import { 
  User, MapPin, Camera, Clock, CheckCircle2, 
  ChevronRight, ChevronLeft, Upload, FileText, Lock, LogIn, ArrowLeft, X, Truck, Package
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { processImage, revokePreviewUrl, type ProcessedImage } from "@/lib/image";

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
import { LanguageSwitcher } from "@/components/language-switcher";

const registrationSchema = z.object({
  iqamaId: z.string()
    .min(10, "National ID must be at least 10 digits")
    .max(10, "National ID must be 10 digits")
    .regex(/^\d+$/, "National ID must contain only numbers"),
  phone: z.string()
    .regex(/^5\d{8}$/, "Enter 9 digits starting with 5 (e.g., 512345678)"),
  email: z.string().email("Valid email is required"),
  name: z.string().min(2, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  addressLabel: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  textAddress: z.string().optional(),
  preferredTime: z.string().optional(),
  specialNote: z.string().optional(),
});

type FormData = z.infer<typeof registrationSchema>;

interface FileUploadBoxProps {
  label: string;
  icon: any;
  onDrop: (files: File[]) => void;
  processedImage: ProcessedImage | null;
  onRemove: () => void;
  isProcessing?: boolean;
  t: (key: string) => string;
}

const FileUploadBox = ({ label, icon: Icon, onDrop, processedImage, onRemove, isProcessing, t }: FileUploadBoxProps) => {
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
            className="absolute top-1 end-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
            data-testid={`remove-${label.toLowerCase().replace(' ', '-')}`}
          >
            <X className="w-3 h-3" />
          </button>
          <div {...getRootProps()} className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center cursor-pointer hover:bg-black/70">
            <input {...getInputProps()} />
            {t('common.clickToReplace')}
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
              <p className="text-xs text-muted-foreground">{t('common.compressing')}</p>
            </>
          ) : (
            <>
              <div className="p-2 bg-muted rounded-full">
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {isDragActive ? t('common.dropHere') : t('common.tapToUpload')}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function Register() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [regType, setRegType] = useState<"quick" | "full">("full"); 
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [images, setImages] = useState<{
    building?: ProcessedImage;
    gate?: ProcessedImage;
    door?: ProcessedImage;
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
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('register.imageError'),
        description: t('register.imageProcessingFailed')
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
      Object.values(imagesRef.current).forEach(img => {
        if (img) revokePreviewUrl(img.previewUrl);
      });
    };
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      preferredTime: "morning",
      addressLabel: "",
      textAddress: "",
      name: "",
      iqamaId: "",
      phone: "",
      email: "",
      specialNote: "",
      password: ""
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        phone: `+966${data.phone}`,
        label: data.addressLabel,
        lat: data.latitude,
        lng: data.longitude,
        photoBuilding: images.building?.dataUri,
        photoGate: images.gate?.dataUri,
        photoDoor: images.door?.dataUri,
      };

      const res = await apiRequest("POST", "/api/register", payload);
      return await res.json();
    },
    onSuccess: async (data) => {
      await queryClient.resetQueries({ queryKey: ["/api/user"] });
      localStorage.setItem("lastRegisteredUser", JSON.stringify(data));
      
      if (data.address) {
        toast({
          title: t('register.addressRegistered'),
          description: t('register.accountAndAddressCreated'),
        });
        setLocation("/success");
      } else {
        toast({
          title: t('register.accountCreated'),
          description: t('register.accountCreatedRedirecting'),
        });
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('register.registrationFailed'),
        description: error.message || t('errors.somethingWentWrong')
      });
    }
  });

  const onSubmit = (data: FormData) => {
    if (regType === "full" && (!data.textAddress || data.textAddress.length < 10)) {
       return;
    }
    registerMutation.mutate(data);
  };

  const handleQuickRegister = async () => {
    setRegType("quick");
    const valid = await form.trigger(["iqamaId", "phone", "email", "name", "password"]);
    if (valid) {
      form.handleSubmit(onSubmit)();
    }
  };

  const handleFullRegistration = async () => {
    setRegType("full");
    let valid = false;
    
    if (step === 1) {
      valid = await form.trigger(["iqamaId", "phone", "email", "name", "password"]);
      if (valid) setStep(2);
    } else if (step === 2) {
      const address = form.getValues("textAddress");
      if (!address || address.length < 10) {
        form.setError("textAddress", { 
          type: "manual", 
          message: t('register.addressValidationError')
        });
        return;
      }
      valid = await form.trigger(["textAddress"]); 
      if (valid) setStep(3);
    }
  };

  const prevStep = () => setStep(s => s - 1);

  const timeOptions = [
    { key: 'morning', label: t('register.morning'), time: '8am - 12pm' },
    { key: 'afternoon', label: t('register.afternoon'), time: '1pm - 5pm' },
    { key: 'evening', label: t('register.evening'), time: '6pm - 9pm' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 md:p-8 flex justify-center items-start pt-6 md:pt-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[5%] w-[400px] h-[400px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[25%] left-[3%] text-primary/5 float-animation">
          <Truck className="w-14 h-14" />
        </div>
        <div className="absolute bottom-[20%] right-[3%] text-primary/5 float-animation" style={{ animationDelay: '2s' }}>
          <Package className="w-10 h-10" />
        </div>
      </div>
      
      <PageNavigation className="absolute top-4 start-4 z-10" />

      <div className="absolute top-4 end-4 flex gap-2 z-10">
        <LanguageSwitcher />
        <Link href="/register-type">
           <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-to-type">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back')}</span>
           </Button>
        </Link>
        <Link href="/login">
           <Button variant="ghost" size="sm" className="gap-2 text-primary">
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">{t('auth.login')}</span>
           </Button>
        </Link>
      </div>

      <Card className="w-full max-w-3xl shadow-xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm relative z-10">
        <CardHeader className="border-b border-border/40 pb-4 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl icon-container-blue text-white shadow-lg shadow-blue-500/20">
                <User className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 dark:from-white dark:to-blue-200 bg-clip-text text-transparent">{t('register.title')}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('register.subtitle')}</CardDescription>
              </div>
            </div>
            {step > 1 && (
              <div className="text-xs md:text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full w-fit">
                {t('common.step')} {step} {t('common.of')} 3
              </div>
            )}
          </div>
          
          {step > 1 && (
            <div className="w-full h-1.5 bg-muted mt-4 md:mt-6 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out" 
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <form onSubmit={(e) => e.preventDefault()}> 
            
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('register.fullName')}</Label>
                    <div className="relative">
                      <Controller
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <VoiceInput 
                            id="name" 
                            placeholder="John Doe" 
                            className="ps-9" 
                            {...field} 
                          />
                        )}
                      />
                      <User className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iqamaId">{t('register.iqamaNationalId')}</Label>
                    <div className="relative">
                      <FileText className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input id="iqamaId" placeholder="10XXXXXXXX" className="ps-9" {...form.register("iqamaId")} />
                    </div>
                    {form.formState.errors.iqamaId && <p className="text-destructive text-xs">{form.formState.errors.iqamaId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('register.phoneNumber')}</Label>
                    <div className="relative">
                      <span className="absolute start-3 top-2.5 text-xs font-bold text-muted-foreground">+966</span>
                      <Input id="phone" placeholder="5XXXXXXXX" className="ps-12" {...form.register("phone")} />
                    </div>
                    {form.formState.errors.phone && <p className="text-destructive text-xs">{form.formState.errors.phone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('register.emailAddress')}</Label>
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

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="password">{t('register.createPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="ps-9" 
                        {...form.register("password")} 
                      />
                    </div>
                    {form.formState.errors.password && <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>}
                    <p className="text-xs text-muted-foreground">{t('register.passwordRequired')}</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300 fade-in">
                <div className="space-y-2">
                  <Label htmlFor="addressLabel">{t('register.addressName')}</Label>
                  <Input 
                    id="addressLabel"
                    placeholder={t('register.addressNamePlaceholder')}
                    {...form.register("addressLabel")}
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
                      onLocationSelect={(lat, lng, address) => {
                        form.setValue("latitude", lat);
                        form.setValue("longitude", lng);
                        if (address) {
                           form.setValue("textAddress", address);
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-end">{t('register.tapToPin')}</p>
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
                      onDrop={(f) => handleImageUpload('building', f)}
                      onRemove={() => handleRemoveImage('building')}
                      isProcessing={processing.building}
                      t={t}
                    />
                    <FileUploadBox 
                      label={t('register.mainGate')}
                      icon={Upload} 
                      processedImage={images.gate || null}
                      onDrop={(f) => handleImageUpload('gate', f)}
                      onRemove={() => handleRemoveImage('gate')}
                      isProcessing={processing.gate}
                      t={t}
                    />
                    <FileUploadBox 
                      label={t('register.flatDoor')}
                      icon={Upload} 
                      processedImage={images.door || null}
                      onDrop={(f) => handleImageUpload('door', f)}
                      onRemove={() => handleRemoveImage('door')}
                      isProcessing={processing.door}
                      t={t}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">{t('register.deliveryInstructions')}</h3>
                  
                  <div className="space-y-3">
                    <Label>{t('register.preferredDeliveryTime')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {timeOptions.map((option) => (
                        <div 
                          key={option.key}
                          className={`
                            p-3 rounded-lg border-2 text-sm font-medium cursor-pointer transition-all
                            flex items-center justify-center text-center gap-2
                            ${form.watch('preferredTime') === option.key 
                              ? 'border-primary bg-primary/5 text-primary' 
                              : 'border-muted hover:border-muted-foreground/30'}
                          `}
                          onClick={() => form.setValue('preferredTime', option.key)}
                        >
                          <Clock className="w-4 h-4" />
                          {option.label} <span className="hidden md:inline text-xs text-muted-foreground">({option.time})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialNote">{t('register.specialNotes')}</Label>
                    <Controller
                      control={form.control}
                      name="specialNote"
                      render={({ field }) => (
                        <VoiceInput 
                          as="textarea"
                          id="specialNote" 
                          placeholder={t('register.specialNotesPlaceholder')}
                          className="h-24"
                          {...field} 
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 border border-border/50">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{t('common.quickSummary')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('common.name')}:</span> 
                      <span className="ms-2 font-medium">{form.getValues("name")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('common.phone')}:</span> 
                      <span className="ms-2 font-medium">{form.getValues("phone")}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground block md:inline">{t('common.address')}:</span> 
                      <span className="ms-2 font-medium text-xs">{form.getValues("textAddress")?.slice(0, 100)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator className="my-6" />

            <div className="flex flex-col gap-3">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="gap-2"
                      onClick={handleQuickRegister}
                      disabled={registerMutation.isPending}
                      data-testid="button-quick-register"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t('register.quickRegister')}
                    </Button>
                    <Button 
                      type="button" 
                      className="gap-2"
                      onClick={handleFullRegistration}
                      disabled={registerMutation.isPending}
                      data-testid="button-next-step"
                    >
                      {t('register.registerWithAddress')}
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </Button>
                  </div>
                  {registerMutation.isPending && (
                    <p className="text-sm text-muted-foreground text-center">{t('common.registering')}</p>
                  )}
                </>
              )}

              {step === 2 && (
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    {t('common.back')}
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1 gap-2"
                    onClick={handleFullRegistration}
                    data-testid="button-continue-step-2"
                  >
                    {t('common.next')}
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    {t('common.back')}
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 gap-2"
                    disabled={registerMutation.isPending}
                    onClick={() => {
                      setRegType("full");
                      form.handleSubmit(onSubmit)();
                    }}
                    data-testid="button-complete-registration"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t('common.registering')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {t('register.completeRegistration')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
