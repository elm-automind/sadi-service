import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { User, Lock, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { PageNavigation } from "@/components/page-navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/language-switcher";

const loginSchema = z.object({
  identifier: z.string().min(3, "Email or ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest("POST", "/api/login", data);
      return await res.json();
    },
    onSuccess: async (data) => {
      await queryClient.resetQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: t('auth.loginSuccess'),
        description: `${t('auth.welcomeBack')}, ${data.user.name}`,
      });
      
      if (data.user.accountType === "company") {
        setLocation("/company-dashboard");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('errors.somethingWentWrong'),
        description: error.message || t('auth.invalidCredentials')
      });
    }
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center relative">
      <PageNavigation className="absolute top-4 start-4" />
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/60 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-primary">{t('auth.welcomeBack')}</CardTitle>
          <CardDescription>{t('auth.signInToContinue')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('auth.email')} / {t('auth.iqamaId')}</Label>
              <div className="relative">
                <User className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="identifier" 
                  placeholder={`${t('auth.email')} / ${t('auth.iqamaId')}`}
                  className="ps-9"
                  {...form.register("identifier")} 
                />
              </div>
              {form.formState.errors.identifier && (
                <p className="text-destructive text-xs">{form.formState.errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center gap-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Link href="/reset-password">
                  <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary">
                    {t('auth.forgotPassword')}
                  </Button>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••" 
                  className="ps-9"
                  {...form.register("password")} 
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full mt-4" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? t('common.loading') : t('auth.login')} <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
            </Button>
            
            <div className="text-center text-sm text-muted-foreground pt-4 border-t mt-4">
              {t('auth.dontHaveAccount')}{" "}
              <Link href="/register-type">
                <Button variant="link" className="p-0 h-auto font-medium text-primary">
                  {t('auth.register')}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
