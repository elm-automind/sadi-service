import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Star, MapPin, Package, CheckCircle2, AlertCircle, CheckCircle, Truck, MapPinOff, ArrowRight, Phone, User, Home, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AddressMap } from "@/components/address-map";

const feedbackSchema = z.object({
  deliveryStatus: z.enum(["delivered", "failed"], { required_error: "Please select delivery status" }),
  locationScore: z.number().min(1, "Please rate the location accuracy").max(5),
  customerBehavior: z.string().min(1, "Please describe customer behavior"),
  failureReason: z.string().optional(),
  additionalNotes: z.string().optional(),
}).refine((data) => {
  if (data.deliveryStatus === "failed") {
    return data.failureReason && data.failureReason.length > 0;
  }
  return true;
}, {
  message: "Please select a reason for the failed delivery",
  path: ["failureReason"],
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface AlternateLocation {
  id: number;
  name: string;
  phone: string;
  relationship: string;
  textAddress: string;
  lat: number | null;
  lng: number | null;
  photoBuilding: string | null;
  photoGate: string | null;
  photoDoor: string | null;
  specialNote: string | null;
  distanceKm: number | null;
  isDefault?: boolean;
}

interface AlternateAttempt {
  id: number;
  shipmentLookupId: number;
  fallbackContactId: number;
  status: string;
  primaryFailureReason: string;
  primaryFailureDetails: string | null;
}

export default function DriverFeedback() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const lookupId = parseInt(id || "0");
  const [submitted, setSubmitted] = useState(false);
  const [showAlternateModal, setShowAlternateModal] = useState(false);
  const [selectedFailureReason, setSelectedFailureReason] = useState("");
  const [failureDetails, setFailureDetails] = useState("");
  const [alternateLocation, setAlternateLocation] = useState<AlternateLocation | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<AlternateAttempt | null>(null);
  const [showingAlternate, setShowingAlternate] = useState(false);
  const [wantsAlternate, setWantsAlternate] = useState(false);
  const [showAlternateFeedbackForm, setShowAlternateFeedbackForm] = useState(false);

  const deliveryStatusOptions = [
    { value: "delivered", label: t('feedback.delivered'), color: "text-green-600" },
    { value: "failed", label: t('feedback.failed'), color: "text-red-600" },
  ];

  const failureReasonOptions = [
    { value: "wrong_address", label: t('feedback.wrongAddress') },
    { value: "customer_unavailable", label: t('feedback.customerUnavailable') },
    { value: "access_denied", label: t('feedback.accessDenied') },
    { value: "dangerous_area", label: t('feedback.dangerousArea') },
    { value: "address_not_found", label: t('feedback.addressNotFound') },
    { value: "weather_conditions", label: t('feedback.weatherConditions') },
    { value: "vehicle_issue", label: t('feedback.vehicleIssue') },
    { value: "other", label: t('feedback.other') },
  ];

  const customerBehaviorOptions = [
    { value: "cooperative", label: t('feedback.cooperative') },
    { value: "neutral", label: t('feedback.neutral') },
    { value: "difficult", label: t('feedback.difficult') },
    { value: "unavailable", label: t('feedback.unavailable') },
    { value: "aggressive", label: t('feedback.aggressive') },
  ];

  const { data: lookupData, isLoading, error } = useQuery({
    queryKey: ["/api/driver/pending-lookup", lookupId],
    queryFn: async () => {
      const res = await fetch(`/api/driver/pending-lookup/${lookupId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch lookup details");
      }
      return res.json();
    },
    enabled: lookupId > 0,
  });

  const { data: alternatesData } = useQuery({
    queryKey: ["/api/driver/lookup", lookupId, "alternates"],
    queryFn: async () => {
      const res = await fetch(`/api/driver/lookup/${lookupId}/alternates`);
      if (!res.ok) {
        return { alternateLocations: [], activeAttempt: null };
      }
      return res.json();
    },
    enabled: lookupId > 0 && !!lookupData,
  });

  const hasAlternateLocations = alternatesData?.alternateLocations?.length > 0;

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      deliveryStatus: undefined,
      locationScore: 0,
      customerBehavior: "",
      failureReason: "",
      additionalNotes: "",
    },
  });

  const deliveryStatus = form.watch("deliveryStatus");

  const requestAlternateMutation = useMutation({
    mutationFn: async (data: FeedbackFormValues) => {
      const res = await fetch("/api/driver/request-alternate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookupId,
          failureReason: data.failureReason,
          locationScore: data.locationScore,
          customerBehavior: data.customerBehavior,
          additionalNotes: data.additionalNotes,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to request alternate location");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAlternateLocation(data.alternateLocation);
      setActiveAttempt(data.attempt);
      setShowAlternateModal(false);
      setShowingAlternate(true);
      setWantsAlternate(false);
      setShowAlternateFeedbackForm(false);
      form.reset();
      toast({
        title: t('feedback.alternateLocationLoaded'),
        description: t('feedback.proceedToAlternate'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('errors.somethingWentWrong'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormValues) => {
      const res = await fetch("/api/driver/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookupId,
          ...data,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit feedback");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: t('feedback.feedbackSubmitted'),
        description: t('feedback.thankYouFeedback'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('errors.somethingWentWrong'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeAlternateMutation = useMutation({
    mutationFn: async (data: FeedbackFormValues) => {
      if (!activeAttempt) throw new Error("No active attempt");
      const res = await fetch("/api/driver/complete-alternate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: activeAttempt.id,
          ...data,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to complete delivery");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: t('feedback.feedbackSubmitted'),
        description: t('feedback.thankYouFeedback'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('errors.somethingWentWrong'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormValues) => {
    if (showingAlternate && activeAttempt) {
      completeAlternateMutation.mutate(data);
    } else if (wantsAlternate) {
      requestAlternateMutation.mutate(data);
    } else {
      submitMutation.mutate(data);
    }
  };

  const handleRequestAlternate = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: t('feedback.completeFormFirst'),
        description: t('feedback.completeFormFirstDesc'),
        variant: "destructive",
      });
      return;
    }
    const formValues = form.getValues();
    if (formValues.deliveryStatus !== "failed" || !formValues.failureReason) {
      toast({
        title: t('feedback.selectFailureReason'),
        description: t('feedback.selectFailureReasonDesc'),
        variant: "destructive",
      });
      return;
    }
    requestAlternateMutation.mutate(formValues);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !lookupData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[15%] left-[10%] w-[250px] h-[250px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="absolute top-4 end-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="max-w-md mx-auto mt-20 relative z-10">
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold mb-2">{t('errors.notFound')}</h2>
              <p className="text-muted-foreground mb-4">
                {error?.message || t('errors.somethingWentWrong')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[15%] left-[10%] w-[250px] h-[250px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="absolute top-4 end-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="max-w-md mx-auto mt-20 relative z-10">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50/90 to-emerald-50/90 dark:from-green-950/50 dark:to-emerald-950/50 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-3">{t('feedback.thankYouFeedback')}</h2>
              <p className="text-green-700 dark:text-green-300 mb-2">
                {t('feedback.feedbackSubmitted')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[5%] w-[400px] h-[400px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[20%] left-[5%] text-primary/5 float-animation">
          <Truck className="w-14 h-14" />
        </div>
        <div className="absolute bottom-[30%] right-[5%] text-primary/5 float-animation" style={{ animationDelay: '2s' }}>
          <Package className="w-10 h-10" />
        </div>
      </div>
      
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="max-w-lg mx-auto space-y-6 relative z-10 pt-4">
        <div className="text-center space-y-3">
          <div className={`mx-auto w-16 h-16 rounded-xl ${showingAlternate ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'icon-container-orange'} text-white flex items-center justify-center shadow-lg ${showingAlternate ? 'shadow-orange-500/30' : 'shadow-orange-500/30'}`}>
            {showingAlternate ? <Navigation className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 dark:from-white dark:to-blue-200 bg-clip-text text-transparent">
            {showingAlternate ? t('feedback.alternateDelivery') : t('feedback.deliveryFeedback')}
          </h1>
          <p className="text-muted-foreground">
            {showingAlternate ? t('feedback.alternateDeliveryDesc') : t('feedback.locationScoreDesc')}
          </p>
        </div>

        <Card className="border-0 shadow-lg bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">{t('driver.shipmentNumber')}: {lookupData.lookup.shipmentNumber}</p>
                {!showingAlternate && lookupData.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {lookupData.address.label || lookupData.address.textAddress}
                  </p>
                )}
                {showingAlternate && alternateLocation && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {t('feedback.alternateLocation')}: {alternateLocation.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {showingAlternate && alternateLocation && (
          <Card className="border-0 shadow-lg bg-orange-50/80 dark:bg-orange-950/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-orange-600" />
                {t('feedback.alternateDropLocation')}
              </CardTitle>
              <CardDescription>{t('feedback.deliverToAlternate')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{alternateLocation.name}</span>
                  <span className="text-sm text-muted-foreground">({alternateLocation.relationship})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${alternateLocation.phone}`} className="text-primary hover:underline">
                    {alternateLocation.phone}
                  </a>
                </div>
                {alternateLocation.textAddress && (
                  <div className="flex items-start gap-2">
                    <Home className="w-4 h-4 text-muted-foreground mt-1" />
                    <span className="text-sm">{alternateLocation.textAddress}</span>
                  </div>
                )}
                {alternateLocation.distanceKm && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{alternateLocation.distanceKm.toFixed(1)} km {t('feedback.fromPrimary')}</span>
                  </div>
                )}
                {alternateLocation.specialNote && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">{alternateLocation.specialNote}</p>
                  </div>
                )}
              </div>

              {(alternateLocation.lat && alternateLocation.lng) && (
                <div className="rounded-lg overflow-hidden border border-border h-40">
                  <AddressMap 
                    readOnly 
                    initialLat={alternateLocation.lat} 
                    initialLng={alternateLocation.lng} 
                  />
                </div>
              )}

              {(alternateLocation.photoBuilding || alternateLocation.photoGate || alternateLocation.photoDoor) && (
                <div className="grid grid-cols-3 gap-2">
                  {alternateLocation.photoBuilding && (
                    <img 
                      src={alternateLocation.photoBuilding} 
                      alt={t('address.building')} 
                      className="rounded-lg w-full h-20 object-cover"
                    />
                  )}
                  {alternateLocation.photoGate && (
                    <img 
                      src={alternateLocation.photoGate} 
                      alt={t('address.gate')} 
                      className="rounded-lg w-full h-20 object-cover"
                    />
                  )}
                  {alternateLocation.photoDoor && (
                    <img 
                      src={alternateLocation.photoDoor} 
                      alt={t('address.door')} 
                      className="rounded-lg w-full h-20 object-cover"
                    />
                  )}
                </div>
              )}

              {!showAlternateFeedbackForm && (
                <Button
                  onClick={() => setShowAlternateFeedbackForm(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  data-testid="button-complete-alternate-delivery"
                >
                  <CheckCircle2 className="w-4 h-4 me-2" />
                  {t('feedback.completeDeliverySubmitFeedback')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {(!showingAlternate || showAlternateFeedbackForm) && (
        <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{showingAlternate ? t('feedback.alternateFeedback') : t('feedback.deliveryFeedback')}</CardTitle>
            <CardDescription>
              {showingAlternate ? t('feedback.alternateFeedbackDesc') : t('feedback.locationScoreDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="deliveryStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('feedback.deliveryStatus')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2 pt-2"
                        >
                          {deliveryStatusOptions.map((option) => (
                            <Label
                              key={option.value}
                              htmlFor={`status-${option.value}`}
                              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                field.value === option.value
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-primary/50"
                              }`}
                              data-testid={`radio-status-${option.value}`}
                            >
                              <RadioGroupItem value={option.value} id={`status-${option.value}`} />
                              <span className={`flex-1 font-medium ${option.color}`}>
                                {option.label}
                              </span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {deliveryStatus === "failed" && !showingAlternate && hasAlternateLocations && !wantsAlternate && (
                  <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                          <Navigation className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium text-orange-800 dark:text-orange-200">{t('feedback.tryAlternate')}</p>
                          <p className="text-sm text-orange-600 dark:text-orange-400">{t('feedback.tryAlternateDesc')}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                        onClick={() => setWantsAlternate(true)}
                        data-testid="button-request-alternate"
                      >
                        <MapPinOff className="w-4 h-4 me-2" />
                        {t('feedback.requestAlternate')}
                        <ArrowRight className="w-4 h-4 ms-2" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {wantsAlternate && !showingAlternate && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                    <Navigation className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm text-orange-700 dark:text-orange-300 flex-1">{t('feedback.willFetchAlternate')}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setWantsAlternate(false)}
                      className="text-orange-600 dark:text-orange-400"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                )}

                {deliveryStatus === "failed" && (
                  <FormField
                    control={form.control}
                    name="failureReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('feedback.failureReason')}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-2 pt-2"
                          >
                            {failureReasonOptions.map((option) => (
                              <Label
                                key={option.value}
                                htmlFor={`failure-${option.value}`}
                                className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                  field.value === option.value
                                    ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                                    : "border-muted hover:border-red-300"
                                }`}
                                data-testid={`radio-failure-${option.value}`}
                              >
                                <RadioGroupItem value={option.value} id={`failure-${option.value}`} />
                                <span className="flex-1">
                                  {option.label}
                                </span>
                              </Label>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="locationScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('feedback.locationScore')}</FormLabel>
                      <FormDescription>{t('feedback.locationScoreDesc')}</FormDescription>
                      <FormControl>
                        <div className="flex gap-2 pt-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => field.onChange(score)}
                              data-testid={`button-star-${score}`}
                              className={`p-2 rounded-lg transition-all ${
                                field.value >= score
                                  ? "text-yellow-500"
                                  : "text-muted-foreground hover:text-yellow-300"
                              }`}
                            >
                              <Star
                                className="w-8 h-8"
                                fill={field.value >= score ? "currentColor" : "none"}
                              />
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerBehavior"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('feedback.customerBehavior')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2 pt-2"
                        >
                          {customerBehaviorOptions.map((option) => (
                            <Label
                              key={option.value}
                              htmlFor={`behavior-${option.value}`}
                              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                field.value === option.value
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-primary/50"
                              }`}
                              data-testid={`radio-behavior-${option.value}`}
                            >
                              <RadioGroupItem value={option.value} id={`behavior-${option.value}`} />
                              <span className="flex-1">
                                {option.label}
                              </span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('feedback.additionalNotes')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder=""
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className={`w-full ${wantsAlternate ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  disabled={submitMutation.isPending || completeAlternateMutation.isPending || requestAlternateMutation.isPending}
                  data-testid="button-submit-feedback"
                >
                  {(submitMutation.isPending || completeAlternateMutation.isPending || requestAlternateMutation.isPending) ? (
                    t('common.loading')
                  ) : wantsAlternate ? (
                    <>
                      <Navigation className="w-4 h-4 me-2" />
                      {t('feedback.submitAndFetchAlternate')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 me-2" />
                      {t('driver.submitFeedback')}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        )}
      </div>

      <Dialog open={showAlternateModal} onOpenChange={setShowAlternateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPinOff className="w-5 h-5 text-orange-600" />
              {t('feedback.primaryDeliveryFailed')}
            </DialogTitle>
            <DialogDescription>
              {t('feedback.primaryDeliveryFailedDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('feedback.failureReason')}</Label>
              <RadioGroup
                onValueChange={setSelectedFailureReason}
                value={selectedFailureReason}
                className="space-y-2"
              >
                {failureReasonOptions.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`modal-failure-${option.value}`}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedFailureReason === option.value
                        ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                        : "border-muted hover:border-orange-300"
                    }`}
                    data-testid={`modal-radio-failure-${option.value}`}
                  >
                    <RadioGroupItem value={option.value} id={`modal-failure-${option.value}`} />
                    <span className="flex-1 text-sm">
                      {option.label}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('feedback.additionalDetails')}</Label>
              <Textarea
                placeholder={t('feedback.additionalDetailsPlaceholder')}
                value={failureDetails}
                onChange={(e) => setFailureDetails(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAlternateModal(false)}
              data-testid="button-cancel-alternate"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleRequestAlternate}
              disabled={!selectedFailureReason || requestAlternateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-alternate"
            >
              {requestAlternateMutation.isPending ? (
                t('common.loading')
              ) : (
                <>
                  <Navigation className="w-4 h-4 me-2" />
                  {t('feedback.getAlternateLocation')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
