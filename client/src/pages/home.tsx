import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, LogIn, CheckCircle, X, Truck, Package, Navigation, Clock, Star, QrCode, Award, Map, Shield, Users, Building2, Smartphone, Globe, BarChart3 } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[25%] w-[250px] h-[250px] bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '4s' }} />
        
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <img src={marriLogo} alt="Marri" className="w-10 h-10 rounded-lg" />
          </div>
          <div className="flex items-center gap-2 rtl-no-flip">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="outline" className="gap-2 shadow-sm" data-testid="link-login">
                <LogIn className="w-4 h-4" /> {t('auth.login')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* 3D Logo */}
          <div className="relative mx-auto w-36 h-36 group animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="absolute inset-[-8px] bg-gradient-to-br from-blue-400/30 via-indigo-500/30 to-cyan-400/30 rounded-3xl blur-xl opacity-60 pulse-glow" />
            <div className="absolute inset-[-4px] bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-2xl blur-md" />
            <div className="absolute inset-0 translate-y-2 bg-slate-900/30 rounded-2xl blur-lg" />
            <div 
              className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/40 transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-500/60"
              style={{ transform: 'perspective(1000px) rotateX(2deg)', transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10 z-10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img src={marriLogo} alt="Marri Logo" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg shadow-amber-500/50 float-animation" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-lg shadow-cyan-500/50 float-animation" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 -right-3 w-2 h-2 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full shadow-lg shadow-purple-500/50 float-animation" style={{ animationDelay: '2s' }} />
          </div>
          
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                {t('home.tagline')}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('home.description')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <Link href="/register-type">
              <Button 
                size="lg" 
                className="text-lg h-14 px-8 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 group border-0" 
                data-testid="button-start-registration"
              >
                {t('home.getStarted')}
                <ArrowRight className="ms-2 w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg h-14 px-8 shadow-sm" data-testid="button-login-hero">
                {t('auth.login')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-2xl p-8 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1 text-amber-500">
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <p className="text-sm text-muted-foreground">5.0 {t('home.rating')}</p>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-foreground">99.5%</p>
                <p className="text-sm text-muted-foreground">{t('home.deliverySuccess')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-green-500" />
                  <span className="text-3xl font-bold text-foreground">2x</span>
                </div>
                <p className="text-sm text-muted-foreground">{t('home.fasterDelivery')}</p>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-foreground">50K+</p>
                <p className="text-sm text-muted-foreground">{t('home.registeredAddresses')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.whyChooseMarri')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.platformDescription')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass-card premium-card border-0 shadow-lg group">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl icon-container-blue flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{t('home.digitalAddressId')}</h3>
                <p className="text-muted-foreground">{t('home.digitalAddressIdDesc')}</p>
              </CardContent>
            </Card>
            
            <Card className="glass-card premium-card border-0 shadow-lg group">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl icon-container-green flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{t('home.driverVerification')}</h3>
                <p className="text-muted-foreground">{t('home.driverVerificationDesc')}</p>
              </CardContent>
            </Card>

            <Card className="glass-card premium-card border-0 shadow-lg group">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl icon-container-purple flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                  <Map className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{t('home.deliveryHotspots')}</h3>
                <p className="text-muted-foreground">{t('home.deliveryHotspotsDesc')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent dark:via-blue-950/20 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.howItWorks')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('home.threeSteps')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/30">
                1
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('home.registerAddress')}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t('home.registerAddressDesc')}
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-green-500/30">
                2
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('home.getDigitalId')}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t('home.getDigitalIdDesc')}
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/30">
                3
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t('home.receiveConfidence')}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t('home.receiveConfidenceDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Everyone Section */}
      <section className="py-16 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.forEveryone')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('home.forEveryoneDesc')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="glass-card premium-card border-0 shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl icon-container-blue flex items-center justify-center text-white">
                      <Users className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {t('home.forIndividuals')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('home.personalAddresses')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.registerMultiple')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.addFallback')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.setPreferences')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.shareQr')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card premium-card border-0 shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl icon-container-purple flex items-center justify-center text-white">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {t('home.forCompanies')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('home.logisticsCompanies')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.companyDashboard')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.driverManagement')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.deliveryAnalytics')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('home.flexiblePlans')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-slate-100/50 to-transparent dark:via-slate-800/20 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.poweredByTech')}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center space-y-3 p-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('home.gpsLocation')}</p>
            </div>
            <div className="text-center space-y-3 p-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('home.qrCodes')}</p>
            </div>
            <div className="text-center space-y-3 p-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('home.analytics')}</p>
            </div>
            <div className="text-center space-y-3 p-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('home.secure')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card rounded-3xl p-10 shadow-xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.getStartedToday')}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t('home.joinNetwork')}
            </p>
            <Link href="/register-type">
              <Button 
                size="lg" 
                className="text-lg h-14 px-10 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 group border-0" 
                data-testid="button-cta-bottom"
              >
                {t('home.getStarted')}
                <ArrowRight className="ms-2 w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src={marriLogo} alt="Marri" className="w-8 h-8 rounded-lg" />
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2025 {t('home.brandName')}. {t('home.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
}
