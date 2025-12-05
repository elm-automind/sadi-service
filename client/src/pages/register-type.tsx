import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Building2, ArrowLeft, ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function RegisterType() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
        <LanguageSwitcher />
      </div>

      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('registerType.chooseAccountType')}</h1>
          <p className="text-muted-foreground">
            {t('registerType.selectAccountType')}
          </p>
        </div>

        <div className="grid gap-4">
          <Link href="/register">
            <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group" data-testid="card-individual-registration">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{t('registerType.individualRegistration')}</CardTitle>
                    <CardDescription>
                      {t('registerType.forPersonalDelivery')}
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 ps-[72px]">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('registerType.registerWithIqama')}</li>
                  <li>• {t('registerType.addPersonalAddresses')}</li>
                  <li>• {t('registerType.setDeliveryPreferences')}</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/register/company">
            <Card className="cursor-pointer hover:shadow-lg hover:border-blue-500/50 transition-all group" data-testid="card-company-registration">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{t('registerType.companyRegistration')}</CardTitle>
                    <CardDescription>
                      {t('registerType.forLogisticsCompanies')}
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 ps-[72px]">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('registerType.registerWithUnifiedNumber')}</li>
                  <li>• {t('registerType.accessCompanyDashboard')}</li>
                  <li>• {t('registerType.manageDeliveryOperations')}</li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('registerType.backToHome')}
            </Button>
          </Link>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {t('registerType.alreadyHaveAccount')}{" "}
          <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
            {t('registerType.loginHere')}
          </Link>
        </div>
      </div>
    </div>
  );
}
