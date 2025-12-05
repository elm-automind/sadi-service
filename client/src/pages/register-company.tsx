import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LanguageSwitcher } from "@/components/language-switcher";

const companyTypeOptions = [
  "Logistics",
  "Courier",
  "E-commerce",
  "Marketplace",
  "Grocery",
  "Pharmacy",
] as const;

const companyRegisterSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  unifiedNumber: z.string().min(5, "Unified number is required"),
  companyType: z.enum(companyTypeOptions, { required_error: "Company type is required" }),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(0\d{9}|\+966\d{9})$/, "Phone must start with 0 or +966 followed by 9 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CompanyRegisterForm = z.infer<typeof companyRegisterSchema>;

export default function RegisterCompany() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyRegisterForm>({
    resolver: zodResolver(companyRegisterSchema),
  });

  const companyType = watch("companyType");

  const registerMutation = useMutation({
    mutationFn: async (data: CompanyRegisterForm) => {
      const { confirmPassword, ...registerData } = data;
      const response = await apiRequest("POST", "/api/register/company", registerData);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.resetQueries();
      toast({
        title: t('auth.registrationSuccessful'),
        description: t('auth.welcomeCompany'),
      });
      setLocation("/company-dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: t('register.registrationFailed'),
        description: error.message || t('errors.somethingWentWrong'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanyRegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{t('registerType.companyRegistration')}</CardTitle>
          <CardDescription>
            {t('auth.registerCompanyDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">{t('auth.companyName')}</Label>
              <Input
                id="companyName"
                placeholder={t('auth.enterCompanyName')}
                {...register("companyName")}
                data-testid="input-company-name"
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unifiedNumber">{t('auth.unifiedNumber')}</Label>
              <Input
                id="unifiedNumber"
                placeholder={t('auth.enterUnifiedNumber')}
                {...register("unifiedNumber")}
                data-testid="input-unified-number"
              />
              {errors.unifiedNumber && (
                <p className="text-sm text-destructive">{errors.unifiedNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyType">{t('auth.companyType')}</Label>
              <Select
                value={companyType}
                onValueChange={(value) => setValue("companyType", value as typeof companyTypeOptions[number])}
              >
                <SelectTrigger id="companyType" data-testid="select-company-type">
                  <SelectValue placeholder={t('auth.selectCompanyType')} />
                </SelectTrigger>
                <SelectContent>
                  {companyTypeOptions.map((type) => (
                    <SelectItem key={type} value={type} data-testid={`option-company-type-${type.toLowerCase()}`}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyType && (
                <p className="text-sm text-destructive">{errors.companyType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="company@example.com"
                {...register("email")}
                data-testid="input-email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('auth.mobileNumber')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="05xxxxxxxx"
                {...register("phone")}
                data-testid="input-phone"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                data-testid="input-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                data-testid="input-confirm-password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
              data-testid="button-register-company"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('common.registering')}
                </>
              ) : (
                t('auth.registerCompany')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <Link href="/register-type">
              <Button variant="ghost" className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('auth.backToAccountType')}
              </Button>
            </Link>

            <p className="text-sm text-muted-foreground">
              {t('registerType.alreadyHaveAccount')}{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                {t('registerType.loginHere')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
