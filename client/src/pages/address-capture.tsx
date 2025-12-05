import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Package, User, Smartphone, Globe, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <CardTitle className="text-lg">Delivery Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {addressData.address.label && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{addressData.address.label}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground pl-6">{addressData.address.textAddress}</p>
              </div>

              <div className="border-t pt-4 space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer
                </h4>
                <div className="grid gap-1 text-sm pl-6">
                  <p><span className="text-muted-foreground">Name:</span> {addressData.user.name}</p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <a href={`tel:${addressData.user.phone}`} className="text-primary hover:underline">
                      {addressData.user.phone}
                    </a>
                  </p>
                </div>
              </div>

              {addressData.address.preferredTime && (
                <div className="border-t pt-4">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Preferred time:</span>{" "}
                    {addressData.address.preferredTime}
                    {addressData.address.preferredTimeSlot && ` (${addressData.address.preferredTimeSlot})`}
                  </p>
                </div>
              )}

              {addressData.address.specialNote && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-1">Special Notes:</p>
                  <p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200">
                    {addressData.address.specialNote}
                  </p>
                </div>
              )}

              {addressData.address.photoBuilding && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Building Photo:</p>
                  <img 
                    src={addressData.address.photoBuilding} 
                    alt="Building" 
                    className="rounded-lg max-h-40 object-cover w-full"
                  />
                </div>
              )}

              {addressData.fallbackContacts.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Fallback Contacts:</p>
                  <div className="space-y-2">
                    {addressData.fallbackContacts.map((contact: any) => (
                      <div key={contact.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          {contact.relationship && (
                            <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                          )}
                        </div>
                        <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            className="w-full"
            onClick={() => setLocation(`/driver-feedback/${addressData.lookupId}`)}
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
