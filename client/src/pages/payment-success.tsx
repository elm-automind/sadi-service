import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  useEffect(() => {
    sessionStorage.removeItem("paymentUrl");
    sessionStorage.removeItem("paymentDetails");
  }, []);

  const handleClose = () => {
    navigate("/company-dashboard");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('payment.success')}</h2>
          <p className="text-muted-foreground mb-8">{t('payment.successMessage')}</p>
          <Button onClick={handleClose} size="lg" className="w-full" data-testid="button-close-success">
            {t('common.close')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
