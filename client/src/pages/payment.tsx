import { useEffect, useState, useRef, useCallback } from "react";
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
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    planName: string;
    amount: number;
    billingCycle: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending");
  const [paymentWindowOpened, setPaymentWindowOpened] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);

  const clearPaymentData = useCallback(() => {
    sessionStorage.removeItem("paymentUrl");
    sessionStorage.removeItem("paymentRequestId");
    sessionStorage.removeItem("paymentDetails");
  }, []);

  // Check if the payment window was closed and returned to our app
  const checkPaymentWindow = useCallback(() => {
    if (paymentWindowRef.current && paymentWindowRef.current.closed) {
      // Window was closed - check subscription status
      checkSubscriptionStatus();
    }
  }, []);

  // Check subscription status directly from the API
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/company/subscription", {
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.subscription?.status === "active" || data.subscription?.paymentStatus === "paid") {
        // Payment completed!
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        clearPaymentData();
        sessionStorage.setItem("paymentSuccess", "true");
        navigate("/company-dashboard?payment=success");
      }
    } catch (error) {
      console.log("Subscription status check:", error);
    }
  }, [navigate, clearPaymentData]);

  // Start polling when payment window is opened
  useEffect(() => {
    if (paymentWindowOpened && !pollingRef.current) {
      // Poll every 2 seconds to check subscription status and window state
      pollingRef.current = setInterval(() => {
        checkPaymentWindow();
        checkSubscriptionStatus();
      }, 2000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [paymentWindowOpened, checkPaymentWindow, checkSubscriptionStatus]);

  useEffect(() => {
    const storedPaymentUrl = sessionStorage.getItem("paymentUrl");
    const storedPaymentRequestId = sessionStorage.getItem("paymentRequestId");
    const storedPaymentDetails = sessionStorage.getItem("paymentDetails");

    if (storedPaymentUrl) {
      setPaymentUrl(storedPaymentUrl);
      setIsLoading(false);
    } else {
      navigate("/company-dashboard");
      return;
    }

    if (storedPaymentRequestId) {
      setPaymentRequestId(storedPaymentRequestId);
    }

    if (storedPaymentDetails) {
      try {
        setPaymentDetails(JSON.parse(storedPaymentDetails));
      } catch (e) {
        console.error("Failed to parse payment details:", e);
      }
    }

    // Listen for storage changes (from payment redirect in new tab)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "paymentCompleted" && event.newValue === "true") {
        sessionStorage.removeItem("paymentCompleted");
        clearPaymentData();
        sessionStorage.setItem("paymentSuccess", "true");
        navigate("/company-dashboard?payment=success");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [navigate, clearPaymentData]);

  const handleBack = () => {
    clearPaymentData();
    navigate("/company-dashboard");
  };

  const handleReturnToDashboard = () => {
    clearPaymentData();
    navigate("/company-dashboard");
  };

  const openPaymentWindow = () => {
    if (paymentUrl) {
      // Open payment in new window
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      paymentWindowRef.current = window.open(
        paymentUrl,
        "PaymentWindow",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      
      setPaymentWindowOpened(true);
      
      if (!paymentWindowRef.current) {
        toast({
          title: t('common.error'),
          description: t('payment.popupBlocked'),
          variant: "destructive",
        });
      }
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
            {!paymentWindowOpened ? (
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
                    onClick={openPaymentWindow}
                    className="w-full"
                    data-testid="button-open-payment"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    {t('payment.openPaymentGateway')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="p-6">
                  <Loader2 className="w-16 h-16 mx-auto text-primary mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">{t('payment.waitingForPayment')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('payment.completeInNewWindow')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('payment.autoDetectWhenComplete')}
                  </p>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('payment.windowClosedAccidentally')}
                  </p>
                  <Button 
                    variant="outline"
                    onClick={openPaymentWindow}
                    data-testid="button-reopen-payment"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('payment.reopenPaymentWindow')}
                  </Button>
                </div>
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
