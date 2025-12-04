import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, FileText, CheckCircle2, ArrowRight, Home, Settings, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceInput } from "@/components/voice-input";
import { useToast } from "@/hooks/use-toast";

const preferencesSchema = z.object({
  preferredTime: z.string().min(1, "Please select a time"),
  specialNote: z.string().optional(),
  fallbackOption: z.string().min(1, "Please select a fallback option"),
});

type PreferencesData = z.infer<typeof preferencesSchema>;

export default function DeliveryPreferences() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeAddressId, setActiveAddressId] = useState<string | null>(null);

  const form = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredTime: "morning",
      specialNote: "",
      fallbackOption: "door"
    }
  });

  useEffect(() => {
    const userId = localStorage.getItem("loggedInUserId");
    const usersDb = JSON.parse(localStorage.getItem("usersDb") || "{}");
    
    if (userId && usersDb[userId]) {
      const user = usersDb[userId];
      setCurrentUser(user);
      
      // Load data from the most recent address
      if (user.addresses && user.addresses.length > 0) {
        const latestAddress = user.addresses[user.addresses.length - 1];
        setActiveAddressId(latestAddress.id);
        
        form.reset({
          preferredTime: latestAddress.instructions?.preferredTime || "morning",
          specialNote: latestAddress.instructions?.note || "",
          fallbackOption: latestAddress.instructions?.fallback || "door"
        });
      } else {
        // Should not happen in this flow, but redirect if no address
        setLocation("/add-address");
      }
    } else {
      setLocation("/login");
    }
  }, []);

  const onSubmit = (data: PreferencesData) => {
    if (!currentUser || !activeAddressId) return;

    // Update the specific address with new instructions
    const updatedAddresses = currentUser.addresses.map((addr: any) => {
      if (addr.id === activeAddressId) {
        return {
          ...addr,
          instructions: {
            ...addr.instructions,
            preferredTime: data.preferredTime,
            note: data.specialNote,
            fallback: data.fallbackOption
          }
        };
      }
      return addr;
    });

    const updatedUser = { ...currentUser, addresses: updatedAddresses };
    
    // Save to DB
    const usersDb = JSON.parse(localStorage.getItem("usersDb") || "{}");
    usersDb[updatedUser.iqamaId] = updatedUser;
    localStorage.setItem("usersDb", JSON.stringify(usersDb));

    // Update session data for Success page display
    const currentAddr = updatedAddresses.find((a: any) => a.id === activeAddressId);
    localStorage.setItem("currentSessionData", JSON.stringify({
      digitalId: activeAddressId,
      user: updatedUser,
      currentAddress: currentAddr,
      previews: {
         // Re-construct preview URLs if possible, or just use names (mockup limitation: URLs might be lost on refresh if not persisted properly, 
         // but names are in DB. For mockup, we might lose the blob URLs unless we persisted them differently. 
         // We'll just pass nulls for previews if lost, the success page handles missing images gracefully)
         building: null, 
         gate: null, 
         door: null 
      }
    }));

    toast({
      title: "Preferences Updated",
      description: "Your delivery instructions have been saved.",
    });
    
    setLocation("/success");
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="w-4 h-4" /> Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-2xl shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-primary">Delivery Preferences</CardTitle>
              <CardDescription>Customize how you want your packages delivered.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Preferred Time */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Preferred Delivery Time
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['Morning (8am - 12pm)', 'Afternoon (1pm - 5pm)', 'Evening (6pm - 9pm)'].map((time) => (
                  <div 
                    key={time}
                    className={`
                      p-4 rounded-lg border-2 text-sm font-medium cursor-pointer transition-all
                      flex items-center justify-center text-center gap-2
                      ${form.watch('preferredTime') === time 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                        : 'border-muted hover:border-muted-foreground/30'}
                    `}
                    onClick={() => form.setValue('preferredTime', time)}
                  >
                    {time.split(' (')[0]}
                  </div>
                ))}
              </div>
              {form.formState.errors.preferredTime && <p className="text-destructive text-xs">{form.formState.errors.preferredTime.message}</p>}
            </div>

            {/* Fallback Options */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> If You're Not Home (Default Fallback)
              </Label>
              <RadioGroup 
                defaultValue={form.getValues("fallbackOption")} 
                onValueChange={(val) => form.setValue("fallbackOption", val)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${form.watch('fallbackOption') === 'door' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <RadioGroupItem value="door" id="door" />
                  <Label htmlFor="door" className="cursor-pointer flex-1">Leave at door / reception</Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${form.watch('fallbackOption') === 'neighbor' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <RadioGroupItem value="neighbor" id="neighbor" />
                  <Label htmlFor="neighbor" className="cursor-pointer flex-1">Leave with neighbor</Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${form.watch('fallbackOption') === 'call' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <RadioGroupItem value="call" id="call" />
                  <Label htmlFor="call" className="cursor-pointer flex-1">Call me to reschedule</Label>
                </div>
                <div className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${form.watch('fallbackOption') === 'security' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                  <RadioGroupItem value="security" id="security" />
                  <Label htmlFor="security" className="cursor-pointer flex-1">Leave with security guard</Label>
                </div>
              </RadioGroup>
              {form.formState.errors.fallbackOption && <p className="text-destructive text-xs">{form.formState.errors.fallbackOption.message}</p>}
            </div>

            {/* Special Notes */}
            <div className="space-y-3">
              <Label htmlFor="specialNote" className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Special Instructions
              </Label>
              <Controller
                control={form.control}
                name="specialNote"
                render={({ field }) => (
                  <VoiceInput 
                    as="textarea"
                    id="specialNote" 
                    placeholder="e.g., Ring the doorbell twice, beware of dog..." 
                    className="h-32 resize-none"
                    {...field} 
                  />
                )}
              />
            </div>

            <div className="pt-6 border-t border-border/40 flex justify-end">
              <Button type="submit" size="lg" className="w-full md:w-auto">
                Save Preferences <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
