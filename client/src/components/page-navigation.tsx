import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, LogOut } from "lucide-react";

interface PageNavigationProps {
  className?: string;
}

export function PageNavigation({ className = "" }: PageNavigationProps) {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
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

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      // Ignore errors during logout
    }
    queryClient.removeQueries({ queryKey: ["/api/user"] });
    setLocation("/login");
  };

  // Hide Home button on dashboard since user is already there
  const isOnDashboard = location === "/dashboard";

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button variant="ghost" size="sm" className="gap-2" onClick={handleBack} data-testid="button-back">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
      </Button>
      {!isOnDashboard && (
        <Link href={homeLink}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-home">
            <Home className="w-4 h-4" /> {t('navigation.home')}
          </Button>
        </Link>
      )}
      {isLoggedIn && (
        <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="w-4 h-4" /> {t('auth.logout')}
        </Button>
      )}
    </div>
  );
}
