import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const TOKEN_KEY = "vm_token";
const USER_KEY = "vm_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  // Inject token into every axios request
  useEffect(() => {
    const id = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
    return () => axios.interceptors.request.eject(id);
  }, []);

  // Redirect to /login on 401
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) logout();
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  function login(accessToken, userData) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  const canEdit = user?.role === "admin" || user?.role === "éditeur";
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, token, login, logout, canEdit, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
