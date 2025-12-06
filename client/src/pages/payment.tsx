import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CreditCard, Loader2, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SarSymbol } from "@/components/sar-symbol";
import { useToast } from "@/hooks/use-toast";

export default function Payment() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    planName: string;
    amount: number;
    billingCycle: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedPaymentUrl = sessionStorage.getItem("paymentUrl");
    const storedPaymentDetails = sessionStorage.getItem("paymentDetails");

    if (storedPaymentUrl) {
      setPaymentUrl(storedPaymentUrl);
      setIsLoading(false);
    } else {
      navigate("/company-dashboard");
      return;
    }

    if (storedPaymentDetails) {
      try {
        setPaymentDetails(JSON.parse(storedPaymentDetails));
      } catch (e) {
        console.error("Failed to parse payment details:", e);
      }
    }
  }, [navigate]);

  const handleBack = () => {
    sessionStorage.removeItem("paymentUrl");
    sessionStorage.removeItem("paymentRequestId");
    sessionStorage.removeItem("paymentDetails");
    navigate("/company-dashboard");
  };

  const openPaymentAndGoToDashboard = () => {
    if (paymentUrl) {
      // Open payment in new window
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      window.open(
        paymentUrl,
        "PaymentWindow",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      
      // Clear payment data from session
      sessionStorage.removeItem("paymentUrl");
      sessionStorage.removeItem("paymentDetails");
      // Keep paymentRequestId for verification
      
      // Set flag to indicate payment is in progress
      sessionStorage.setItem("paymentInProgress", "true");
      
      // Immediately navigate to dashboard
      navigate("/company-dashboard");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">{t('payment.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">{t('payment.title')}</h1>
            </div>
          </div>
          {paymentDetails && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{paymentDetails.planName} - {paymentDetails.billingCycle}</p>
              <p className="font-semibold flex items-center justify-end gap-1">
                <SarSymbol size="sm" />
                <span>{paymentDetails.amount}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment content */}
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-primary" />
              {t('payment.securePayment')}
            </CardTitle>
            <CardDescription>
              {t('payment.securePaymentDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="p-6 bg-muted/50 rounded-lg">
                <CreditCard className="w-16 h-16 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('payment.readyToPay')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('payment.clickToOpenGateway')}
                </p>
                {paymentDetails && (
                  <div className="bg-background border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t('payment.total')}</span>
                      <span className="text-xl font-bold flex items-center gap-1">
                        <SarSymbol size="sm" />
                        {paymentDetails.amount}
                      </span>
                    </div>
                  </div>
                )}
                <Button 
                  size="lg" 
                  onClick={openPaymentAndGoToDashboard}
                  className="w-full"
                  data-testid="button-open-payment"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  {t('payment.openPaymentGateway')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('payment.securityNote')}
        </p>
      </div>
    </div>
  );
}
