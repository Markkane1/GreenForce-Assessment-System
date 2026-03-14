import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { setLogoutFunction } from '../services/api';
import * as authService from '../services/authService';

export const AuthContext = createContext(null);
const SESSION_HINT_KEY = 'has_auth_session';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const logout = useCallback(async ({ syncServer = true, redirect = false } = {}) => {
    if (syncServer) {
      try {
        await authService.logout();
      } catch {
        // local state reset should still proceed
      }
    }

    setToken(null);
    setUser(null);
    setIsAuthReady(true);

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_HINT_KEY);
    }

    if (redirect && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      setIsAuthReady(false);

      if (typeof window !== 'undefined' && !window.sessionStorage.getItem(SESSION_HINT_KEY)) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsAuthReady(true);
        }
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
        setToken('cookie-session');
      } catch {
        if (!isMounted) {
          return;
        }

        setUser(null);
        setToken(null);

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(SESSION_HINT_KEY);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    setToken('cookie-session');
    setIsAuthReady(true);

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_HINT_KEY, '1');
    }
  }, []);

  useEffect(() => {
    setLogoutFunction(logout);

    return () => {
      setLogoutFunction(null);
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthReady,
      login,
      logout,
    }),
    [isAuthReady, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
