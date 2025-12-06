import crypto from "crypto";

interface PaymentRequestPayload {
  InvoiceNumber: string;
  AccountNumber: string;
  TimeStamp: string;
  TransactionType: string;
  Operation: string;
  RedirectUrl: string;
  PaymentMethods: string;
  Language: string;
}

interface PaymentResult {
  success: boolean;
  paymentUrl?: string;
  paymentRequestId?: string;
  message?: string;
  error?: string;
}

interface PaymentInquiryResult {
  success: boolean;
  isPaid: boolean;
  status?: string;
  message?: string;
  error?: string;
}

export async function createPaymentRequest(
  sadadNumber: string,
  accountNumber: string,
  language: string = "en"
): Promise<PaymentResult> {
  const apiUrl = process.env.PAYMENT_API_URL || "https://pg-beta.api.elm.sa/payment/api/product/createpaymentrequest";
  const productCode = process.env.BILLING_PRODUCT_CODE;
  const clientKey = process.env.PAYMENT_CLIENT_KEY;
  const appId = process.env.PAYMENT_APP_ID || process.env.BILLING_APP_ID;
  const appKey = process.env.PAYMENT_APP_KEY || process.env.BILLING_APP_KEY;

  if (!appId || !appKey) {
    console.warn("Payment API credentials not configured, skipping payment request");
    return {
      success: false,
      error: "Payment API credentials not configured",
      message: "Payment service not available",
    };
  }

  const messageId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  const now = new Date();
  const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;

  const appBaseUrl = process.env.APP_BASE_URL || 
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "") ||
    (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : "");
  const redirectUrl = appBaseUrl ? `${appBaseUrl}/company-dashboard?payment=success` : "";

  const payload: PaymentRequestPayload = {
    InvoiceNumber: sadadNumber,
    AccountNumber: accountNumber,
    TimeStamp: formattedTimestamp,
    TransactionType: "1",
    Operation: "pay",
    RedirectUrl: redirectUrl,
    PaymentMethods: "MASTER,VISA,MADA,APPLEPAY,SADAD",
    Language: language,
  };

  try {
    console.log(`Creating payment request for invoice: ${sadadNumber}, account: ${accountNumber}`);
    console.log(`Redirect URL: ${redirectUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MessageId": messageId,
        "Timestamp": timestamp,
        "app-id": appId,
        "app-key": appKey,
      };
      
      // Add optional headers if configured
      if (productCode) {
        headers["ProductCode"] = productCode;
      }
      if (clientKey) {
        headers["ClientKey"] = clientKey;
      }
      
      response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    let responseText: string;
    try {
      responseText = await response.text();
    } catch {
      responseText = "";
    }

    console.log(`Payment API response status: ${response.status}`);

    if (!response.ok) {
      console.error(`Payment API error: ${response.status} - ${responseText}`);
      return {
        success: false,
        error: `Payment service unavailable (${response.status})`,
        message: "Failed to create payment request. Please try again later.",
      };
    }

    let responseData: Record<string, unknown> = {};
    try {
      if (responseText && responseText.trim().startsWith("{")) {
        responseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.warn("Could not parse payment API response as JSON:", parseError);
    }

    console.log(`Payment API response:`, JSON.stringify(responseData, null, 2));

    // Extract from nested body.data structure (API returns body.data.paymentUrl)
    const body = responseData.body as Record<string, unknown> | undefined;
    const data = body?.data as Record<string, unknown> | undefined;
    const paymentUrl = data?.paymentUrl as string | undefined;
    const paymentRequestId = data?.paymentRequestId as string | undefined;

    // Check for errors in response
    const errors = body?.errors as Array<{ message: string }> | undefined;
    if (errors && errors.length > 0) {
      const errorMsg = errors.map(e => e.message).join(", ");
      console.error("Payment API returned errors:", errorMsg);
      return {
        success: false,
        error: errorMsg,
        message: "Payment request failed. Please try again.",
      };
    }

    if (!paymentUrl) {
      console.error("Payment URL not found in response");
      return {
        success: false,
        error: "Payment URL not received",
        message: "Failed to get payment page. Please try again.",
      };
    }

    console.log(`Payment request created - URL: ${paymentUrl}, RequestId: ${paymentRequestId}`);

    return {
      success: true,
      paymentUrl,
      paymentRequestId,
      message: "Payment request created successfully",
    };
  } catch (error) {
    console.error("Payment API call failed:", error);
    
    const errorMessage = error instanceof Error 
      ? (error.name === 'AbortError' ? 'Request timeout' : 'Connection failed')
      : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      message: "Failed to connect to payment service. Please try again later.",
    };
  }
}

export async function inquirePaymentRequest(
  paymentRequestId: string
): Promise<PaymentInquiryResult> {
  const apiUrl = "https://pg-beta.api.elm.sa/api/product/inquirepaymentrequest";
  const productCode = process.env.BILLING_PRODUCT_CODE || "812";
  const clientKey = process.env.PAYMENT_CLIENT_KEY;
  const appId = process.env.PAYMENT_APP_ID || process.env.BILLING_APP_ID;
  const appKey = process.env.PAYMENT_APP_KEY || process.env.BILLING_APP_KEY;

  if (!appId || !appKey) {
    console.warn("Payment API credentials not configured");
    return {
      success: false,
      isPaid: false,
      error: "Payment API credentials not configured",
      message: "Payment verification not available",
    };
  }

  const messageId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  try {
    console.log(`Inquiring payment status for request: ${paymentRequestId}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MessageId": messageId,
        "Timestamp": timestamp,
        "app-id": appId,
        "app-key": appKey,
        "ProductCode": productCode,
      };
      
      if (clientKey) {
        headers["ClientKey"] = clientKey;
      }
      
      response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(paymentRequestId),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    let responseText: string;
    try {
      responseText = await response.text();
    } catch {
      responseText = "";
    }

    console.log(`Payment inquiry response status: ${response.status}`);
    console.log(`Payment inquiry response: ${responseText}`);

    if (!response.ok) {
      console.error(`Payment inquiry error: ${response.status} - ${responseText}`);
      return {
        success: false,
        isPaid: false,
        error: `Payment verification failed (${response.status})`,
        message: "Could not verify payment status. Please try again.",
      };
    }

    let responseData: Record<string, unknown> = {};
    try {
      if (responseText && responseText.trim().startsWith("{")) {
        responseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.warn("Could not parse payment inquiry response as JSON:", parseError);
    }

    const body = responseData.body as Record<string, unknown> | undefined;
    const data = body?.data as Record<string, unknown> | undefined;
    
    const paymentStatus = data?.paymentStatus as string | undefined;
    const isPaid = paymentStatus === "Paid" || paymentStatus === "paid" || paymentStatus === "PAID";
    
    console.log(`Payment status for ${paymentRequestId}: ${paymentStatus}, isPaid: ${isPaid}`);

    return {
      success: true,
      isPaid,
      status: paymentStatus,
      message: isPaid ? "Payment verified successfully" : "Payment not yet completed",
    };
  } catch (error) {
    console.error("Payment inquiry failed:", error);
    
    const errorMessage = error instanceof Error 
      ? (error.name === 'AbortError' ? 'Request timeout' : 'Connection failed')
      : 'Unknown error';
    
    return {
      success: false,
      isPaid: false,
      error: errorMessage,
      message: "Failed to verify payment. Please try again.",
    };
  }
}
