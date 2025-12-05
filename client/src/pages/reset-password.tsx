import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle, KeyRound } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { PageNavigation } from "@/components/page-navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type EmailData = z.infer<typeof emailSchema>;
type ResetData = z.infer<typeof resetSchema>;

type Step = 'email' | 'otp' | 'password' | 'success';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const { toast } = useToast();

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
  });

  const resetForm = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (data: EmailData) => {
      const res = await apiRequest("POST", "/api/send-reset-otp", data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setEmail(emailForm.getValues('email'));
        setStep('otp');
        toast({
          title: "OTP Sent",
          description: "Check your email for the 6-digit code",
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again."
      });
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verify-otp", { email, otp });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setStep('password');
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: error.message || "The code is invalid or expired. Please try again."
      });
      setOtp('');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetData) => {
      const res = await apiRequest("POST", "/api/reset-password", {
        email,
        otp,
        password: data.password,
      });
      return await res.json();
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: "Password Reset",
        description: "Your password has been reset successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password. Please try again."
      });
    }
  });

  const handleOtpComplete = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      verifyOtpMutation.mutate();
    }
  };

  // Success Screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
        <PageNavigation className="absolute top-4 left-4" />

        <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been reset successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You can now log in with your new password.
            </p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-go-login">
                Go to Login <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password Step
  if (step === 'password') {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
        <PageNavigation className="absolute top-4 left-4" />

        <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-primary">Create New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={resetForm.handleSubmit((data) => resetPasswordMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••" 
                    className="pl-9"
                    data-testid="input-password"
                    {...resetForm.register("password")} 
                  />
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-destructive text-xs">{resetForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••" 
                    className="pl-9"
                    data-testid="input-confirm-password"
                    {...resetForm.register("confirmPassword")} 
                  />
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-destructive text-xs">{resetForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full mt-4" 
                disabled={resetPasswordMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"} 
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP Step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
        <PageNavigation className="absolute top-4 left-4" />

        <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">Enter OTP</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpComplete}
                data-testid="input-otp"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the code?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto font-medium text-primary"
                onClick={() => sendOtpMutation.mutate({ email })}
                disabled={sendOtpMutation.isPending}
              >
                Resend
              </Button>
            </p>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setStep('email');
                setOtp('');
              }}
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Change Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email Step (default)
  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
      <PageNavigation className="absolute top-4 left-4" />

      <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-primary">Reset Password</CardTitle>
          <CardDescription>Enter your email to receive a verification code</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={emailForm.handleSubmit((data) => sendOtpMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email"
                  placeholder="name@example.com" 
                  className="pl-9"
                  data-testid="input-email"
                  {...emailForm.register("email")} 
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-destructive text-xs">{emailForm.formState.errors.email.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full mt-4" 
              disabled={sendOtpMutation.isPending}
              data-testid="button-send-otp"
            >
              {sendOtpMutation.isPending ? "Sending..." : "Send OTP"} 
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            
            <div className="text-center text-sm text-muted-foreground pt-4 border-t mt-4">
              Remember your password?{" "}
              <Link href="/login">
                <Button variant="link" className="p-0 h-auto font-medium text-primary">
                  Log In
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
