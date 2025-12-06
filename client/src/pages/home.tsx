import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, LogIn, Sparkles, CheckCircle, X, Truck, Package, Navigation, Clock, Star, QrCode, UserCheck, Map } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useEffect, useState } from "react";
import marriLogo from "@assets/image_1764984639532.png";

export default function Home() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [isPaymentRedirect, setIsPaymentRedirect] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
      setIsPaymentRedirect(true);
      localStorage.setItem("paymentCompleted", Date.now().toString());
      sessionStorage.setItem("paymentCompleted", Date.now().toString());
    }
  }, []);

  const handleCloseWindow = () => {
    window.close();
  };

  if (isPaymentRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('payment.success')}
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {t('payment.successMessage')}
            </p>
            
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('payment.canCloseWindow')}
              </p>
            </div>
            
            <Button 
              onClick={handleCloseWindow}
              size="lg"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute top-[5%] right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[25%] w-[250px] h-[250px] bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '4s' }} />
        
        {/* Decorative dots pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Floating delivery icons */}
        <div className="absolute top-[15%] left-[15%] text-primary/10 float-animation">
          <Truck className="w-16 h-16" />
        </div>
        <div className="absolute bottom-[25%] right-[12%] text-primary/10 float-animation" style={{ animationDelay: '1s' }}>
          <Package className="w-12 h-12" />
        </div>
        <div className="absolute top-[60%] left-[8%] text-primary/10 float-animation" style={{ animationDelay: '3s' }}>
          <MapPin className="w-10 h-10" />
        </div>
        <div className="absolute top-[20%] right-[20%] text-primary/10 float-animation" style={{ animationDelay: '2s' }}>
          <Navigation className="w-8 h-8" />
        </div>
      </div>
      
      {/* Header */}
      <div className="absolute top-4 right-4 flex items-center gap-2 rtl-no-flip z-10">
        <LanguageSwitcher />
        <Link href="/login">
          <Button variant="outline" className="gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-border/50 shadow-sm" data-testid="link-login">
            <LogIn className="w-4 h-4" /> {t('auth.login')}
          </Button>
        </Link>
      </div>

      <div className="max-w-xl w-full space-y-10 text-center relative z-10">
        {/* Logo and Brand */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* 3D Logo with intelligent effects */}
          <div className="relative mx-auto w-32 h-32 group">
            {/* Outer glow ring - pulsing */}
            <div className="absolute inset-[-8px] bg-gradient-to-br from-blue-400/30 via-indigo-500/30 to-cyan-400/30 rounded-3xl blur-xl opacity-60 pulse-glow" />
            
            {/* Secondary glow layer for depth */}
            <div className="absolute inset-[-4px] bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-2xl blur-md" />
            
            {/* 3D base shadow */}
            <div className="absolute inset-0 translate-y-2 bg-slate-900/30 rounded-2xl blur-lg" />
            
            {/* Main logo container with 3D transform */}
            <div 
              className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/40 transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-500/60"
              style={{
                transform: 'perspective(1000px) rotateX(2deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10 z-10 pointer-events-none" />
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Logo image */}
              <img 
                src={marriLogo} 
                alt="Marri Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Floating particles for intelligence effect */}
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg shadow-amber-500/50 float-animation" style={{ animationDelay: '0s' }} />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-lg shadow-cyan-500/50 float-animation" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 -right-3 w-2 h-2 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full shadow-lg shadow-purple-500/50 float-animation" style={{ animationDelay: '2s' }} />
          </div>
          
          <div className="space-y-3 mt-2">
            <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
              {t('home.description')}
            </p>
          </div>
        </div>

        {/* Feature Cards - Actual Platform Features */}
        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <Card className="glass-card premium-card border-0 shadow-lg">
            <CardContent className="p-5 flex items-center gap-5 rtl-no-flip">
              <div className="p-3.5 icon-container-blue rounded-xl text-white">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="text-start flex-1">
                <h3 className="font-semibold text-lg text-foreground">{t('home.digitalAddressId')}</h3>
                <p className="text-sm text-muted-foreground">{t('home.digitalAddressIdDesc')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
            </CardContent>
          </Card>
          
          <Card className="glass-card premium-card border-0 shadow-lg">
            <CardContent className="p-5 flex items-center gap-5 rtl-no-flip">
              <div className="p-3.5 icon-container-green rounded-xl text-white">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="text-start flex-1">
                <h3 className="font-semibold text-lg text-foreground">{t('home.driverVerification')}</h3>
                <p className="text-sm text-muted-foreground">{t('home.driverVerificationDesc')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
            </CardContent>
          </Card>

          <Card className="glass-card premium-card border-0 shadow-lg">
            <CardContent className="p-5 flex items-center gap-5 rtl-no-flip">
              <div className="p-3.5 icon-container-purple rounded-xl text-white">
                <Map className="w-6 h-6" />
              </div>
              <div className="text-start flex-1">
                <h3 className="font-semibold text-lg text-foreground">{t('home.deliveryHotspots')}</h3>
                <p className="text-sm text-muted-foreground">{t('home.deliveryHotspotsDesc')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <div>
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
            <p className="text-xs text-muted-foreground">5.0 Rating</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-2xl font-bold text-foreground">99.5%</p>
            <p className="text-xs text-muted-foreground">Delivery Success</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-lg font-bold text-foreground">2x</span>
            </div>
            <p className="text-xs text-muted-foreground">Faster Delivery</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <Link href="/register-type">
            <Button 
              size="lg" 
              className="w-full text-lg h-14 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 group border-0" 
              data-testid="button-start-registration"
            >
              {t('home.getStarted')}
              <ArrowRight className="ms-2 w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
            </Button>
          </Link>
          
          <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {t('home.joinNetwork')}
          </p>
        </div>
      </div>
      
      <footer className="absolute bottom-6 text-center text-sm text-muted-foreground">
        <span className="opacity-60">&copy; 2025 {isRTL ? 'مَرّي' : 'Marri'}. {t('home.copyright')}</span>
      </footer>
    </div>
  );
}
