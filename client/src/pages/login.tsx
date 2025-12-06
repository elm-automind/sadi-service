import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { User, Lock, ArrowRight, Truck, Package, MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { PageNavigation } from "@/components/page-navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/language-switcher";
import marriLogo from "@assets/image_1764984639532.png";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 flex items-center justify-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] bg-gradient-to-br from-blue-400/15 to-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        
        <div className="absolute top-[20%] left-[10%] text-primary/10 float-animation">
          <Truck className="w-12 h-12" />
        </div>
        <div className="absolute bottom-[20%] right-[10%] text-primary/10 float-animation" style={{ animationDelay: '1s' }}>
          <Package className="w-10 h-10" />
        </div>
        <div className="absolute top-[60%] right-[15%] text-primary/10 float-animation" style={{ animationDelay: '2s' }}>
          <MapPin className="w-8 h-8" />
        </div>
      </div>
      
      <PageNavigation className="absolute top-4 start-4 z-10" />
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md relative z-10">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20">
            <img src={marriLogo} alt="Marri" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('auth.welcomeBack')}
            </CardTitle>
            <CardDescription className="mt-1">{t('auth.signInToContinue')}</CardDescription>
          </div>
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
                  className="ps-9 bg-slate-50/50 dark:bg-slate-800/50 border-border/50"
                  data-testid="input-identifier"
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
                  className="ps-9 bg-slate-50/50 dark:bg-slate-800/50 border-border/50"
                  data-testid="input-password"
                  {...form.register("password")} 
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20" 
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? t('common.loading') : t('auth.login')} 
              <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
            </Button>
            
            <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50 mt-4">
              {t('auth.dontHaveAccount')}{" "}
              <Link href="/register-type">
                <Button variant="link" className="p-0 h-auto font-medium text-blue-600 hover:text-blue-700">
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
