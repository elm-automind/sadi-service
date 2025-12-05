import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

interface PageNavigationProps {
  className?: string;
}

export function PageNavigation({ className = "" }: PageNavigationProps) {
  const { data: user, isError, isLoading } = useQuery<{ id: number } | null>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // If loading, default to register (will update when resolved)
  // If error (401 unauthorized), user is not logged in - go to register
  // If data exists, user is logged in - go to dashboard
  const isLoggedIn = !isLoading && !isError && !!user;
  const homeLink = isLoggedIn ? "/dashboard" : "/register";

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => window.history.back()}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <Link href={homeLink}>
        <Button variant="ghost" size="sm" className="gap-2">
          <Home className="w-4 h-4" /> Home
        </Button>
      </Link>
    </div>
  );
}
