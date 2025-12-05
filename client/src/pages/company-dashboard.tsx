import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, LogOut, Package, Users, TrendingUp, 
  BarChart3, MapPin, Settings
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  accountType: string;
  email: string;
  phone: string;
  name: string;
}

export default function CompanyDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

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
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Delivery Overview
              </CardTitle>
              <CardDescription>
                Your delivery statistics and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No delivery data yet</p>
                  <p className="text-sm">Start accepting deliveries to see statistics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage your company settings and operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Package className="w-4 h-4 mr-2" />
                View Deliveries
                <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Users className="w-4 h-4 mr-2" />
                Manage Customers
                <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <MapPin className="w-4 h-4 mr-2" />
                Route Planning
                <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Settings className="w-4 h-4 mr-2" />
                Company Settings
                <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Welcome to your Company Dashboard</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your company account is ready. We're working on adding more features including 
                  delivery management, route optimization, and customer tracking. Stay tuned!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
