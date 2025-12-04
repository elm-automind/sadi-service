import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, FileText, CheckCircle2, Home, Settings, Sun, Sunset, Moon, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, Address } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceInput } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const TIME_SLOTS = {
  morning: {
    label: "Morning",
    icon: Sun,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    activeBg: "bg-amber-500",
    activeText: "text-white",
    borderColor: "border-amber-300 dark:border-amber-700",
    hoverBg: "hover:bg-amber-100 dark:hover:bg-amber-900/50",
    slots: [
      { value: "8am-9am", label: "8:00 AM - 9:00 AM" },
      { value: "9am-10am", label: "9:00 AM - 10:00 AM" },
      { value: "10am-11am", label: "10:00 AM - 11:00 AM" },
      { value: "11am-12pm", label: "11:00 AM - 12:00 PM" },
    ]
  },
  afternoon: {
    label: "Afternoon",
    icon: Sunset,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    activeBg: "bg-orange-500",
    activeText: "text-white",
    borderColor: "border-orange-300 dark:border-orange-700",
    hoverBg: "hover:bg-orange-100 dark:hover:bg-orange-900/50",
    slots: [
      { value: "12pm-2pm", label: "12:00 PM - 2:00 PM" },
      { value: "2pm-4pm", label: "2:00 PM - 4:00 PM" },
      { value: "4pm-6pm", label: "4:00 PM - 6:00 PM" },
    ]
  },
  evening: {
    label: "Evening",
    icon: Moon,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
    activeBg: "bg-indigo-500",
    activeText: "text-white",
    borderColor: "border-indigo-300 dark:border-indigo-700",
    hoverBg: "hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
    slots: [
      { value: "6pm-7pm", label: "6:00 PM - 7:00 PM" },
      { value: "7pm-8pm", label: "7:00 PM - 8:00 PM" },
      { value: "8pm-9pm", label: "8:00 PM - 9:00 PM" },
    ]
  }
};

const preferencesSchema = z.object({
  preferredTime: z.string().min(1, "Please select a time period"),
  preferredTimeSlot: z.string().optional(),
  specialNote: z.string().optional(),
});

type PreferencesData = z.infer<typeof preferencesSchema>;

interface UserWithAddresses extends User {
  addresses: Address[];
}

