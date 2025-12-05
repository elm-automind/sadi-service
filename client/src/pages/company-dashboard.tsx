import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { 
  Building2, LogOut, Package, Users, TrendingUp, 
  MapPin, CreditCard, Edit2, Check, Loader2, Plus, Trash2, UserCog, Upload, Star, AlertTriangle, CheckCircle2
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface CompanyDriver {
  id: number;
  driverId: string;
  name: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

interface DeliveryStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  avgLocationScore: number;
}

interface AddressDeliveryStats {
  addressDigitalId: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  avgLocationScore: number;
  creditScore: number;
  lastDeliveryDate: string | null;
  lat: number | null;
  lng: number | null;
  textAddress: string | null;
}

interface HotspotPoint {
  lat: number;
  lng: number;
  addressDigitalId: string;
  lookupCount: number;
  completedCount: number;
  failedCount: number;
  avgLocationScore: number;
  successRate: number;
  lastEventAt: string | null;
  textAddress: string | null;
  intensity: number;
}

interface DeliveryHotspots {
  points: HotspotPoint[];
  summary: {
    totalLookups: number;
    totalCompleted: number;
    totalFailed: number;
    avgSuccessRate: number;
    avgLocationScore: number;
    uniqueAddresses: number;
  };
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const getHotspotIcon = (intensity: number, completedCount: number) => {
  let color = "#3b82f6";
  let size = 20;
  
  if (intensity >= 0.7) {
    color = completedCount > 0 ? "#22c55e" : "#ef4444";
    size = 30;
  } else if (intensity >= 0.4) {
    color = completedCount > 0 ? "#84cc16" : "#f97316";
    size = 25;
  } else {
    color = completedCount > 0 ? "#60a5fa" : "#a855f7";
    size = 20;
  }
  
  return L.divIcon({
    className: "hotspot-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      opacity: 0.85;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const getIntensityKey = (intensity: number): { key: string; color: string } => {
  if (intensity >= 0.7) return { key: "high", color: "text-red-600" };
  if (intensity >= 0.4) return { key: "medium", color: "text-yellow-600" };
  return { key: "low", color: "text-blue-600" };
};

const getCreditScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
};

const getCreditScoreBadge = (score: number): string => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
};

const addressFormSchema = z.object({
  street: z.string().min(3, "Street is required"),
  district: z.string().min(2, "District is required"),
  city: z.string().min(2, "City is required"),
});

const driverFormSchema = z.object({
  driverId: z.string().min(3, "Driver ID is required"),
  name: z.string().min(2, "Driver name is required"),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

type AddressFormData = z.infer<typeof addressFormSchema>;
type DriverFormData = z.infer<typeof driverFormSchema>;

export default function CompanyDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [bulkUploadText, setBulkUploadText] = useState("");
  const [editingDriver, setEditingDriver] = useState<CompanyDriver | null>(null);
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

  const { data: drivers = [] } = useQuery<CompanyDriver[]>({
    queryKey: ["/api/company/drivers"],
    queryFn: async () => {
      const res = await fetch("/api/company/drivers", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && user.accountType === "company",
  });

  const { data: deliveryStats } = useQuery<DeliveryStats>({
    queryKey: ["/api/company/delivery-stats"],
    queryFn: async () => {
      const res = await fetch("/api/company/delivery-stats", { credentials: "include" });
      if (!res.ok) return { totalDeliveries: 0, successfulDeliveries: 0, failedDeliveries: 0, successRate: 0, avgLocationScore: 0 };
      return res.json();
    },
    enabled: !!user && user.accountType === "company",
  });

  const { data: addressDeliveryStats = [] } = useQuery<AddressDeliveryStats[]>({
    queryKey: ["/api/company/address-delivery-stats"],
    queryFn: async () => {
      const res = await fetch("/api/company/address-delivery-stats", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && user.accountType === "company",
  });

  const { data: deliveryHotspots } = useQuery<DeliveryHotspots>({
    queryKey: ["/api/company/delivery-hotspots"],
    queryFn: async () => {
      const res = await fetch("/api/company/delivery-hotspots", { credentials: "include" });
      if (!res.ok) return { points: [], summary: { totalLookups: 0, totalCompleted: 0, totalFailed: 0, avgSuccessRate: 0, avgLocationScore: 0, uniqueAddresses: 0 } };
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

  const driverForm = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      driverId: "",
      name: "",
      phone: "",
      status: "active",
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

  useEffect(() => {
    if (editingDriver) {
      driverForm.reset({
        driverId: editingDriver.driverId,
        name: editingDriver.name,
        phone: editingDriver.phone || "",
        status: editingDriver.status as "active" | "inactive" | "suspended",
      });
    } else {
      driverForm.reset({
        driverId: "",
        name: "",
        phone: "",
        status: "active",
      });
    }
  }, [editingDriver]);

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/subscription"] });
      
      if (data.payment?.paymentUrl) {
        toast({
          title: t('company.redirectingToPayment'),
          description: t('company.paymentPageOpening'),
        });
        window.location.href = data.payment.paymentUrl;
        return;
      }
      
      toast({
        title: t('company.subscriptionUpdated'),
        description: t('company.planUpdatedSuccess'),
      });
      if (data.invoice?.invoiceId) {
        toast({
          title: t('company.invoiceGenerated'),
          description: t('company.invoiceGeneratedSuccess'),
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('company.invoiceError'),
        description: error.message || t('company.invoiceGenerationFailed'),
      });
    },
  });

  const createDriverMutation = useMutation({
    mutationFn: async (data: DriverFormData) => {
      const res = await apiRequest("POST", "/api/company/drivers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/drivers"] });
      setIsDriverDialogOpen(false);
      setEditingDriver(null);
      driverForm.reset();
      toast({
        title: "Driver Added",
        description: "The driver has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add driver",
      });
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DriverFormData> }) => {
      const res = await apiRequest("PUT", `/api/company/drivers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/drivers"] });
      setIsDriverDialogOpen(false);
      setEditingDriver(null);
      driverForm.reset();
      toast({
        title: "Driver Updated",
        description: "The driver has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update driver",
      });
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/company/drivers/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/drivers"] });
      toast({
        title: "Driver Removed",
        description: "The driver has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove driver",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (drivers: { driverId: string; name: string; phone?: string }[]) => {
      const res = await apiRequest("POST", "/api/company/drivers/bulk", { drivers });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/drivers"] });
      setIsBulkUploadDialogOpen(false);
      setBulkUploadText("");
      toast({
        title: "Bulk Upload Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to upload drivers",
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

  const handleDriverSubmit = (data: DriverFormData) => {
    if (editingDriver) {
      updateDriverMutation.mutate({ id: editingDriver.id, data });
    } else {
      createDriverMutation.mutate(data);
    }
  };

  const handleSelectPlan = (planId: number) => {
    if (!pricingPlans || pricingPlans.length === 0) return;
    setSelectedPlanId(planId);
    if (hasSubscription) {
      subscriptionMutation.mutate({
        pricingPlanId: planId,
        billingCycle: isAnnual ? "annual" : "monthly",
      });
    }
  };

  const handleBillingToggle = (annual: boolean) => {
    setIsAnnual(annual);
    if (hasSubscription && selectedPlanId && pricingPlans && pricingPlans.length > 0) {
      subscriptionMutation.mutate({
        pricingPlanId: selectedPlanId,
        billingCycle: annual ? "annual" : "monthly",
      });
    }
  };

  const openAddDriver = () => {
    setEditingDriver(null);
    driverForm.reset({
      driverId: "",
      name: "",
      phone: "",
      status: "active",
    });
    setIsDriverDialogOpen(true);
  };

  const openEditDriver = (driver: CompanyDriver) => {
    setEditingDriver(driver);
    setIsDriverDialogOpen(true);
  };

  const parseBulkDrivers = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const drivers: { driverId: string; name: string; phone?: string }[] = [];
    
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length >= 2) {
        drivers.push({
          driverId: parts[0],
          name: parts[1],
          phone: parts[2] || undefined,
        });
      }
    }
    return drivers;
  };

  const handleBulkUpload = () => {
    const drivers = parseBulkDrivers(bulkUploadText);
    if (drivers.length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid Format",
        description: "Please enter at least one driver with format: DriverID, Name, Phone (optional)",
      });
      return;
    }
    bulkUploadMutation.mutate(drivers);
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
  const hasSubscription = !!subscriptionData?.subscription;
  const annualDiscount = 15;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Inactive</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!hasSubscription) {
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
            <div className="flex items-center gap-2 rtl-no-flip">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 me-2" /> {t('auth.logout')}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="text-center py-8">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('company.selectPricingPlan')}</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              {t('company.chooseSubscriptionPlan')}
            </p>

            <div className="flex items-center justify-center gap-3 p-3 bg-muted rounded-lg max-w-xs mx-auto mb-8">
              <span className={`text-sm ${!isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {t('company.monthly')}
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={handleBillingToggle}
                data-testid="switch-billing-cycle"
              />
              <span className={`text-sm ${isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {t('company.annual')}
                <Badge variant="secondary" className="ms-2 text-xs">{t('company.savePercent', { percent: annualDiscount })}</Badge>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans?.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
              const isPopular = plan.slug === "standard";
              const isRecommended = plan.slug === "pro";
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                  } ${isPopular || isRecommended ? 'border-primary/50' : ''}`}
                  onClick={() => setSelectedPlanId(plan.id)}
                  data-testid={`card-plan-${plan.slug}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">{t('company.mostPopular')}</Badge>
                    </div>
                  )}
                  {isRecommended && !isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-green-600">{t('company.recommended')}</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-6">
                    <CardTitle className="text-xl flex items-center justify-between gap-2">
                      {plan.name}
                      {isSelected && <Check className="w-5 h-5 text-primary" />}
                    </CardTitle>
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">{t('company.sar')}</span>
                      <span className="text-4xl font-bold ms-1">{price}</span>
                      <span className="text-muted-foreground">/{isAnnual ? t('company.year') : t('company.month')}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-4">{t('company.planIncludes')}</p>
                    <ul className="space-y-3 text-sm">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full mt-6" 
                      variant={isSelected ? "default" : "outline"}
                      disabled={subscriptionMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          subscriptionMutation.mutate({
                            pricingPlanId: plan.id,
                            billingCycle: isAnnual ? "annual" : "monthly",
                          });
                        } else {
                          setSelectedPlanId(plan.id);
                        }
                      }}
                      data-testid={`button-select-${plan.slug}`}
                    >
                      {subscriptionMutation.isPending && selectedPlanId === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin me-2" />
                          {t('company.subscribing')}
                        </>
                      ) : isSelected ? (
                        t('company.getStarted')
                      ) : (
                        t('company.selectPlan')
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {t('company.annualDiscount')}
          </p>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 rtl-no-flip">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 me-2" /> {t('auth.logout')}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deliveries</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-deliveries">{deliveryStats?.totalDeliveries || 0}</p>
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
                  <p className="text-sm text-muted-foreground">Active Drivers</p>
                  <p className="text-3xl font-bold text-foreground">{drivers.filter(d => d.status === "active").length}</p>
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
                  <p className="text-3xl font-bold text-foreground" data-testid="text-success-rate">{deliveryStats?.successRate || 0}%</p>
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
                  <p className="text-sm text-muted-foreground">Total Drivers</p>
                  <p className="text-3xl font-bold text-foreground">{drivers.length}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <UserCog className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-primary" />
                  Driver Management
                </CardTitle>
                <CardDescription>
                  Add and manage your delivery drivers
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(true)} data-testid="button-bulk-upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button onClick={openAddDriver} data-testid="button-add-driver">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Driver
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {drivers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                      <TableCell className="font-mono font-medium">{driver.driverId}</TableCell>
                      <TableCell>{driver.name}</TableCell>
                      <TableCell>{driver.phone || "-"}</TableCell>
                      <TableCell>{getStatusBadge(driver.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditDriver(driver)}
                            data-testid={`button-edit-driver-${driver.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteDriverMutation.mutate(driver.id)}
                            disabled={deleteDriverMutation.isPending}
                            data-testid={`button-delete-driver-${driver.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserCog className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No drivers added yet</p>
                <p className="text-sm">Add drivers to validate their IDs during delivery</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Delivery Credit Scores
                </CardTitle>
                <CardDescription>
                  Address credit scores based on delivery feedback
                </CardDescription>
              </div>
              {deliveryStats && (
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600" data-testid="text-successful-deliveries">{deliveryStats.successfulDeliveries}</p>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600" data-testid="text-failed-deliveries">{deliveryStats.failedDeliveries}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600" data-testid="text-avg-location-score">{deliveryStats.avgLocationScore}</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {addressDeliveryStats.length > 0 ? (
              <div className="space-y-6">
                <div className="h-[300px] rounded-lg overflow-hidden border">
                  <MapContainer
                    center={[
                      addressDeliveryStats[0]?.lat || 24.7136,
                      addressDeliveryStats[0]?.lng || 46.6753
                    ]}
                    zoom={10}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {addressDeliveryStats.filter(addr => addr.lat && addr.lng).map((addr) => (
                      <Marker 
                        key={addr.addressDigitalId} 
                        position={[addr.lat!, addr.lng!]}
                        icon={defaultIcon}
                      >
                        <Popup>
                          <div className="p-1">
                            <p className="font-semibold text-sm">{addr.addressDigitalId}</p>
                            <p className="text-xs text-muted-foreground mb-2">{addr.textAddress || "Address"}</p>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs">Credit Score:</span>
                              <span className={`font-bold ${getCreditScoreColor(addr.creditScore)}`}>{addr.creditScore}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-green-600">{addr.successfulDeliveries} delivered</span>
                              {" / "}
                              <span className="text-red-600">{addr.failedDeliveries} failed</span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address ID</TableHead>
                      <TableHead>Credit Score</TableHead>
                      <TableHead>Deliveries</TableHead>
                      <TableHead>Location Score</TableHead>
                      <TableHead>Last Delivery</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addressDeliveryStats.map((addr) => (
                      <TableRow key={addr.addressDigitalId} data-testid={`row-address-${addr.addressDigitalId}`}>
                        <TableCell className="font-mono font-medium">{addr.addressDigitalId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${getCreditScoreColor(addr.creditScore)}`}>
                              {addr.creditScore}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {getCreditScoreBadge(addr.creditScore)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>{addr.successfulDeliveries}</span>
                            <AlertTriangle className="w-4 h-4 text-red-600 ml-2" />
                            <span>{addr.failedDeliveries}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{addr.avgLocationScore}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {addr.lastDeliveryDate 
                            ? new Date(addr.lastDeliveryDate).toLocaleDateString()
                            : "-"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No delivery data available yet</p>
                <p className="text-sm">Credit scores will appear here as drivers submit feedback</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Hotspots Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {t("dashboard.deliveryHotspots")}
                </CardTitle>
                <CardDescription>
                  {t("dashboard.deliveryHotspotsDesc")}
                </CardDescription>
              </div>
              {deliveryHotspots?.summary && (
                <div className="flex gap-4 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-total-lookups">{deliveryHotspots.summary.totalLookups}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.totalLookups")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600" data-testid="text-completed-deliveries">{deliveryHotspots.summary.totalCompleted}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.completedDeliveries")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600" data-testid="text-failed-hotspots">{deliveryHotspots.summary.totalFailed}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.failedDeliveries")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600" data-testid="text-unique-addresses">{deliveryHotspots.summary.uniqueAddresses}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.uniqueAddresses")}</p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {deliveryHotspots?.points && deliveryHotspots.points.length > 0 ? (
              <div className="space-y-6">
                <div className="h-[400px] rounded-lg overflow-hidden border">
                  <MapContainer
                    center={[
                      deliveryHotspots.points[0]?.lat || 24.7136,
                      deliveryHotspots.points[0]?.lng || 46.6753
                    ]}
                    zoom={11}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {deliveryHotspots.points.map((point) => (
                      <Marker 
                        key={point.addressDigitalId} 
                        position={[point.lat, point.lng]}
                        icon={getHotspotIcon(point.intensity, point.completedCount)}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <p className="font-semibold text-sm mb-1">{point.addressDigitalId}</p>
                            <p className="text-xs text-muted-foreground mb-3">{point.textAddress || t("common.address")}</p>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("dashboard.totalLookups")}:</span>
                                <span className="font-semibold text-blue-600">{point.lookupCount}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("dashboard.completedDeliveries")}:</span>
                                <span className="font-semibold text-green-600">{point.completedCount}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("dashboard.failedDeliveries")}:</span>
                                <span className="font-semibold text-red-600">{point.failedCount}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("dashboard.successRate")}:</span>
                                <span className="font-semibold">{point.successRate}%</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("dashboard.intensity")}:</span>
                                <span className={`font-semibold ${getIntensityKey(point.intensity).color}`}>
                                  {t(`dashboard.${getIntensityKey(point.intensity).key}`)}
                                </span>
                              </div>
                              {point.lastEventAt && (
                                <div className="flex items-center justify-between text-xs pt-1 border-t">
                                  <span className="text-muted-foreground">{t("dashboard.lastActivity")}:</span>
                                  <span className="text-muted-foreground">{new Date(point.lastEventAt).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                    <span className="text-muted-foreground">{t("dashboard.high")} + {t("dashboard.completedDeliveries")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-lime-500 border-2 border-white shadow-sm"></div>
                    <span className="text-muted-foreground">{t("dashboard.medium")} + {t("dashboard.completedDeliveries")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-sm"></div>
                    <span className="text-muted-foreground">{t("dashboard.low")} + {t("dashboard.completedDeliveries")}</span>
                  </div>
                </div>

                {/* Hotspots Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard.addressId")}</TableHead>
                      <TableHead>{t("dashboard.totalLookups")}</TableHead>
                      <TableHead>{t("dashboard.deliveries")}</TableHead>
                      <TableHead>{t("dashboard.successRate")}</TableHead>
                      <TableHead>{t("dashboard.intensity")}</TableHead>
                      <TableHead>{t("dashboard.lastActivity")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryHotspots.points.slice(0, 10).map((point) => (
                      <TableRow key={point.addressDigitalId} data-testid={`row-hotspot-${point.addressDigitalId}`}>
                        <TableCell className="font-mono font-medium">{point.addressDigitalId}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-blue-600">
                            {point.lookupCount} {t("dashboard.lookups")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>{point.completedCount}</span>
                            <AlertTriangle className="w-4 h-4 text-red-600 ml-2" />
                            <span>{point.failedCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={point.successRate >= 80 ? "text-green-600 font-semibold" : point.successRate >= 50 ? "text-yellow-600" : "text-red-600"}>
                            {point.successRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getIntensityKey(point.intensity).color}
                          >
                            {t(`dashboard.${getIntensityKey(point.intensity).key}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {point.lastEventAt 
                            ? new Date(point.lastEventAt).toLocaleDateString()
                            : "-"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>{t("dashboard.noHotspotData")}</p>
                <p className="text-sm">{t("dashboard.hotspotsAppear")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={driverForm.handleSubmit(handleDriverSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverId">Driver ID</Label>
                <Input
                  id="driverId"
                  placeholder="Enter unique driver ID"
                  {...driverForm.register("driverId")}
                  data-testid="input-driver-id"
                />
                {driverForm.formState.errors.driverId && (
                  <p className="text-sm text-destructive">{driverForm.formState.errors.driverId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name</Label>
                <Input
                  id="name"
                  placeholder="Enter driver's full name"
                  {...driverForm.register("name")}
                  data-testid="input-driver-name"
                />
                {driverForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{driverForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  {...driverForm.register("phone")}
                  data-testid="input-driver-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={driverForm.watch("status")}
                  onValueChange={(value) => driverForm.setValue("status", value as "active" | "inactive" | "suspended")}
                >
                  <SelectTrigger data-testid="select-driver-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDriverDialogOpen(false);
                    setEditingDriver(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createDriverMutation.isPending || updateDriverMutation.isPending}
                  data-testid="button-save-driver"
                >
                  {(createDriverMutation.isPending || updateDriverMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingDriver ? (
                    "Update Driver"
                  ) : (
                    "Add Driver"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Bulk Upload Drivers
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-drivers">Driver List</Label>
                <Textarea
                  id="bulk-drivers"
                  placeholder="Paste driver list here. One driver per line in format:
DriverID, Name, Phone (optional)

Example:
DRV001, Ahmed Ali, 0501234567
DRV002, Mohammed Hassan
DRV003, Khalid Omar, 0551234567"
                  className="h-48 font-mono text-sm"
                  value={bulkUploadText}
                  onChange={(e) => setBulkUploadText(e.target.value)}
                  data-testid="textarea-bulk-drivers"
                />
                <p className="text-xs text-muted-foreground">
                  Each line should contain: Driver ID, Name, Phone (optional) - separated by commas or tabs
                </p>
              </div>
              {bulkUploadText && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Preview: {parseBulkDrivers(bulkUploadText).length} driver(s) detected</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkUploadDialogOpen(false);
                  setBulkUploadText("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={bulkUploadMutation.isPending || !bulkUploadText.trim()}
                data-testid="button-submit-bulk"
              >
                {bulkUploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Drivers
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
