import { jwtDecode } from 'jwt-decode';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { setLogoutFunction } from '../services/api';

export const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'auth_token';

const decodeToken = (token) => {
  try {
    const decodedPayload = jwtDecode(token);

    if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: decodedPayload.id || decodedPayload.sub || null,
      role: decodedPayload.role || null,
      exp: decodedPayload.exp || null,
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const decodedUser = decodeToken(token);

    if (!decodedUser) {
      logout();
      return;
    }

    setUser((currentUser) => ({
      ...decodedUser,
      ...(currentUser || {}),
    }));
  }, [logout, token]);

  const login = useCallback((userData, nextToken) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(userData);
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== TOKEN_STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        logout();
        return;
      }

      setToken(event.newValue);
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [logout]);

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
      login,
      logout,
    }),
    [login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

