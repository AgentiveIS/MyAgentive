import { useState, useEffect, useCallback } from "react";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  authType: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    authType: null,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/verify", {
        credentials: "include",
      });
      const data = await res.json();

      setAuthState({
        isAuthenticated: data.authenticated,
        isLoading: false,
        authType: data.authType || null,
      });
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        authType: null,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      authType: null,
    });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    checkAuth,
    logout,
  };
}
