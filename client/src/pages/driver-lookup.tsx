import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Package, User, Building2, MapPin, Phone, Mail, AlertCircle, Clock, Home, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const lookupSchema = z.object({
  shipmentNumber: z.string().min(1, "Shipment number is required"),
  driverId: z.string().min(1, "Driver ID is required"),
  companyName: z.string().min(1, "Company name is required"),
  digitalId: z.string().min(1, "Digital ID is required"),
});

type LookupFormValues = z.infer<typeof lookupSchema>;

interface AddressResult {
  lookupId: number;
  address: {
    id: number;
    digitalId: string;
    label: string | null;
    textAddress: string;
    lat: number | null;
    lng: number | null;
    photoBuilding: string | null;
    photoGate: string | null;
    photoDoor: string | null;
    preferredTime: string | null;
    preferredTimeSlot: string | null;
    specialNote: string | null;
    fallbackOption: string | null;
  };
  user: {
    name: string;
    phone: string;
    email: string;
  };
  fallbackContacts: Array<{
    id: number;
    name: string;
    phone: string;
    relationship: string | null;
    textAddress: string | null;
    isDefault: boolean | null;
  }>;
}

interface PendingFeedbackResult {
  hasPendingFeedback: boolean;
  pendingLookup?: {
    id: number;
    shipmentNumber: string;
    addressLabel: string;
  };
}

export default function DriverLookup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedbackResult | null>(null);

  const form = useForm<LookupFormValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      shipmentNumber: "",
      driverId: "",
      companyName: "",
      digitalId: "",
    },
  });

  const checkPendingMutation = useMutation({
    mutationFn: async (data: { driverId: string; companyName: string }) => {
      const res = await fetch("/api/driver/check-pending-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to check pending feedback");
      return res.json() as Promise<PendingFeedbackResult>;
    },
  });

  const lookupMutation = useMutation({
    mutationFn: async (data: LookupFormValues) => {
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
      setAddressResult(data);
      setPendingFeedback(null);
      toast({
        title: "Address Found",
        description: "The delivery address has been retrieved successfully.",
      });
    },
    onError: (error: any) => {
      if (error.requiresFeedback) {
        setPendingFeedback({
          hasPendingFeedback: true,
          pendingLookup: { id: error.pendingLookupId, shipmentNumber: "", addressLabel: "" }
        });
        toast({
          title: "Feedback Required",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Lookup Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: LookupFormValues) => {
    const pendingCheck = await checkPendingMutation.mutateAsync({
      driverId: data.driverId,
      companyName: data.companyName,
    });

    if (pendingCheck.hasPendingFeedback) {
      setPendingFeedback(pendingCheck);
      toast({
        title: "Feedback Required",
        description: "Please provide feedback for your previous delivery first.",
        variant: "destructive",
      });
      return;
    }

    lookupMutation.mutate(data);
  };

  const goToFeedback = () => {
    if (pendingFeedback?.pendingLookup) {
      setLocation(`/driver-feedback/${pendingFeedback.pendingLookup.id}`);
    }
  };

  const goToFeedbackForCurrent = () => {
    if (addressResult?.lookupId) {
      setLocation(`/driver-feedback/${addressResult.lookupId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">Driver Address Lookup</h1>
          <p className="text-muted-foreground">Enter shipment details to retrieve delivery address</p>
        </div>

        {pendingFeedback?.hasPendingFeedback && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>You have pending feedback for shipment {pendingFeedback.pendingLookup?.shipmentNumber || "previous delivery"}. Please submit feedback before looking up a new address.</span>
              <Button variant="outline" size="sm" onClick={goToFeedback} className="ml-4">
                Submit Feedback
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!addressResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Shipment Details
              </CardTitle>
              <CardDescription>Enter the required information to lookup the delivery address</CardDescription>
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
                          <Input placeholder="e.g., SHP-12345" {...field} />
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
                          <Input placeholder="Your driver ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="digitalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Digital ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ABC12345" {...field} />
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
                    {(lookupMutation.isPending || checkPendingMutation.isPending) ? "Looking up..." : "Lookup Address"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {addressResult && (
          <div className="space-y-4">
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {addressResult.address.label && (
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{addressResult.address.label}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{addressResult.address.textAddress}</p>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Information
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{addressResult.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${addressResult.user.phone}`} className="text-primary hover:underline">
                        {addressResult.user.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{addressResult.user.email}</span>
                    </div>
                  </div>
                </div>

                {addressResult.address.preferredTime && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      Delivery Preferences
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Preferred time: {addressResult.address.preferredTime}
                      {addressResult.address.preferredTimeSlot && ` (${addressResult.address.preferredTimeSlot})`}
                    </p>
                  </div>
                )}

                {addressResult.address.specialNote && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Special Notes</h4>
                    <p className="text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
                      {addressResult.address.specialNote}
                    </p>
                  </div>
                )}

                {addressResult.address.photoBuilding && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Building Photo</h4>
                    <img 
                      src={addressResult.address.photoBuilding} 
                      alt="Building" 
                      className="rounded-lg max-h-48 object-cover"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {addressResult.fallbackContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Fallback Contacts
                  </CardTitle>
                  <CardDescription>Alternative contacts if customer is unavailable</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {addressResult.fallbackContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          {contact.relationship && (
                            <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                          )}
                        </div>
                        <a href={`tel:${contact.phone}`} className="text-primary hover:underline text-sm">
                          {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setAddressResult(null);
                  form.reset();
                }}
              >
                New Lookup
              </Button>
              <Button 
                className="flex-1"
                onClick={goToFeedbackForCurrent}
              >
                Complete & Submit Feedback
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
