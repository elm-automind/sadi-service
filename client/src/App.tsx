import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Register from "@/pages/register";
import Success from "@/pages/success";
import Login from "@/pages/login";
import AddAddress from "@/pages/add-address";
import DeliveryPreferences from "@/pages/delivery-preferences";
import ViewAddress from "@/pages/view-address";
import Dashboard from "@/pages/dashboard";
import FallbackContact from "@/pages/fallback-contact";
import ViewFallback from "@/pages/view-fallback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/success" component={Success} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/add-address" component={AddAddress} />
      <Route path="/preferences" component={DeliveryPreferences} />
      <Route path="/fallback-contact" component={FallbackContact} />
      <Route path="/view/:digitalId" component={ViewAddress} />
      <Route path="/view-fallback/:id" component={ViewFallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
