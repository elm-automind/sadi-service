import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Package, User, Smartphone, Globe, MapPin, AlertCircle, Phone, Clock, FileText, Image, Building2, DoorOpen, Home, AlertTriangle, Navigation, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddressMap } from "@/components/address-map";

const captureSchema = z.object({
  shipmentNumber: z.string().min(1, "Shipment number is required"),
  driverId: z.string().min(1, "Driver ID is required"),
});

type CaptureFormValues = z.infer<typeof captureSchema>;

interface DeviceInfo {
  platform: string;
  browser: string;
  isMobile: boolean;
  language: string;
  screenSize: string;
  userAgent: string;
}

interface AddressResult {
  lookupId: number;
  address: any;
  user: {
    name: string;
    phone: string;
    email: string;
  };
  fallbackContacts: any[];
}

function detectDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let platform = navigator.platform || "Unknown";
  
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edge")) browser = "Edge";
  
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  return {
    platform,
    browser,
    isMobile,
    language: navigator.language || "en",
    screenSize: `${window.screen.width}x${window.screen.height}`,
    userAgent: ua.substring(0, 100),
  };
}

function detectCompanyFromContext(): string {
  const referrer = document.referrer;
  const urlParams = new URLSearchParams(window.location.search);
  
  const companyParam = urlParams.get("company") || urlParams.get("c");
  if (companyParam) return companyParam;
  
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      const host = refUrl.hostname.replace("www.", "");
      if (host && host !== window.location.hostname) {
        return host.split(".")[0];
      }
    } catch {}
  }
  
  const savedCompany = localStorage.getItem("driver_company");
  if (savedCompany) return savedCompany;
  
  return "";
}

function detectDriverIdFromContext(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const driverParam = urlParams.get("driver") || urlParams.get("d");
  if (driverParam) return driverParam;
  
  const savedDriverId = localStorage.getItem("driver_id");
  if (savedDriverId) return savedDriverId;
  
  return "";
}

