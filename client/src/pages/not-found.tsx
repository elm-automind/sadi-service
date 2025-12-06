import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft, Truck, Package } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[15%] left-[10%] w-[250px] h-[250px] bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-[25%] left-[5%] text-primary/5 float-animation">
          <Truck className="w-12 h-12" />
        </div>
        <div className="absolute bottom-[25%] right-[5%] text-primary/5 float-animation" style={{ animationDelay: '2s' }}>
          <Package className="w-10 h-10" />
        </div>
      </div>
      
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md mx-4 border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm relative z-10">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-red-500/30">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-red-700 dark:from-white dark:to-red-300 bg-clip-text text-transparent">{t('notFound.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('notFound.description')}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
              {t('notFound.goBack')}
            </Button>
            <Link href="/">
              <Button>
                <Home className="w-4 h-4 me-2" />
                {t('notFound.goHome')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
