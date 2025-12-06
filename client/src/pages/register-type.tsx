import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Building2, ArrowLeft, ArrowRight, Truck, Package, MapPin, CheckCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import marriLogo from "@assets/image_1764984639532.png";

export default function RegisterType() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-gradient-to-br from-blue-400/15 to-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        
        <div className="absolute top-[15%] left-[8%] text-primary/10 float-animation">
          <Truck className="w-14 h-14" />
        </div>
        <div className="absolute bottom-[20%] right-[8%] text-primary/10 float-animation" style={{ animationDelay: '1s' }}>
          <Package className="w-10 h-10" />
        </div>
        <div className="absolute top-[50%] right-[5%] text-primary/10 float-animation" style={{ animationDelay: '2s' }}>
          <MapPin className="w-8 h-8" />
        </div>
      </div>
      
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="max-w-lg w-full space-y-8 relative z-10">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20">
            <img src={marriLogo} alt="Marri" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 dark:from-white dark:to-blue-200 bg-clip-text text-transparent">
              {t('registerType.chooseAccountType')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('registerType.selectAccountType')}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <Link href="/register">
            <Card className="cursor-pointer border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group" data-testid="card-individual-registration">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-xl icon-container-blue text-white group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{t('registerType.individualRegistration')}</CardTitle>
                    <CardDescription>
                      {t('registerType.forPersonalDelivery')}
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 ps-[76px]">
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {t('registerType.registerWithIqama')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {t('registerType.addPersonalAddresses')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {t('registerType.setDeliveryPreferences')}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/register/company">
            <Card className="cursor-pointer border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group" data-testid="card-company-registration">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-xl icon-container-purple text-white group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{t('registerType.companyRegistration')}</CardTitle>
                    <CardDescription>
                      {t('registerType.forLogisticsCompanies')}
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 ps-[76px]">
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {t('registerType.registerWithUnifiedNumber')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {t('registerType.accessCompanyDashboard')}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    {t('registerType.manageDeliveryOperations')}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center space-y-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('registerType.backToHome')}
            </Button>
          </Link>

          <p className="text-sm text-muted-foreground">
            {t('registerType.alreadyHaveAccount')}{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline" data-testid="link-login">
              {t('registerType.loginHere')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
