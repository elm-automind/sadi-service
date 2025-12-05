import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ShieldCheck, Truck, MapPin, LogIn } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-3xl" />
      </div>
      
      <div className="absolute top-4 right-4 flex items-center gap-2 rtl-no-flip">
        <LanguageSwitcher />
        <Link href="/login">
          <Button variant="ghost" className="gap-2" data-testid="link-login">
            <LogIn className="w-4 h-4" /> {t('auth.login')}
          </Button>
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {t('home.secureDelivery', 'Secure Delivery')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('home.description', 'Register your profile and location for fast, accurate, and secure deliveries.')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 rtl-no-flip">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600">
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-start">
                <h3 className="font-semibold">{t('home.optimizedLogistics', 'Optimized Logistics')}</h3>
                <p className="text-xs text-muted-foreground">{t('home.preciseLocation', 'Precise location mapping')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 rtl-no-flip">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-start">
                <h3 className="font-semibold">{t('home.visualVerification', 'Visual Verification')}</h3>
                <p className="text-xs text-muted-foreground">{t('home.photoConfirmation', 'Photo-based address confirmation')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <Link href="/register-type">
            <Button size="lg" className="w-full text-lg h-12 shadow-lg hover:shadow-xl transition-all duration-300 group" data-testid="button-start-registration">
              {t('home.startRegistration', 'Start Registration')}
              <ArrowRight className="ms-2 w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
      
      <footer className="absolute bottom-6 text-center text-xs text-muted-foreground">
        &copy; 2025 {t('home.copyright', 'Secure Logistics System. All rights reserved.')}
      </footer>
    </div>
  );
}
