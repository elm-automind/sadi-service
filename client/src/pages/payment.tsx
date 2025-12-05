import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CreditCard, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SarSymbol } from "@/components/sar-symbol";

export default function Payment() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    planName: string;
    amount: number;
    billingCycle: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending");

  useEffect(() => {
    // Get payment data from sessionStorage
    const storedPaymentUrl = sessionStorage.getItem("paymentUrl");
    const storedPaymentDetails = sessionStorage.getItem("paymentDetails");

    if (storedPaymentUrl) {
      setPaymentUrl(storedPaymentUrl);
      setIsLoading(false);
    } else {
      // No payment URL, redirect back
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

    // Listen for payment completion messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PAYMENT_SUCCESS") {
        setPaymentStatus("success");
        sessionStorage.removeItem("paymentUrl");
        sessionStorage.removeItem("paymentDetails");
      } else if (event.data?.type === "PAYMENT_FAILED") {
        setPaymentStatus("failed");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  const handleBack = () => {
    sessionStorage.removeItem("paymentUrl");
    sessionStorage.removeItem("paymentDetails");
    navigate("/company-dashboard");
  };

  const handleReturnToDashboard = () => {
    sessionStorage.removeItem("paymentUrl");
    sessionStorage.removeItem("paymentDetails");
    navigate("/company-dashboard");
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

  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('payment.success')}</h2>
            <p className="text-muted-foreground mb-6">{t('payment.successMessage')}</p>
            <Button onClick={handleReturnToDashboard} className="w-full" data-testid="button-return-dashboard">
              {t('payment.returnToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('payment.failed')}</h2>
            <p className="text-muted-foreground mb-6">{t('payment.failedMessage')}</p>
            <div className="space-y-3">
              <Button onClick={() => setPaymentStatus("pending")} className="w-full" data-testid="button-retry-payment">
                {t('payment.tryAgain')}
              </Button>
              <Button onClick={handleReturnToDashboard} variant="outline" className="w-full" data-testid="button-cancel-payment">
                {t('payment.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
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

      {/* Payment iframe */}
      <div className="max-w-4xl mx-auto p-4">
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-primary" />
              {t('payment.securePayment')}
            </CardTitle>
            <CardDescription>
              {t('payment.securePaymentDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {paymentUrl ? (
              <iframe
                src={paymentUrl}
                className="w-full border-0"
                style={{ minHeight: "600px", height: "calc(100vh - 250px)" }}
                title="Payment Gateway"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                data-testid="iframe-payment"
              />
            ) : (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">{t('payment.loadingPaymentPage')}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('payment.securityNote')}
        </p>
      </div>
    </div>
  );
}
