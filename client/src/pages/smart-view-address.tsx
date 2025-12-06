import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ViewAddress from "./view-address";
import AddressCapture from "./address-capture";

export default function SmartViewAddress() {
  const [isInternal, setIsInternal] = useState<boolean | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/user"],
    retry: false,
  });

  useEffect(() => {
    if (!userLoading) {
      setIsInternal(!!user);
    }
  }, [user, userLoading]);

  if (isInternal === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isInternal) {
    return <ViewAddress isInternalAccess={true} />;
  }

  return <AddressCapture />;
}
