import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const PING_INTERVAL = 60 * 1000; // Ping every 1 minute when active

export function useSessionActivity(isLoggedIn: boolean) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      // Ignore errors during logout
    }
    queryClient.removeQueries({ queryKey: ["/api/user"] }); // Clear session-related queries only
    setLocation("/login");
  }, [queryClient, setLocation]);

  const pingSession = useCallback(async () => {
    try {
      const res = await fetch("/api/session/ping", { 
        method: "POST", 
        credentials: "include" 
      });
      if (!res.ok) {
        // Session expired on server, logout
        handleLogout();
      }
    } catch (e) {
      // Network error, try to logout
      handleLogout();
    }
  }, [handleLogout]);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  }, [handleLogout]);

  const handleActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  useEffect(() => {
    if (!isLoggedIn) {
      // Clear all timers when not logged in
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      return;
    }

    // Start inactivity timer
    resetInactivityTimer();

    // Start ping interval
    pingIntervalRef.current = setInterval(() => {
      // Only ping if there was activity since last ping
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity < PING_INTERVAL) {
        pingSession();
      }
    }, PING_INTERVAL);

    // Activity event listeners
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [isLoggedIn, handleActivity, pingSession, resetInactivityTimer]);

  return { handleLogout };
}
