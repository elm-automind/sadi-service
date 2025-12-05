import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

interface PageNavigationProps {
  className?: string;
}

export function PageNavigation({ className = "" }: PageNavigationProps) {
  const [location, setLocation] = useLocation();
  const { data: user, isError, isLoading } = useQuery<{ id: number } | null>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // If logged in, go to dashboard; otherwise go to main landing page
  const isLoggedIn = !isLoading && !isError && !!user;
  const homeLink = isLoggedIn ? "/dashboard" : "/";

  const handleBack = () => {
    // If there's history, go back; otherwise go to home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(homeLink);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button variant="ghost" size="sm" className="gap-2" onClick={handleBack} data-testid="button-back">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Link href={homeLink}>
        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-home">
          <Home className="w-4 h-4" /> Home
        </Button>
      </Link>
    </div>
  );
}
