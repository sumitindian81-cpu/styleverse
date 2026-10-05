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

      const parsed = JSON.parse(raw);

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
    useState(() => getAuthToken());

  const [user, setUser] =
    useState(() => readStoredUser());

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(() => {
    clearStoredAuth();

    setToken("");
    setUser(null);
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
        let response = null;

        /* -----------------------------------------------
           First try /user/me
        ----------------------------------------------- */

        try {
          response = await apiJson(
            "/user/me",
            {
              method: "GET",
            }
          );
        } catch (firstError) {
          /*
            If /user/me does not exist,
            try /auth/me.
          */

          if (
            firstError?.status !== 404
          ) {
            throw firstError;
          }

          try {
            response = await apiJson(
              "/auth/me",
              {
                method: "GET",
              }
            );
          } catch (secondError) {
            /*
              Current backend may not have
              either endpoint.

              Keep cached user instead of
              destroying an otherwise valid
              local session.

              Only logout on a definite
              authentication failure.
            */

            if (
              [401, 403].includes(
                secondError?.status
              )
            ) {
              logout();
            }

            return null;
          }
        }

        const nextUser =
          extractUser(response);

        if (nextUser) {
          storeUser(nextUser);
          setUser(nextUser);
        }

        setToken(getAuthToken());

        return nextUser;
      } catch (error) {
        /*
          Invalid / expired token.
        */

        if (
          [401, 403].includes(
            error?.status
          )
        ) {
          logout();
        }

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
     SIGNUP / REGISTER
  ======================================================= */

  const signup = useCallback(
    async (payload) => {
      let response;

      /*
        Try the planned signup endpoint first.
      */

      try {
        response =
          await apiJson(
            "/auth/signup",
            {
              method: "POST",
              data: payload,
            }
          );
      } catch (error) {
        /*
          Current verified backend uses
          /auth/register.

          Therefore, when /auth/signup
          returns 404, automatically fall
          back to /auth/register.
        */

        if (error?.status !== 404) {
          throw error;
        }

        response =
          await apiJson(
            "/auth/register",
            {
              method: "POST",
              data: payload,
            }
          );
      }

      const nextToken =
        extractToken(response);

      const nextUser =
        extractUser(response);

      /*
        Some signup systems immediately
        return a JWT.

        Current backend registration
        creates the account but does not
        return a JWT.
      */

      if (nextToken) {
        saveSession(
          nextToken,
          nextUser
        );
      } else if (nextUser) {
        /*
          Store returned profile even
          when authentication token is
          not returned.
        */

        storeUser(nextUser);
        setUser(nextUser);
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
        setToken(getAuthToken());
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
        setUser(readStoredUser());
      }
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
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