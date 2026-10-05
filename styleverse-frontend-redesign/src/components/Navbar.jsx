import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// --------------------------------------------------
// USER HELPERS
// --------------------------------------------------

function readStoredUser() {
  const keys = [
    "styleverse_user",
    "user",
    "styleverseUser",
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
      // Ignore malformed local storage.
    }
  }

  return null;
}

function getInitials(user) {
  const name = String(
    user?.name ||
      user?.fullName ||
      user?.displayName ||
      ""
  ).trim();

  if (!name) {
    return "SV";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() || ""
    )
    .join("");
}

function isAdminUser(user) {
  return (
    String(
      user?.role || ""
    ).toLowerCase() === "admin" ||
    String(
      user?.user?.role || ""
    ).toLowerCase() === "admin"
  );
}

// --------------------------------------------------
// ICONS
// --------------------------------------------------

function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns:
      "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
  };

  const strokeProps = {
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "search") {
    return (
      <svg {...common}>
        <circle
          cx="11"
          cy="11"
          r="6.5"
          {...strokeProps}
        />

        <path
          d="M16 16L21 21"
          {...strokeProps}
        />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...common}>
        <path
          d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.7 4.7 0 0 1 8 4c1.5 0 2.9.7 4 2 1.1-1.3 2.5-2 4-2a4.7 4.7 0 0 1 4.8 4.6Z"
          {...strokeProps}
        />
      </svg>
    );
  }

  if (name === "bag") {
    return (
      <svg {...common}>
        <path
          d="M5 8h14l-1 12H6L5 8Z"
          {...strokeProps}
        />

        <path
          d="M9 8a3 3 0 1 1 6 0"
          {...strokeProps}
        />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="8"
          r="3.2"
          {...strokeProps}
        />

        <path
          d="M5.5 20c.8-3.4 3-5.2 6.5-5.2s5.7 1.8 6.5 5.2"
          {...strokeProps}
        />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg {...common}>
        <path
          d="M4 7h16M4 12h16M4 17h16"
          {...strokeProps}
        />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path
          d="M6 6l12 12M18 6L6 18"
          {...strokeProps}
        />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path
          d="M5 12h13"
          {...strokeProps}
        />

        <path
          d="m13 6 6 6-6 6"
          {...strokeProps}
        />
      </svg>
    );
  }

  return null;
}

// --------------------------------------------------
// NAV ITEMS
// --------------------------------------------------

const navItems = [
  {
    label: "Shop",
    to: "/shop",
  },
  {
    label: "Studio",
    to: "/studio",
  },
  {
    label: "Outfit Builder",
    to: "/builder",
  },
];

// --------------------------------------------------
// NAV LINK STYLES
// --------------------------------------------------

function navLinkClass({
  isActive,
}) {
  return [
    "relative inline-flex items-center px-1 py-2",
    "text-[13px] font-semibold uppercase tracking-[0.12em]",
    "transition-colors duration-200",
    isActive
      ? "text-[#171513]"
      : "text-[#756f67] hover:text-[#171513]",
    "after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:bg-[#171513]",
    isActive
      ? "after:scale-x-100"
      : "after:scale-x-0 hover:after:scale-x-100",
  ].join(" ");
}

// --------------------------------------------------
// NAVBAR
// --------------------------------------------------

