import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 relative">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('notFound.title')}</h1>
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