export default function AddressCapture() {
  const params = useParams();
  const digitalId = params.digitalId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [addressData, setAddressData] = useState<AddressResult | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<any>(null);

  useEffect(() => {
    setDeviceInfo(detectDeviceInfo());
  }, []);

  const detectedCompany = detectCompanyFromContext();
  const detectedDriverId = detectDriverIdFromContext();

  const form = useForm<CaptureFormValues>({
    resolver: zodResolver(captureSchema),
    defaultValues: {
      shipmentNumber: "",
      driverId: detectedDriverId,
    },
  });

  useEffect(() => {
    if (detectedDriverId) {
      form.setValue("driverId", detectedDriverId);
    }
  }, [detectedDriverId]);

  const checkPendingMutation = useMutation({
    mutationFn: async (data: { driverId: string; companyName: string }) => {
      const res = await fetch("/api/driver/check-pending-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to check pending feedback");
      return res.json();
    },
  });

  const lookupMutation = useMutation({
    mutationFn: async (data: CaptureFormValues & { companyName: string; digitalId: string }) => {
      const res = await fetch("/api/driver/lookup-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        if (error.requiresFeedback) {
          throw { requiresFeedback: true, pendingLookupId: error.pendingLookupId, message: error.message };
        }
        throw new Error(error.message || "Failed to lookup address");
      }
      return res.json() as Promise<AddressResult>;
    },
    onSuccess: (data) => {
      localStorage.setItem("driver_id", form.getValues("driverId"));
      if (detectedCompany) {
        localStorage.setItem("driver_company", detectedCompany);
      }
      
      setAddressData(data);
      toast({
        title: "Access Granted",
        description: "Delivery details loaded successfully.",
      });
    },
    onError: (error: any) => {
      if (error.requiresFeedback) {
        setPendingFeedback({ id: error.pendingLookupId });
        toast({
          title: "Feedback Required",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Access Denied",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: CaptureFormValues) => {
    const companyName = detectedCompany || "Unknown";
    
    try {
      const pendingCheck = await checkPendingMutation.mutateAsync({
        driverId: data.driverId,
        companyName,
      });

      if (pendingCheck.hasPendingFeedback) {
        setPendingFeedback(pendingCheck.pendingLookup);
        toast({
          title: "Feedback Required",
          description: "Please provide feedback for your previous delivery first.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to verify status. Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }

    lookupMutation.mutate({
      ...data,
      companyName,
      digitalId: digitalId || "",
    });
  };

  const goToFeedback = () => {
    if (pendingFeedback?.id) {
      setLocation(`/driver-feedback/${pendingFeedback.id}`);
    }
  };

  if (addressData) {
    const { address, user, fallbackContacts } = addressData;
    
    return (
      <div className="min-h-screen bg-muted/30 p-4 py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="shadow-xl border-border/60 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/5 dark:to-blue-900/10 p-6 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0 border-2 border-primary/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${user.phone}`} className="hover:text-primary">
                        {user.phone}
                      </a>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Digital ID</p>
                  <p className="text-lg font-mono font-bold text-primary tracking-widest">{digitalId}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-4 md:p-6 space-y-6">
              {/* Location Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  Location
                </div>
                <div className="rounded-lg overflow-hidden border border-border h-48 md:h-56">
                  <AddressMap 
                    readOnly 
                    initialLat={address.lat ?? undefined} 
                    initialLng={address.lng ?? undefined} 
                  />
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{address.textAddress}</p>
                    {address.lat && address.lng && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Coordinates: {address.lat.toFixed(6)}, {address.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>

                {fallbackContacts && fallbackContacts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Alternative Contacts</p>
                    {fallbackContacts.map((contact: any) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                        <div>
                          <p className="font-medium text-sm">{contact.name}</p>
                          {contact.relationship && (
                            <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                          )}
                        </div>
                        <a href={`tel:${contact.phone}`} className="text-primary hover:underline flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Photos Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
                  <Image className="w-4 h-4" />
                  Photos
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {[
                    { label: "Building", icon: Building2, src: address.photoBuilding },
                    { label: "Gate", icon: DoorOpen, src: address.photoGate },
                    { label: "Door", icon: Home, src: address.photoDoor }
                  ].map((img, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1 truncate">
                        <img.icon className="w-3 h-3 shrink-0" /> 
                        <span className="truncate">{img.label}</span>
                      </p>
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden">
                        {img.src ? (
                          <img 
                            src={img.src} 
                            alt={img.label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground p-2">
                            <Image className="w-6 h-6 mx-auto opacity-30" />
                            <p className="text-[8px] md:text-[10px] mt-1">No photo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Instructions Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  Instructions
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <Clock className="w-3.5 h-3.5" /> Preferred Time
                    </div>
                    <p className="font-medium text-foreground text-sm capitalize">
                      {address.preferredTime || "Not specified"}
                      {address.preferredTimeSlot && ` (${address.preferredTimeSlot})`}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                      <Home className="w-3.5 h-3.5" /> If Not Home
                    </div>
                    <p className="font-medium text-foreground text-sm capitalize">
                      {address.fallbackOption === "door" ? "Leave at door/reception" :
                       address.fallbackOption === "neighbor" ? "Leave with neighbor" :
                       address.fallbackOption === "call" ? "Call to reschedule" :
                       address.fallbackOption === "security" ? "Leave with security" :
                       address.fallbackOption || "Not specified"}
                    </p>
                  </div>
                </div>
                
                {address.specialNote && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                      <FileText className="w-3.5 h-3.5" /> Special Notes
                    </div>
                    <p className="text-foreground text-sm">{address.specialNote}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Driver Actions Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
                  <Truck className="w-4 h-4" />
                  Driver Actions
                </div>
                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">Having Trouble Delivering?</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        If you're unable to complete the delivery at this address, report the issue to access alternate drop locations.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="destructive"
                          onClick={() => setLocation(`/driver-feedback/${addressData.lookupId}`)}
                          data-testid="button-report-issue"
                        >
                          <AlertTriangle className="w-4 h-4 me-2" />
                          Report Delivery Issue
                        </Button>
                        {fallbackContacts && fallbackContacts.length > 0 && (
                          <Button 
                            variant="outline"
                            onClick={() => setLocation(`/driver-feedback/${addressData.lookupId}`)}
                            data-testid="button-get-alternate"
                          >
                            <Navigation className="w-4 h-4 me-2" />
                            Get Alternate Location
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-12 text-lg"
            onClick={() => setLocation(`/driver-feedback/${addressData.lookupId}`)}
            data-testid="button-complete-delivery"
          >
            Complete Delivery & Submit Feedback
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">Delivery Access</h1>
          <p className="text-muted-foreground">Verify your identity to view delivery details</p>
        </div>

        {pendingFeedback && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <span>You have pending feedback for a previous delivery. Please submit it first.</span>
              <Button variant="outline" size="sm" onClick={goToFeedback}>
                Submit Feedback
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {deviceInfo && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Smartphone className="w-4 h-4" />
                  <span>{deviceInfo.isMobile ? "Mobile" : "Desktop"}</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>{deviceInfo.browser}</span>
                </div>
                {detectedCompany && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-primary font-medium">{detectedCompany}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enter Delivery Details</CardTitle>
            <CardDescription>
              Provide your shipment information to access delivery details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="shipmentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipment Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., SHP-12345" 
                          {...field} 
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your driver ID" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={lookupMutation.isPending || checkPendingMutation.isPending}
                  data-testid="button-access-details"
                >
                  {(lookupMutation.isPending || checkPendingMutation.isPending) ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Access Delivery Details"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Address ID: {digitalId}
        </p>
      </div>
    </div>
  );
}
