import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSessionActivity } from "@/hooks/use-session-activity";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import RegisterType from "@/pages/register-type";
import Register from "@/pages/register";
import RegisterCompany from "@/pages/register-company";
import Success from "@/pages/success";
import Login from "@/pages/login";
import ResetPassword from "@/pages/reset-password";
import AddAddress from "@/pages/add-address";
import EditAddress from "@/pages/edit-address";
import DeliveryPreferences from "@/pages/delivery-preferences";
import ViewAddress from "@/pages/view-address";
import Dashboard from "@/pages/dashboard";
import CompanyDashboard from "@/pages/company-dashboard";
import FallbackContact from "@/pages/fallback-contact";
import ViewFallback from "@/pages/view-fallback";
import EditFallback from "@/pages/edit-fallback";
import DriverLookup from "@/pages/driver-lookup";
import DriverFeedback from "@/pages/driver-feedback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register-type" component={RegisterType} />
      <Route path="/register" component={Register} />
      <Route path="/register/company" component={RegisterCompany} />
      <Route path="/success" component={Success} />
      <Route path="/login" component={Login} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/company-dashboard" component={CompanyDashboard} />
      <Route path="/add-address" component={AddAddress} />
      <Route path="/edit-address/:id" component={EditAddress} />
      <Route path="/preferences" component={DeliveryPreferences} />
      <Route path="/fallback-contact" component={FallbackContact} />
      <Route path="/view/:digitalId" component={ViewAddress} />
      <Route path="/view-fallback/:id" component={ViewFallback} />
      <Route path="/edit-fallback/:id" component={EditFallback} />
      <Route path="/driver" component={DriverLookup} />
      <Route path="/driver-feedback/:id" component={DriverFeedback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SessionActivityWrapper({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) {
        return null; // Return null for unauthenticated, don't throw
      }
      return res.json();
    },
    retry: false,
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: false,
  });

  const isLoggedIn = !isLoading && !!user;
  useSessionActivity(isLoggedIn);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SessionActivityWrapper>
          <Router />
        </SessionActivityWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
