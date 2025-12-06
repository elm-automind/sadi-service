import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Brain, Zap, Target, Shield, MapPin, LogIn, Sparkles, CheckCircle, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useEffect, useState } from "react";

export default function Home() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [isPaymentRedirect, setIsPaymentRedirect] = useState(false);

  useEffect(() => {
    // Check if this is a payment gateway redirect (has ?data= parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
      // This is a payment redirect - show success page
      setIsPaymentRedirect(true);
      
      // Signal to other windows/tabs that payment is complete
      localStorage.setItem("paymentCompleted", Date.now().toString());
      sessionStorage.setItem("paymentCompleted", Date.now().toString());
    }
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  // Show payment success page if this is a payment redirect
  if (isPaymentRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('payment.success')}
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {t('payment.successMessage')}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                {t('payment.canCloseWindow')}
              </p>
            </div>
            
            <Button 
              onClick={handleCloseWindow}
              size="lg"
              className="w-full"
              data-testid="button-close-window"
            >
              <X className="w-4 h-4 mr-2" />
              {t('payment.closeWindow')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[20%] left-[5%] w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-[50%] right-[30%] w-[200px] h-[200px] bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="absolute top-4 right-4 flex items-center gap-2 rtl-no-flip">
        <LanguageSwitcher />
        <Link href="/login">
          <Button variant="ghost" className="gap-2" data-testid="link-login">
            <LogIn className="w-4 h-4" /> {t('auth.login')}
          </Button>
        </Link>
      </div>

      <div className="max-w-lg w-full space-y-10 text-center">
        {/* Logo and Brand */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/25">
            <Brain className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
            {isRTL ? 'مَرّي' : 'Marri'}
          </h1>
          
          <p className="text-xl text-muted-foreground font-medium flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('home.tagline')}
            <Sparkles className="w-5 h-5 text-primary" />
          </p>
          
          <p className="text-muted-foreground text-base max-w-sm mx-auto">
            {t('home.description')}
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 rtl-no-flip">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-md">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-start flex-1">
                <h3 className="font-semibold">{t('home.smartRouting')}</h3>
                <p className="text-xs text-muted-foreground">{t('home.smartRoutingDesc')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 rtl-no-flip">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-md">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-start flex-1">
                <h3 className="font-semibold">{t('home.preciseDelivery')}</h3>
                <p className="text-xs text-muted-foreground">{t('home.preciseDeliveryDesc')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4 rtl-no-flip">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-md">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-start flex-1">
                <h3 className="font-semibold">{t('home.trustedNetwork')}</h3>
                <p className="text-xs text-muted-foreground">{t('home.trustedNetworkDesc')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Button */}
        <div className="pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <Link href="/register-type">
            <Button size="lg" className="w-full text-lg h-14 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group" data-testid="button-start-registration">
              {t('home.getStarted')}
              <ArrowRight className="ms-2 w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
            </Button>
          </Link>
          
          <p className="text-xs text-muted-foreground mt-4">
            {t('home.joinNetwork')}
          </p>
        </div>
      </div>
      
      <footer className="absolute bottom-6 text-center text-xs text-muted-foreground">
        &copy; 2025 {isRTL ? 'مَرّي' : 'Marri'}. {t('home.copyright')}
      </footer>
    </div>
  );
}
