import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Lock, ArrowRight, Home, ArrowLeft } from "lucide-react";
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
    const usersDb = JSON.parse(localStorage.getItem("usersDb") || "{}");
    let foundUser = null;

    // Naive search for user by email or ID
    Object.values(usersDb).forEach((user: any) => {
      if (user.iqamaId === data.identifier || user.personalInfo.email === data.identifier) {
        if (user.password === data.password) {
          foundUser = user;
        }
      }
    });

    if (foundUser) {
      // Login successful
      const user = foundUser as any;
      localStorage.setItem("loggedInUserId", user.iqamaId);
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.personalInfo.name}`,
      });

      // Check address status
      if (user.addresses && user.addresses.length > 0) {
        // Has address -> Go to Preferences (Instructions & Fallback)
        setLocation("/preferences");
      } else {
        // No address -> Go to Add Address
        setLocation("/add-address");
      }
    } else {
      // Login failed
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials or user not found.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
      {/* Navigation Buttons */}
      <div className="absolute top-4 left-4 flex gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </Link>
      </div>

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
            
            <div className="text-center text-sm text-muted-foreground pt-4 border-t mt-4">
              Don't have an account?{" "}
              <Link href="/register">
                <Button variant="link" className="p-0 h-auto font-medium text-primary">
                  Register
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