export default function DeliveryPreferences() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeAddressId, setActiveAddressId] = useState<number | null>(null);

  const form = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredTime: "morning",
      preferredTimeSlot: "",
      specialNote: "",
    }
  });

  const selectedTimeSlot = form.watch("preferredTimeSlot");

  const { data: user, isLoading } = useQuery<UserWithAddresses>({
    queryKey: ["/api/user"],
    retry: false,
  });

  useEffect(() => {
    if (user) {
      if (user.addresses && user.addresses.length > 0) {
        // Find primary address or fall back to first address
        const primaryAddress = user.addresses.find(a => a.isPrimary) || user.addresses[0];
        setActiveAddressId(primaryAddress.id);
        
        const period = primaryAddress.preferredTime || "morning";
        
        form.reset({
          preferredTime: period,
          preferredTimeSlot: primaryAddress.preferredTimeSlot || "",
          specialNote: primaryAddress.specialNote || "",
        });
      } else {
        setLocation("/add-address");
      }
    } else if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading]);

  const updateMutation = useMutation({
    mutationFn: async (data: PreferencesData) => {
      if (!activeAddressId) throw new Error("No active address");
      const res = await apiRequest("PATCH", `/api/addresses/${activeAddressId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Preferences Updated",
        description: "Your delivery preferences have been saved.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const onSubmit = (data: PreferencesData) => {
    updateMutation.mutate(data);
  };

  const handleSlotSelect = (periodKey: string, slotValue: string) => {
    form.setValue("preferredTime", periodKey);
    form.setValue("preferredTimeSlot", slotValue);
  };

  const getSlotPeriod = (slotValue: string): string | null => {
    for (const [key, period] of Object.entries(TIME_SLOTS)) {
      if (period.slots.some(s => s.value === slotValue)) {
        return key;
      }
    }
    return null;
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
      <div className="absolute top-4 left-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="w-4 h-4" /> Dashboard
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-3xl shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-primary">Delivery Preferences</CardTitle>
              <CardDescription>Set your preferred delivery times and special instructions.</CardDescription>
            </div>
          </div>

          {user.addresses.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm">Select Address</Label>
              <Select 
                value={activeAddressId?.toString()} 
                onValueChange={(v) => {
                  const addrId = parseInt(v);
                  setActiveAddressId(addrId);
                  const addr = user.addresses.find(a => a.id === addrId);
                  if (addr) {
                    const period = addr.preferredTime || "morning";
                    form.reset({
                      preferredTime: period,
                      preferredTimeSlot: addr.preferredTimeSlot || "",
                      specialNote: addr.specialNote || "",
                    });
                  }
                }}
              >
                <SelectTrigger className="mt-2" data-testid="select-address">
                  <SelectValue placeholder="Choose an address" />
                </SelectTrigger>
                <SelectContent>
                  {user.addresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id.toString()} data-testid={`address-option-${addr.id}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{addr.digitalId}</span>
                        <span className="truncate max-w-[200px]">{addr.textAddress.substring(0, 30)}{addr.textAddress.length > 30 ? '...' : ''}</span>
                        {addr.isPrimary && <span className="text-xs text-primary font-medium">(Primary)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Time Period Selection - All slots always visible */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Preferred Delivery Time
              </Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred time slot. The selected time will be highlighted.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(TIME_SLOTS).map(([key, period]) => {
                  const Icon = period.icon;
                  const activePeriod = getSlotPeriod(selectedTimeSlot || "");
                  const isPeriodActive = activePeriod === key;
                  
                  return (
                    <div
                      key={key}
                      className={`
                        rounded-xl border-2 overflow-hidden transition-all
                        ${isPeriodActive 
                          ? `${period.borderColor} shadow-lg` 
                          : 'border-muted'}
                      `}
                    >
                      {/* Period Header */}
                      <div className={`p-3 ${period.bgColor} border-b ${period.borderColor}`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${period.color}`} />
                          <span className={`font-semibold ${period.color}`}>{period.label}</span>
                          {isPeriodActive && (
                            <Check className={`w-4 h-4 ml-auto ${period.color}`} />
                          )}
                        </div>
                      </div>
                      
                      {/* Time Slots - Always Visible */}
                      <div className="p-2 space-y-1.5 bg-background">
                        {period.slots.map((slot) => {
                          const isSlotSelected = selectedTimeSlot === slot.value;
                          
                          return (
                            <div
                              key={slot.value}
                              data-testid={`slot-${slot.value}`}
                              className={`
                                p-2.5 rounded-lg text-sm cursor-pointer transition-all flex items-center gap-2
                                ${isSlotSelected 
                                  ? `${period.activeBg} ${period.activeText} font-semibold shadow-md` 
                                  : `bg-muted/50 ${period.hoverBg} text-foreground`}
                              `}
                              onClick={() => handleSlotSelect(key, slot.value)}
                            >
                              {isSlotSelected && (
                                <Check className="w-4 h-4 shrink-0" />
                              )}
                              <span className={isSlotSelected ? "" : "ml-6"}>{slot.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {form.formState.errors.preferredTime && (
                <p className="text-destructive text-xs">{form.formState.errors.preferredTime.message}</p>
              )}
            </div>

            {/* Special Notes */}
            <div className="space-y-3">
              <Label htmlFor="specialNote" className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Special Delivery Instructions
              </Label>
              <Controller
                control={form.control}
                name="specialNote"
                render={({ field }) => (
                  <VoiceInput 
                    as="textarea"
                    id="specialNote" 
                    placeholder="e.g., Ring the doorbell twice, leave at reception if not home, call before arriving, beware of dog..." 
                    className="h-32 resize-none"
                    {...field}
                    value={field.value || ""}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Tap the microphone icon to use voice input for hands-free typing.
              </p>
            </div>

            <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row gap-3 justify-end">
              <Link href="/dashboard">
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Preferences"} <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
