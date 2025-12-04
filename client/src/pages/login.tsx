import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Lock, Mail, FileText, Phone, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  identifier: z.string().min(3, "Email or ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginData) => {
    // Simulate login
    console.log("Logging in with:", data);
    
    // In a real app, we would verify credentials against the backend
    // For prototype, we'll just simulate success and redirect to success page with mock data
    // or a dashboard page (which we haven't built yet, so we'll just toast)
    
    toast({
      title: "Login Successful",
      description: "Welcome back!",
    });
    
    // Redirect to success page to show "dashboard" view (using existing success page for now)
    // In real app, this would go to /dashboard
    setLocation("/success"); 
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-primary">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or National ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="identifier" 
                  placeholder="name@example.com or ID" 
                  className="pl-9"
                  {...form.register("identifier")} 
                />
              </div>
              {form.formState.errors.identifier && (
                <p className="text-destructive text-xs">{form.formState.errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••" 
                  className="pl-9"
                  {...form.register("password")} 
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full mt-4">
              Log In <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            
            <div className="text-center text-sm text-muted-foreground pt-2">
              Don't have an account?{" "}
              <a href="/register" className="text-primary hover:underline font-medium">
                Register
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
