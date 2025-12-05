import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
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
import { LanguageSwitcher } from "@/components/language-switcher";

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
  const { t } = useTranslation();
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
          title: t('auth.otpSent'),
          description: t('auth.checkEmailOtp'),
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('errors.somethingWentWrong'),
        description: error.message || t('errors.somethingWentWrong')
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
        title: t('auth.invalidOtp'),
        description: error.message || t('auth.invalidOtpDesc')
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
        title: t('auth.passwordReset'),
        description: t('auth.passwordResetSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('errors.somethingWentWrong'),
        description: error.message || t('errors.somethingWentWrong')
      });
    }
  });

  const handleOtpComplete = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      verifyOtpMutation.mutate();
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
        <PageNavigation className="absolute top-4 start-4" />
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>

        <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('auth.passwordResetComplete')}</CardTitle>
            <CardDescription>
              {t('auth.passwordResetSuccess')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('auth.canLoginNewPassword')}
            </p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-go-login">
                {t('auth.goToLogin')} <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
        <PageNavigation className="absolute top-4 start-4" />
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>

        <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-primary">{t('auth.createNewPassword')}</CardTitle>
            <CardDescription>{t('auth.enterNewPassword')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={resetForm.handleSubmit((data) => resetPasswordMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.newPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••" 
                    className="ps-9"
                    data-testid="input-password"
                    {...resetForm.register("password")} 
                  />
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-destructive text-xs">{resetForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••" 
                    className="ps-9"
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
                {resetPasswordMutation.isPending ? t('common.loading') : t('auth.resetPassword')} 
                <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
        <PageNavigation className="absolute top-4 start-4" />
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>

        <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">{t('auth.enterOtp')}</CardTitle>
            <CardDescription>
              {t('auth.sentCodeTo')} <span className="font-medium text-foreground">{email}</span>
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
              {t('auth.didntReceiveCode')}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto font-medium text-primary"
                onClick={() => sendOtpMutation.mutate({ email })}
                disabled={sendOtpMutation.isPending}
              >
                {t('auth.resend')}
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
              <ArrowLeft className="me-2 w-4 h-4 rtl:rotate-180" /> {t('auth.changeEmail')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
      <PageNavigation className="absolute top-4 start-4" />
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-primary">{t('auth.resetPassword')}</CardTitle>
          <CardDescription>{t('auth.enterEmailVerification')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={emailForm.handleSubmit((data) => sendOtpMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.emailAddress')}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email"
                  placeholder="name@example.com" 
                  className="ps-9"
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
              {sendOtpMutation.isPending ? t('common.loading') : t('auth.sendOtp')} 
              <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
            </Button>
            
            <div className="text-center text-sm text-muted-foreground pt-4 border-t mt-4">
              {t('auth.rememberPassword')}{" "}
              <Link href="/login">
                <Button variant="link" className="p-0 h-auto font-medium text-primary">
                  {t('auth.login')}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
