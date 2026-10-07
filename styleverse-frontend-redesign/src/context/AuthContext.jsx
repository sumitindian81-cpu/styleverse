import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  apiJson,
  getAuthToken,
} from "../utils/api";

const AuthContext = createContext(null);

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function extractToken(response) {
  return (
    response?.data?.token ||
    response?.token ||
    response?.data?.accessToken ||
    response?.accessToken ||
    ""
  );
}

function extractUser(response) {
  return (
    response?.data?.user ||
    response?.user ||
    null
  );
}

/* =========================================================
   LOCAL STORAGE HELPERS
========================================================= */

function readStoredUser() {
  const keys = [
    "styleverse_user",
    "styleverseUser",
    "user",
  ];

  for (const key of keys) {
    try {
      const raw =
        localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      const parsed =
        JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return parsed;
      }
    } catch {
      // Ignore invalid JSON in localStorage.
    }
  }

  return null;
}

function storeUser(user) {
  if (!user) {
    return;
  }

  localStorage.setItem(
    "styleverse_user",
    JSON.stringify(user)
  );
}

function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");

  localStorage.removeItem(
    "styleverse_token"
  );

  localStorage.removeItem(
    "styleverse_user"
  );

  localStorage.removeItem(
    "styleverseUser"
  );

  localStorage.removeItem("user");
}

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({
  children,
}) {
  const [token, setToken] =
    useState(() =>
      getAuthToken()
    );

  const [user, setUser] =
    useState(() =>
      readStoredUser()
    );

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(() => {
    clearStoredAuth();

    setToken("");
    setUser(null);

    // Let Navbar and any other auth-aware
    // components know that auth state changed.
    window.dispatchEvent(
      new Event(
        "styleverse-auth-changed"
      )
    );
  }, []);

  /* =======================================================
     SAVE SESSION
  ======================================================= */

  const saveSession = useCallback(
    (nextToken, nextUser) => {
      if (nextToken) {
        localStorage.setItem(
          "token",
          nextToken
        );

        setToken(nextToken);
      }

      if (nextUser) {
        storeUser(nextUser);
        setUser(nextUser);
      }

      window.dispatchEvent(
        new Event(
          "styleverse-auth-changed"
        )
      );
    },
    []
  );

  /* =======================================================
     UPDATE USER
  ======================================================= */

  const updateUser = useCallback(
    (nextUser) => {
      if (!nextUser) {
        return;
      }

      storeUser(nextUser);
      setUser(nextUser);

      window.dispatchEvent(
        new Event(
          "styleverse-auth-changed"
        )
      );
    },
    []
  );

  /* =======================================================
     CLEAR AUTH
  ======================================================= */

  const clearAuth = useCallback(() => {
    clearStoredAuth();

    setToken("");
    setUser(null);

    window.dispatchEvent(
      new Event(
        "styleverse-auth-changed"
      )
    );
  }, []);

  /* =======================================================
     FETCH CURRENT USER
  ======================================================= */

  const fetchMe = useCallback(
    async () => {
      const activeToken =
        getAuthToken();

      /*
        No token means no authenticated
        session to restore.
      */

      if (!activeToken) {
        setLoading(false);
        return null;
      }

      try {
        /*
          Current Styleverse backend route:

          GET /api/auth/me

          The API utility already includes
          /api in the base URL.

          Therefore frontend uses:
          /auth/me
        */

        const response =
          await apiJson(
            "/auth/me",
            {
              method: "GET",
            }
          );

        const nextUser =
          extractUser(response);

        if (nextUser) {
          storeUser(nextUser);
          setUser(nextUser);
        }

        /*
          Keep the actual current token
          in React state.
        */

        setToken(
          getAuthToken()
        );

        return nextUser;
      } catch (error) {
        /*
          Only clear the session when the
          backend explicitly says the token
          is invalid or unauthorized.
        */

        if (
          [401, 403].includes(
            error?.status
          )
        ) {
          logout();
        }

        /*
          A temporary/network/API problem
          should not immediately destroy a
          valid locally cached session.
        */

        return null;
      } finally {
        setLoading(false);
      }
    },
    [logout]
  );

  /* =======================================================
     INITIAL SESSION RESTORE
  ======================================================= */

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  /* =======================================================
     LOGIN
  ======================================================= */

  const login = useCallback(
    async (credentials) => {
      const response =
        await apiJson(
          "/auth/login",
          {
            method: "POST",
            data: credentials,
          }
        );

      const nextToken =
        extractToken(response);

      const nextUser =
        extractUser(response);

      /*
        Login without token is not
        considered a usable session.
      */

      if (!nextToken) {
        throw new Error(
          "Login succeeded but no authentication token was returned."
        );
      }

      saveSession(
        nextToken,
        nextUser
      );

      return {
        response,
        token: nextToken,
        user: nextUser,
      };
    },
    [saveSession]
  );

  /* =======================================================
     SIGNUP
  ======================================================= */

  const signup = useCallback(
    async (payload) => {
      /*
        Current backend signup route:

        POST /api/auth/signup

        API utility already includes
        /api in the base URL.

        Therefore:
        /auth/signup
      */

      const response =
        await apiJson(
          "/auth/signup",
          {
            method: "POST",
            data: payload,
          }
        );

      const nextToken =
        extractToken(response);

      const nextUser =
        extractUser(response);

      /*
        Current Styleverse backend
        normally does not return a JWT
        during signup because email
        verification is required first.
      */

      if (nextToken) {
        saveSession(
          nextToken,
          nextUser
        );
      } else if (nextUser) {
        /*
          Save returned profile without
          authenticating the session.
        */

        storeUser(nextUser);
        setUser(nextUser);

        window.dispatchEvent(
          new Event(
            "styleverse-auth-changed"
          )
        );
      }

      return {
        response,
        token: nextToken,
        user: nextUser,
      };
    },
    [saveSession]
  );

  /* =======================================================
     CROSS-TAB AUTH SYNC
  ======================================================= */

  useEffect(() => {
    function handleStorage(event) {
      /*
        Token changed in another tab.
      */

      if (
        [
          "token",
          "accessToken",
          "styleverse_token",
        ].includes(event.key)
      ) {
        setToken(
          getAuthToken()
        );
      }

      /*
        User changed in another tab.
      */

      if (
        [
          "styleverse_user",
          "styleverseUser",
          "user",
        ].includes(event.key)
      ) {
        setUser(
          readStoredUser()
        );
      }
    }

    function handleAuthChanged() {
      /*
        Auth changes in the same tab
        are communicated through the
        custom Styleverse event.
      */

      setToken(
        getAuthToken()
      );

      setUser(
        readStoredUser()
      );
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "styleverse-auth-changed",
      handleAuthChanged
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "styleverse-auth-changed",
        handleAuthChanged
      );
    };
  }, []);

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = useMemo(
    () => ({
      /*
        State
      */

      user,
      token,
      loading,

      /*
        Authentication status
      */

      isAuthenticated:
        Boolean(token),

      /*
        Auth actions
      */

      login,
      signup,
      logout,

      /*
        Session helpers
      */

      fetchMe,
      updateUser,
      clearAuth,
    }),
    [
      user,
      token,
      loading,
      login,
      signup,
      logout,
      fetchMe,
      updateUser,
      clearAuth,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   useAuth HOOK
========================================================= */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
}

export default AuthContext;