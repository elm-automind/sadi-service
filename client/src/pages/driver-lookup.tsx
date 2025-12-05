import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Package, User, MapPin, Phone, Mail, AlertCircle, Clock, Home, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/language-switcher";

const lookupSchema = z.object({
  shipmentNumber: z.string().min(1, "Shipment number is required"),
  driverId: z.string().min(1, "Driver ID is required"),
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
  companyName?: string;
}

interface PendingFeedbackResult {
  hasPendingFeedback: boolean;
  pendingLookup?: {
    id: number;
    shipmentNumber: string;
    addressLabel: string;
  };
  companyName?: string;
  driverNotFound?: boolean;
}

export default function DriverLookup() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedbackResult | null>(null);

  const form = useForm<LookupFormValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      shipmentNumber: "",
      driverId: "",
      digitalId: "",
    },
  });

  const checkPendingMutation = useMutation({
    mutationFn: async (data: { driverId: string }) => {
      const res = await fetch("/api/driver/check-pending-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw { ...error, status: res.status };
      }
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
        title: t('driver.addressFound'),
        description: t('driver.addressRetrieved'),
      });
    },
    onError: (error: any) => {
      if (error.requiresFeedback) {
        setPendingFeedback({
          hasPendingFeedback: true,
          pendingLookup: { id: error.pendingLookupId, shipmentNumber: "", addressLabel: "" }
        });
        toast({
          title: t('driver.feedbackRequired'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('errors.somethingWentWrong'),
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: LookupFormValues) => {
    try {
      const pendingCheck = await checkPendingMutation.mutateAsync({
        driverId: data.driverId,
      });

      if (pendingCheck.hasPendingFeedback) {
        setPendingFeedback(pendingCheck);
        toast({
          title: t('driver.feedbackRequired'),
          description: t('driver.provideFeedbackFirst'),
          variant: "destructive",
        });
        return;
      }

      lookupMutation.mutate(data);
    } catch (error: any) {
      if (error.driverNotFound) {
        toast({
          title: t('driver.driverNotFound'),
          description: error.message || t('driver.verifyDriverId'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: error.message || t('errors.somethingWentWrong'),
          variant: "destructive",
        });
      }
    }
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
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">{t('driver.driverLookup')}</h1>
          <p className="text-muted-foreground">{t('driver.enterShipmentDetails')}</p>
        </div>

        {pendingFeedback?.hasPendingFeedback && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <span>{t('driver.provideFeedbackFirst')}</span>
              <Button variant="outline" size="sm" onClick={goToFeedback}>
                {t('driver.submitFeedback')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!addressResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 rtl-no-flip">
                <Package className="w-5 h-5" />
                {t('driver.shipmentNumber')}
              </CardTitle>
              <CardDescription>{t('driver.enterShipmentDetails')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shipmentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('driver.shipmentNumber')}</FormLabel>
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
                        <FormLabel>{t('driver.driverId')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('driver.driverId')} {...field} />
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
                        <FormLabel>{t('driver.digitalId')}</FormLabel>
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
                    {(lookupMutation.isPending || checkPendingMutation.isPending) ? t('common.loading') : t('driver.lookupAddress')}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {addressResult && (
          <div className="space-y-4">
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400 rtl-no-flip">
                  <MapPin className="w-5 h-5" />
                  {t('address.deliveryPreferences', 'Delivery Address')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {addressResult.address.label && (
                    <div className="flex items-center gap-2 text-sm rtl-no-flip">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{addressResult.address.label}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{addressResult.address.textAddress}</p>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 rtl-no-flip">
                    <User className="w-4 h-4" />
                    {t('feedback.customerBehavior', 'Customer Information')}
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2 rtl-no-flip">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{addressResult.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2 rtl-no-flip">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${addressResult.user.phone}`} className="text-primary hover:underline">
                        {addressResult.user.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 rtl-no-flip">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{addressResult.user.email}</span>
                    </div>
                  </div>
                </div>

                {addressResult.address.preferredTime && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-2 rtl-no-flip">
                      <Clock className="w-4 h-4" />
                      {t('address.deliveryPreferences')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t('address.preferredTime')}: {addressResult.address.preferredTime}
                      {addressResult.address.preferredTimeSlot && ` (${addressResult.address.preferredTimeSlot})`}
                    </p>
                  </div>
                )}

                {addressResult.address.specialNote && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">{t('address.specialNote')}</h4>
                    <p className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
                      {addressResult.address.specialNote}
                    </p>
                  </div>
                )}

                {addressResult.address.photoBuilding && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">{t('address.buildingPhoto')}</h4>
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
                  <CardTitle className="flex items-center gap-2 rtl-no-flip">
                    <Users className="w-5 h-5" />
                    {t('address.fallbackContacts')}
                  </CardTitle>
                  <CardDescription>{t('address.fallbackContacts')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {addressResult.fallbackContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg flex-wrap">
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

            <div className="flex gap-3 flex-wrap">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setAddressResult(null);
                  form.reset();
                }}
              >
                {t('driver.lookupAddress', 'New Lookup')}
              </Button>
              <Button 
                className="flex-1"
                onClick={goToFeedbackForCurrent}
              >
                {t('driver.submitFeedback')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
