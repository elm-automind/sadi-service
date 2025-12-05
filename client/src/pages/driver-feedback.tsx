import { useState } from "react";
import { useParams } from "wouter";
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
import { MessageSquare, Star, MapPin, Package, CheckCircle2, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/language-switcher";

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

export default function DriverFeedback() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const lookupId = parseInt(id || "0");
  const [submitted, setSubmitted] = useState(false);

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

  const onSubmit = (data: FeedbackFormValues) => {
    submitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !lookupData) {
    return (
      <div className="min-h-screen bg-background p-4 relative">
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="max-w-md mx-auto mt-20">
          <Card className="border-red-200">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
      <div className="min-h-screen bg-background p-4 relative">
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="max-w-md mx-auto mt-20">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
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
    <div className="min-h-screen bg-background p-4 relative">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">{t('feedback.deliveryFeedback')}</h1>
          <p className="text-muted-foreground">{t('feedback.locationScoreDesc')}</p>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('driver.shipmentNumber')}: {lookupData.lookup.shipmentNumber}</p>
                {lookupData.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {lookupData.address.label || lookupData.address.textAddress}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('feedback.deliveryFeedback')}</CardTitle>
            <CardDescription>{t('feedback.locationScoreDesc')}</CardDescription>
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
                  className="w-full"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit-feedback"
                >
                  {submitMutation.isPending ? (
                    t('common.loading')
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
      </div>
    </div>
  );
}