export default function Navbar() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    user: authUser,
    isAuthenticated,
    logout,
  } = useAuth();

  const [localUser, setLocalUser] =
    useState(() =>
      readStoredUser()
    );

  const user = authUser || localUser;

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [search, setSearch] =
    useState(() => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      return (
        params.get("search") ||
        ""
      );
    });

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(
          "token"
        )
      : null;

  const isLoggedIn =
    Boolean(isAuthenticated || token);

  const isAdmin =
    isAdminUser(user);

  const initials =
    getInitials(user);

  const displayName =
    useMemo(() => {
      if (!user) {
        return "";
      }

      return (
        user.name ||
        user.fullName ||
        user.displayName ||
        user.email?.split(
          "@"
        )[0] ||
        "Account"
      );
    }, [user]);

  // ------------------------------------------------
  // AUTH SYNC
  // ------------------------------------------------

  useEffect(() => {
    function syncAuth() {
      setLocalUser(
        readStoredUser()
      );
    }

    window.addEventListener(
      "styleverse-auth-changed",
      syncAuth
    );

    window.addEventListener(
      "storage",
      syncAuth
    );

    return () => {
      window.removeEventListener(
        "styleverse-auth-changed",
        syncAuth
      );

      window.removeEventListener(
        "storage",
        syncAuth
      );
    };
  }, []);

  // ------------------------------------------------
  // CLOSE MOBILE MENU ON NAVIGATION
  // ------------------------------------------------

  useEffect(() => {
    setMobileOpen(false);
  }, [
    location.pathname,
    location.search,
  ]);

  // ------------------------------------------------
  // SEARCH
  // ------------------------------------------------

  function submitSearch(event) {
    event.preventDefault();

    const value =
      search.trim();

    navigate(
      value
        ? `/shop?search=${encodeURIComponent(
            value
          )}`
        : "/shop"
    );

    setMobileOpen(false);
  }

  // ------------------------------------------------
  // LOGOUT
  // ------------------------------------------------

  function handleLogout() {
    logout();

    setLocalUser(null);
    setMobileOpen(false);

    window.dispatchEvent(
      new Event(
        "styleverse-auth-changed"
      )
    );

    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f7f3ec]/95 text-[#171513] backdrop-blur-xl">
      {/* ========================================== */}
      {/* ANNOUNCEMENT */}
      {/* ========================================== */}

      <div className="border-b border-[#f7f3ec]/15 bg-[#171513] px-4">
        <div className="mx-auto flex min-h-10 max-w-[1500px] items-center justify-center gap-3 text-center">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9aa72]" />

          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#f7f3ec]/90 sm:text-xs sm:tracking-[0.24em]">
            New season / New mood / New you
          </p>

          <span className="hidden text-sm text-[#f7f3ec]/30 sm:inline">
            ·
          </span>

          <p className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-[#f7f3ec]/65 sm:block">
            Explore the latest Styleverse collection
          </p>
        </div>
      </div>

      {/* ========================================== */}
      {/* MAIN NAV */}
      {/* ========================================== */}

      <div className="border-b border-[#171513]/10 bg-[#f7f3ec]/95">
        <div className="mx-auto flex min-h-[82px] max-w-[1500px] items-center gap-6 px-5 sm:px-8 xl:px-10">
          {/* LOGO */}

          <Link
            to="/"
            aria-label="Styleverse home"
            className="shrink-0 text-[30px] font-semibold tracking-[-0.055em] text-[#171513] sm:text-[34px]"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Styleverse
          </Link>

          {/* DESKTOP NAV */}

          <nav
            className="hidden items-center gap-8 lg:flex"
            aria-label="Primary navigation"
          >
            {navItems.map(
              (item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={
                    navLinkClass
                  }
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          {/* DESKTOP SEARCH */}

          <form
            onSubmit={
              submitSearch
            }
            className="ml-auto hidden max-w-[420px] flex-1 xl:block"
          >
            <label className="relative block">
              <span className="sr-only">
                Search products
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search products, styles or moods"
                className="h-12 w-full border border-[#171513]/10 bg-white/70 pl-12 pr-4 text-[14px] text-[#171513] outline-none transition placeholder:text-[#8b8479] focus:border-[#171513]/30 focus:bg-white"
              />

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5f584f]">
                <Icon
                  name="search"
                  size={20}
                />
              </span>
            </label>
          </form>

          {/* DESKTOP ACTIONS */}

          <div className="hidden items-center gap-1 md:flex">
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="group relative inline-flex h-12 w-12 items-center justify-center text-[#332f2b] transition hover:bg-white/70"
            >
              <Icon
                name="heart"
                size={22}
              />

              <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#c9aa72] opacity-0 transition group-hover:opacity-100" />
            </Link>

            <Link
              to="/cart"
              aria-label="Shopping bag"
              className="group relative inline-flex h-12 w-12 items-center justify-center text-[#332f2b] transition hover:bg-white/70"
            >
              <Icon
                name="bag"
                size={22}
              />

              <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#c9aa72] opacity-0 transition group-hover:opacity-100" />
            </Link>

            {/* ADMIN */}

            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className="ml-2 border-l border-[#171513]/10 pl-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5f584f] transition hover:text-[#171513]"
                >
                  Admin
                </Link>

                <Link
                  to="/profile"
                  className="ml-3 flex items-center gap-3 border-l border-[#171513]/10 pl-5"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#26221f] text-[12px] font-semibold tracking-[0.08em] text-[#f7f3ec]">
                    {initials}
                  </span>

                  <span className="hidden xl:block">
                    <span className="block text-[13px] font-semibold text-[#171513]">
                      {
                        displayName
                      }
                    </span>

                    <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#8b8479]">
                      Administrator
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="ml-2 inline-flex h-10 items-center px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b8479] transition hover:text-[#171513]"
                >
                  Logout
                </button>
              </>
            ) : isLoggedIn ? (
              <Link
                to="/profile"
                className="ml-3 flex items-center gap-3 border-l border-[#171513]/10 pl-5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d6c6ae] text-[12px] font-semibold tracking-[0.08em] text-[#322b24]">
                  {initials}
                </span>

                <span className="hidden xl:block">
                  <span className="block text-[13px] font-semibold text-[#171513]">
                    {displayName}
                  </span>

                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[#8b8479]">
                    My profile
                  </span>
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="ml-3 inline-flex h-11 items-center gap-2 border-l border-[#171513]/10 pl-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#332f2b] transition hover:text-[#8a6e42]"
              >
                <Icon
                  name="user"
                  size={18}
                />

                Login

                <Icon
                  name="arrow"
                  size={15}
                />
              </Link>
            )}
          </div>

          {/* MOBILE ACTIONS */}

          <div className="ml-auto flex items-center gap-1 md:hidden">
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="inline-flex h-11 w-11 items-center justify-center"
            >
              <Icon
                name="heart"
                size={21}
              />
            </Link>

            <Link
              to="/cart"
              aria-label="Shopping bag"
              className="inline-flex h-11 w-11 items-center justify-center"
            >
              <Icon
                name="bag"
                size={21}
              />
            </Link>

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  (open) =>
                    !open
                )
              }
              className="inline-flex h-11 w-11 items-center justify-center"
              aria-expanded={
                mobileOpen
              }
              aria-label={
                mobileOpen
                  ? "Close menu"
                  : "Open menu"
              }
            >
              <Icon
                name={
                  mobileOpen
                    ? "close"
                    : "menu"
                }
                size={22}
              />
            </button>
          </div>
        </div>

        {/* ======================================== */}
        {/* MOBILE MENU */}
        {/* ======================================== */}

        {mobileOpen && (
          <div className="border-t border-[#171513]/10 bg-[#f7f3ec] lg:hidden">
            <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
              {/* MOBILE SEARCH */}

              <form
                onSubmit={
                  submitSearch
                }
                className="mb-6"
              >
                <label className="relative block">
                  <span className="sr-only">
                    Search products
                  </span>

                  <input
                    autoFocus
                    value={search}
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search products, styles or moods"
                    className="h-12 w-full border border-[#171513]/10 bg-white px-12 pr-4 text-[14px] outline-none focus:border-[#171513]/30"
                  />

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5f584f]">
                    <Icon
                      name="search"
                      size={20}
                    />
                  </span>
                </label>
              </form>

              {/* MOBILE NAV */}

              <nav
                className="grid gap-1"
                aria-label="Mobile navigation"
              >
                {navItems.map(
                  (item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        [
                          "flex items-center justify-between border-b border-[#171513]/10 py-4",
                          "text-[14px] font-semibold uppercase tracking-[0.1em]",
                          isActive
                            ? "text-[#171513]"
                            : "text-[#70695f]",
                        ].join(
                          " "
                        )
                      }
                    >
                      <span>
                        {
                          item.label
                        }
                      </span>

                      <Icon
                        name="arrow"
                        size={17}
                      />
                    </NavLink>
                  )
                )}

                {/* WISHLIST */}

                <NavLink
                  to="/wishlist"
                  className="flex items-center justify-between border-b border-[#171513]/10 py-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-[#70695f]"
                >
                  <span>
                    Wishlist
                  </span>

                  <Icon
                    name="heart"
                    size={18}
                  />
                </NavLink>

                {/* ADMIN */}

                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className="flex items-center justify-between border-b border-[#171513]/10 py-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-[#70695f]"
                  >
                    <span>
                      Admin
                    </span>

                    <Icon
                      name="arrow"
                      size={17}
                    />
                  </NavLink>
                )}

                {/* ACCOUNT */}

                {isLoggedIn ? (
                  <>
                    <NavLink
                      to="/profile"
                      className="flex items-center justify-between border-b border-[#171513]/10 py-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-[#70695f]"
                    >
                      <span>
                        {isAdmin
                          ? "Admin Profile"
                          : "My Profile"}
                      </span>

                      <Icon
                        name="user"
                        size={18}
                      />
                    </NavLink>

                    <NavLink
                      to="/orders"
                      className="flex items-center justify-between border-b border-[#171513]/10 py-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-[#70695f]"
                    >
                      <span>
                        Orders
                      </span>

                      <Icon
                        name="arrow"
                        size={17}
                      />
                    </NavLink>

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="flex items-center justify-between py-4 text-left text-[14px] font-semibold uppercase tracking-[0.1em] text-[#8b8479]"
                    >
                      <span>
                        Logout
                      </span>

                      <Icon
                        name="arrow"
                        size={17}
                      />
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="flex items-center justify-between border-b border-[#171513]/10 py-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-[#171513]"
                    >
                      <span>
                        Login
                      </span>

                      <Icon
                        name="arrow"
                        size={17}
                      />
                    </Link>

                    <Link
                      to="/signup"
                      className="flex items-center justify-between py-4 text-[14px] font-semibold uppercase tracking-[0.1em] text-[#171513]"
                    >
                      <span>
                        Create account
                      </span>

                      <Icon
                        name="arrow"
                        size={17}
                      />
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}