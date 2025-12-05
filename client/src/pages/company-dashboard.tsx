import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, LogOut, Package, Users, TrendingUp, 
  MapPin, CreditCard, Edit2, Check, X, Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  accountType: string;
  email: string;
  phone: string;
  name: string;
}

interface CompanyAddress {
  id: number;
  street: string;
  district: string;
  city: string;
}

interface PricingPlan {
  id: number;
  slug: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isDefault: boolean;
}

interface CompanySubscription {
  id: number;
  pricingPlanId: number;
  billingCycle: string;
  status: string;
}

const addressFormSchema = z.object({
  street: z.string().min(3, "Street is required"),
  district: z.string().min(2, "District is required"),
  city: z.string().min(2, "City is required"),
});

type AddressFormData = z.infer<typeof addressFormSchema>;

export default function CompanyDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
  });

  const { data: companyAddress } = useQuery<CompanyAddress | null>({
    queryKey: ["/api/company/address"],
    queryFn: async () => {
      const res = await fetch("/api/company/address", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && user.accountType === "company",
  });

  const { data: pricingPlans } = useQuery<PricingPlan[]>({
    queryKey: ["/api/pricing-plans"],
    queryFn: async () => {
      const res = await fetch("/api/pricing-plans", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && user.accountType === "company",
  });

  const { data: subscriptionData } = useQuery<{ subscription: CompanySubscription; plan: PricingPlan } | null>({
    queryKey: ["/api/company/subscription"],
    queryFn: async () => {
      const res = await fetch("/api/company/subscription", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && user.accountType === "company",
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      street: "",
      district: "",
      city: "",
    },
  });

  useEffect(() => {
    if (companyAddress) {
      addressForm.reset({
        street: companyAddress.street,
        district: companyAddress.district,
        city: companyAddress.city,
      });
    }
  }, [companyAddress]);

  useEffect(() => {
    if (subscriptionData) {
      setSelectedPlanId(subscriptionData.subscription.pricingPlanId);
      setIsAnnual(subscriptionData.subscription.billingCycle === "annual");
    }
  }, [subscriptionData]);

  const addressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const res = await apiRequest("PUT", "/api/company/address", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/address"] });
      setIsAddressDialogOpen(false);
      toast({
        title: "Address Updated",
        description: "Your company address has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update address",
      });
    },
  });

  const subscriptionMutation = useMutation({
    mutationFn: async (data: { pricingPlanId: number; billingCycle: string }) => {
      const res = await apiRequest("POST", "/api/company/subscription", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/subscription"] });
      toast({
        title: "Subscription Updated",
        description: "Your subscription plan has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update subscription",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
    if (!isLoading && user && user.accountType !== "company") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const handleLogout = async () => {
    await apiRequest("POST", "/api/logout", {});
    queryClient.removeQueries({ queryKey: ["/api/user"] });
    setLocation("/");
  };

  const handleAddressSubmit = (data: AddressFormData) => {
    addressMutation.mutate(data);
  };

  const handleSelectPlan = (planId: number) => {
    if (!pricingPlans || pricingPlans.length === 0) return;
    setSelectedPlanId(planId);
    subscriptionMutation.mutate({
      pricingPlanId: planId,
      billingCycle: isAnnual ? "annual" : "monthly",
    });
  };

  const handleBillingToggle = (annual: boolean) => {
    setIsAnnual(annual);
    if (selectedPlanId && pricingPlans && pricingPlans.length > 0) {
      subscriptionMutation.mutate({
        pricingPlanId: selectedPlanId,
        billingCycle: annual ? "annual" : "monthly",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const currentPlan = subscriptionData?.plan;
  const annualDiscount = 20;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-2xl border-2 border-blue-200">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deliveries</p>
                  <p className="text-3xl font-bold text-foreground">0</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Customers</p>
                  <p className="text-3xl font-bold text-foreground">0</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-3xl font-bold text-foreground">0%</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Routes</p>
                  <p className="text-3xl font-bold text-foreground">0</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Company Address
                  </CardTitle>
                  <CardDescription>
                    Your registered business address
                  </CardDescription>
                </div>
                <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-edit-address">
                      <Edit2 className="w-4 h-4 mr-2" />
                      {companyAddress ? "Edit" : "Add"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{companyAddress ? "Edit" : "Add"} Company Address</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="street">Street</Label>
                        <Input
                          id="street"
                          placeholder="Enter street address"
                          {...addressForm.register("street")}
                          data-testid="input-street"
                        />
                        {addressForm.formState.errors.street && (
                          <p className="text-sm text-destructive">{addressForm.formState.errors.street.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="district">District</Label>
                        <Input
                          id="district"
                          placeholder="Enter district"
                          {...addressForm.register("district")}
                          data-testid="input-district"
                        />
                        {addressForm.formState.errors.district && (
                          <p className="text-sm text-destructive">{addressForm.formState.errors.district.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="Enter city"
                          {...addressForm.register("city")}
                          data-testid="input-city"
                        />
                        {addressForm.formState.errors.city && (
                          <p className="text-sm text-destructive">{addressForm.formState.errors.city.message}</p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddressDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addressMutation.isPending} data-testid="button-save-address">
                          {addressMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Address"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {companyAddress ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{companyAddress.street}</p>
                      <p className="text-sm text-muted-foreground">{companyAddress.district}</p>
                      <p className="text-sm text-muted-foreground">{companyAddress.city}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No address registered yet</p>
                  <p className="text-sm">Add your company address to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your active subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentPlan ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
                        <Badge variant="secondary">{subscriptionData?.subscription.billingCycle}</Badge>
                      </div>
                      <p className="text-2xl font-bold text-primary mt-1">
                        ${subscriptionData?.subscription.billingCycle === "annual" ? currentPlan.annualPrice : currentPlan.monthlyPrice}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{subscriptionData?.subscription.billingCycle === "annual" ? "year" : "month"}
                        </span>
                      </p>
                    </div>
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    {currentPlan.features.slice(0, 3).map((feature, i) => (
                      <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        {feature}
                      </p>
                    ))}
                    {currentPlan.features.length > 3 && (
                      <p className="text-sm text-muted-foreground">+{currentPlan.features.length - 3} more features</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No active subscription</p>
                  <p className="text-sm">Select a plan below to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Subscription Plans
                </CardTitle>
                <CardDescription>
                  Choose the plan that fits your business needs
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                <span className={`text-sm ${!isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>Monthly</span>
                <Switch
                  checked={isAnnual}
                  onCheckedChange={handleBillingToggle}
                  data-testid="switch-billing-cycle"
                />
                <span className={`text-sm ${isAnnual ? 'font-semibold' : 'text-muted-foreground'}`}>
                  Annual
                  <Badge variant="secondary" className="ml-2 text-xs">Save {annualDiscount}%</Badge>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pricingPlans?.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                    } ${plan.isDefault ? 'border-primary/50' : ''}`}
                    onClick={() => handleSelectPlan(plan.id)}
                    data-testid={`card-plan-${plan.slug}`}
                  >
                    {plan.isDefault && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {plan.name}
                        {isSelected && <Check className="w-5 h-5 text-primary" />}
                      </CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">${price}</span>
                        <span className="text-muted-foreground">/{isAnnual ? 'year' : 'month'}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full mt-4" 
                        variant={isSelected ? "default" : "outline"}
                        disabled={subscriptionMutation.isPending}
                        data-testid={`button-select-${plan.slug}`}
                      >
                        {subscriptionMutation.isPending && selectedPlanId === plan.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSelected ? (
                          "Current Plan"
                        ) : (
                          "Select Plan"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
