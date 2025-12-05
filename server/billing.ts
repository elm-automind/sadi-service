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
  const apiUrl = process.env.BILLING_API_URL;
  const productCode = process.env.BILLING_PRODUCT_CODE;
  const clientKey = process.env.BILLING_CLIENT_KEY;
  const appId = process.env.BILLING_APP_ID;
  const appKey = process.env.BILLING_APP_KEY;

  if (!apiUrl || !productCode || !clientKey || !appId || !appKey) {
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

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ProductCode": productCode,
        "ClientKey": clientKey,
        "MessageId": messageId,
        "app-id": appId,
        "app-key": appKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`Billing API response status: ${response.status}`);

    if (!response.ok) {
      console.error(`Billing API error: ${response.status} - ${responseText}`);
      return {
        success: false,
        error: `Billing API returned ${response.status}`,
        message: responseText,
      };
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`Invoice generated successfully for ${companyInfo.companyName}`);

    return {
      success: true,
      invoiceId: responseData.invoiceId || responseData.InvoiceId || messageId,
      message: "Invoice generated successfully",
    };
  } catch (error) {
    console.error("Billing API call failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to connect to billing service",
    };
  }
}
