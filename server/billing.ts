import crypto from "crypto";

interface NationalAddress {
  street: string;
  buildingNumber: string;
  additionalNumber: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
}

interface Transaction {
  ServiceId: string;
  Description: string;
  TransactionDate: string;
  TransactionID: number;
  AmountWithoutVat: number;
  UnitPrice: number;
  volume: number;
}

interface InvoicePayload {
  customerId: string;
  customerEnFullName: string;
  customerArFullName: string;
  identityType: string;
  identityTypeValue: string;
  nationalAddress: NationalAddress;
  mobileNumber: string;
  email: string;
  customerNIN: string;
  customerDescription: string | null;
  customerVatNumber: string;
  isRealTime: number;
  expiryPeriod: number;
  Transactions: Transaction[];
}

interface BillingResult {
  success: boolean;
  invoiceId?: string;
  message?: string;
  error?: string;
  sadadNumber?: string;
  totalDueAmount?: number;
  totalDueAmountBeforeVat?: number;
  vatAmount?: number;
  accountNumber?: string;
}

interface CompanyInfo {
  companyName: string;
  unifiedNumber: string;
  email: string;
  phone: string;
}

interface AddressInfo {
  street: string;
  district: string;
  city: string;
}

interface PlanInfo {
  name: string;
  slug: string;
  monthlyPrice: number;
  annualPrice: number;
}

export async function generateInvoice(
  companyInfo: CompanyInfo,
  addressInfo: AddressInfo | null,
  planInfo: PlanInfo,
  billingCycle: "monthly" | "annual"
): Promise<BillingResult> {
  const apiUrl = process.env.BILLING_API_URL || "https://elmx-bp-beta.api.elm.sa/billing/v3/api/invoice/generateinvoicewithcustomer";
  const productCode = process.env.BILLING_PRODUCT_CODE;
  const appId = process.env.BILLING_APP_ID;
  const appKey = process.env.BILLING_APP_KEY;

  if (!appId || !appKey) {
    console.warn("Billing API credentials not configured, skipping invoice generation");
    return {
      success: true,
      message: "Invoice generation skipped - billing not configured",
    };
  }

  const messageId = crypto.randomUUID();
  const transactionDate = new Date().toISOString().split("T")[0];
  const transactionId = Date.now();

  const amount = billingCycle === "annual" ? planInfo.annualPrice : planInfo.monthlyPrice;

  const payload: InvoicePayload = {
    customerId: companyInfo.unifiedNumber,
    customerEnFullName: companyInfo.companyName,
    customerArFullName: companyInfo.companyName,
    identityType: "700",
    identityTypeValue: companyInfo.unifiedNumber,
    nationalAddress: {
      street: addressInfo?.street || "Not Specified",
      buildingNumber: "0000",
      additionalNumber: "0000",
      district: addressInfo?.district || "Not Specified",
      city: addressInfo?.city || "Riyadh",
      postalCode: "00000",
      country: "SA",
    },
    mobileNumber: companyInfo.phone.replace(/^\+/, ""),
    email: companyInfo.email || "",
    customerNIN: companyInfo.unifiedNumber,
    customerDescription: null,
    customerVatNumber: companyInfo.unifiedNumber,
    isRealTime: 1,
    expiryPeriod: 99999,
    Transactions: [
      {
        ServiceId: `SADI-${planInfo.slug}`,
        Description: `${planInfo.name} Subscription - ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
        TransactionDate: transactionDate,
        TransactionID: transactionId,
        AmountWithoutVat: amount,
        UnitPrice: amount,
        volume: 1,
      },
    ],
  };

  try {
    console.log(`Calling billing API for company: ${companyInfo.companyName}, plan: ${planInfo.name}, cycle: ${billingCycle}`);
    console.log(`Billing API URL: ${apiUrl}`);
    console.log(`Billing API Payload:`, JSON.stringify(payload, null, 2));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MessageId": messageId,
        "app-id": appId,
        "app-key": appKey,
      };
      
      // Add optional headers if configured
      if (productCode) {
        headers["ProductCode"] = productCode;
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

    console.log(`Billing API response status: ${response.status}`);
    console.log(`Billing API response body: ${responseText}`);

    if (!response.ok) {
      console.error(`Billing API error: ${response.status}`);
      console.error(`Billing API error response: ${responseText}`);
      
      // Try to parse error message from response
      let errorDetail = `Billing service error (${response.status})`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorDetail = errorData.message;
        } else if (errorData.error) {
          errorDetail = errorData.error;
        } else if (errorData.body?.message) {
          errorDetail = errorData.body.message;
        }
      } catch {
        // Use default error message
      }
      
      return {
        success: false,
        error: errorDetail,
        message: "Failed to generate invoice. Please try again later.",
      };
    }

    let responseData: Record<string, unknown> = {};
    try {
      if (responseText && responseText.trim().startsWith("{")) {
        responseData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.warn("Could not parse billing API response as JSON:", parseError);
    }

    // Check for errors in response body (API returns 200 but may have errors)
    const bodyData = responseData.body as Record<string, unknown> | undefined;
    const errors = bodyData?.errors as Array<{ key: string; message: string }> | undefined;
    
    if (errors && errors.length > 0) {
      const errorMessage = errors.map(e => e.message).join(", ");
      console.error(`Billing API returned errors: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        message: "Failed to generate invoice. Please check your billing credentials.",
      };
    }

    console.log(`Invoice generated successfully for ${companyInfo.companyName}`);

    // Extract billing data from nested response structure
    const body = responseData.body as Record<string, unknown> | undefined;
    const data = body?.data as Record<string, unknown> | undefined;
    const result = data?.result as Record<string, unknown> | undefined;

    const sadadNumber = result?.sadadNumber as string | undefined;
    const totalDueAmount = result?.totalDueAmount as number | undefined;
    const totalDueAmountBeforeVat = result?.totalDueAmountBeforeVat as number | undefined;
    const vatAmount = result?.vatAmount as number | undefined;
    const accountNumber = result?.accountNumber as string | undefined;

    console.log(`Billing data extracted - SADAD: ${sadadNumber}, Amount: ${totalDueAmount}, Account: ${accountNumber}`);

    return {
      success: true,
      invoiceId: (responseData.invoiceId as string) || (responseData.InvoiceId as string) || messageId,
      message: "Invoice generated successfully",
      sadadNumber,
      totalDueAmount,
      totalDueAmountBeforeVat,
      vatAmount,
      accountNumber,
    };
  } catch (error) {
    console.error("Billing API call failed:", error);
    
    const errorMessage = error instanceof Error 
      ? (error.name === 'AbortError' ? 'Request timeout' : 'Connection failed')
      : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      message: "Failed to connect to billing service. Please try again later.",
    };
  }
}
