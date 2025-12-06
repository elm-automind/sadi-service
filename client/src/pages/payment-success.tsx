import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/20 dark:to-emerald-950/30">
      <Card className="max-w-md w-full text-center shadow-xl border-0">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-700 dark:text-green-400">
            {t('payment.successTitle', 'Payment Successful!')}
          </CardTitle>
          <CardDescription className="text-base">
            {t('payment.successDescription', 'Your subscription has been activated. You can now access all the features of your plan.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('payment.successNote', 'A confirmation email has been sent to your registered email address.')}
          </p>
          <Button 
            onClick={() => setLocation("/company-dashboard")}
            className="w-full"
            data-testid="button-go-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4 me-2" />
            {t('payment.goToDashboard', 'Go to Dashboard')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
