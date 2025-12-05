import { useState, useEffect } from "react";
import ViewAddress from "./view-address";
import AddressCapture from "./address-capture";

function isInternalNavigation(): boolean {
  const referrer = document.referrer;
  
  if (!referrer) {
    return false;
  }
  
  try {
    const referrerUrl = new URL(referrer);
    const currentUrl = new URL(window.location.href);
    
    return referrerUrl.hostname === currentUrl.hostname;
  } catch {
    return false;
  }
}

export default function SmartViewAddress() {
  const [isInternal, setIsInternal] = useState<boolean | null>(null);

  useEffect(() => {
    setIsInternal(isInternalNavigation());
  }, []);

  if (isInternal === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isInternal) {
    return <ViewAddress />;
  }

  return <AddressCapture />;
}
