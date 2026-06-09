import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'lmsAuth';

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

    if (storedAuth) {
      try {
        setAuthUser(JSON.parse(storedAuth));
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthUser(null);
      }
    }

    setLoading(false);
  }, []);

  const login = (payload) => {
    const normalizedPayload = {
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
      token: payload.token || null,
      memberId: payload.memberId || null,
      memberCode: payload.memberCode || null,
      memberStatus: payload.memberStatus || null,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedPayload));
    setAuthUser(normalizedPayload);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);

    // Optional cleanup if you previously stored these separately
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberCode');
    localStorage.removeItem('memberProfile');

    setAuthUser(null);
  };

  const value = useMemo(
    () => ({
      authUser,
      loading,
      isAuthenticated: Boolean(authUser),
      role: authUser?.role || null,
      token: authUser?.token || null,
      login,
      logout,
    }),
    [authUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}