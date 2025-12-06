import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle } from "lucide-react";

export default function PaymentCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("status") || params.get("payment");
    
    const isSuccess = paymentStatus === "success" || paymentStatus === "Success" || paymentStatus === "PAID";

    if (isSuccess) {
      sessionStorage.setItem("paymentSuccess", "true");
      sessionStorage.removeItem("paymentUrl");
      sessionStorage.removeItem("paymentRequestId");
      sessionStorage.removeItem("paymentDetails");
    }

    if (window.self !== window.top) {
      try {
        if (window.parent && window.parent.location) {
          window.parent.postMessage({ type: isSuccess ? "PAYMENT_SUCCESS" : "PAYMENT_COMPLETE" }, "*");
        }
      } catch (e) {
        console.log("Cannot access parent window (cross-origin)");
      }
      
      if (window.top) {
        window.top.location.href = "/company-dashboard" + (isSuccess ? "?payment=success" : "");
      }
    } else {
      navigate("/company-dashboard" + (isSuccess ? "?payment=success" : ""));
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Payment Processing</h2>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    </div>
  );
}
