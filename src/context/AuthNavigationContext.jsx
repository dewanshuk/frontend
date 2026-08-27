import { createContext, useCallback, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const AuthNavigationContext = createContext({
  isAuthenticated: false,
  requireLogin: false,
  isLoggingIn: false,
  user: null,
  navigateToApp: () => {},
  goToLogin: () => {},
  loginWithSso: async () => {},
  logout: async () => {},
});

export function AuthNavigationProvider({
  children,
  isAuthenticated = false,
  requireLogin = false,
  isLoggingIn = false,
  user = null,
  onLogin,
  onLogout,
}) {
  const navigate = useNavigate();

  /** Full-page navigation to the login route (never opens an SSO popup). */
  const goToLogin = useCallback(
    (redirectPath = "/") => {
      const redirect = (redirectPath || "/").startsWith("/")
        ? redirectPath || "/"
        : `/${redirectPath}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
    },
    [navigate],
  );

  /**
   * Starts SSO from the login page. Prefer goToLogin for sending users to login;
   * this is for the Login screen button itself.
   */
  const loginWithSso = useCallback(
    async (redirectPath) => {
      if (typeof onLogin !== "function") {
        goToLogin(redirectPath || "/");
        return;
      }
      await onLogin(redirectPath);
    },
    [goToLogin, onLogin],
  );

  const logout = useCallback(async () => {
    if (typeof onLogout === "function") {
      await onLogout();
      return;
    }
    navigate("/", { replace: true });
  }, [navigate, onLogout]);

  const navigateToApp = useCallback(
    (path) => {
      if (!path || !path.startsWith("/")) return;

      if (requireLogin && !isAuthenticated) {
        goToLogin(path);
        return;
      }

      navigate(path);
    },
    [goToLogin, isAuthenticated, navigate, requireLogin],
  );

  const value = useMemo(
    () => ({
      isAuthenticated,
      requireLogin,
      isLoggingIn,
      user,
      navigateToApp,
      goToLogin,
      loginWithSso,
      /** @deprecated Use loginWithSso — popup flow removed */
      loginWithPopup: loginWithSso,
      logout,
    }),
    [
      goToLogin,
      isAuthenticated,
      isLoggingIn,
      loginWithSso,
      logout,
      navigateToApp,
      requireLogin,
      user,
    ],
  );

  return (
    <AuthNavigationContext.Provider value={value}>
      {children}
    </AuthNavigationContext.Provider>
  );
}

export const useAuthNavigation = () => useContext(AuthNavigationContext);
