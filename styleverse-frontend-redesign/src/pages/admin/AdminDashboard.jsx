import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiRequest, getAuthToken } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/admin",
  },
  {
    id: "products",
    label: "Products",
    to: "/admin/products",
  },
  {
    id: "orders",
    label: "Orders",
    to: "/admin/orders",
  },
  {
    id: "coupons",
    label: "Coupons",
    to: "/admin/coupons",
  },
  {
    id: "users",
    label: "Users",
    to: "/admin/users",
  },
  {
    id: "reports",
    label: "Reports",
    to: "/admin/reports",
  },
];

function readStoredUser() {
  const keys = [
    "styleverse_user",
    "user",
    "styleverseUser",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return parsed;
      }
    } catch {
      // Ignore malformed local-storage values.
    }
  }

  return null;
}

function getDisplayName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.displayName ||
    user?.username ||
    (user?.email
      ? user.email.split("@")[0]
      : "") ||
    "Administrator"
  );
}

function normalizeStats(response) {
  const root =
    response?.data ?? response ?? {};

  const stats =
    root.stats ||
    root;

  return {
    totalUsers: Number(
      stats?.totalUsers ??
        stats?.usersCount ??
        0
    ),
    totalOrders: Number(
      stats?.totalOrders ??
        stats?.ordersCount ??
        0
    ),
    totalRevenue: Number(
      stats?.totalRevenue ??
        stats?.revenue ??
        0
    ),
    productsCount: Number(
      stats?.productsCount ??
        stats?.totalProducts ??
        0
    ),
    sales:
      Array.isArray(stats?.sales)
        ? stats.sales
        : Array.isArray(
            stats?.monthlySales
          )
        ? stats.monthlySales
        : [],
  };
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function number(value) {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(Number(value) || 0);
}

function getMonthLabel(item) {
  return (
    item?.label ||
    item?.monthName ||
    item?.month ||
    item?.period ||
    "Month"
  );
}

function getMonthValue(item) {
  return Number(
    item?.value ??
      item?.revenue ??
      item?.sales ??
      item?.total ??
      0
  );
}

function getRecentMonths() {
  const formatter = new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "short",
    }
  );

  return Array.from(
    { length: 12 },
    (_, index) => {
      const date = new Date();

      date.setMonth(
        date.getMonth() - (5 - index)
      );

      return {
        label: formatter.format(date),
        value: 0,
      };
    }
  );
}

function MiniBarChart({ sales }) {
  const points =
    sales.length > 0
      ? sales.slice(-12).map((item) => ({
          label: getMonthLabel(item),
          value: getMonthValue(item),
        }))
      : getRecentMonths();

  const maxValue = Math.max(
    ...points.map(
      (item) => item.value
    ),
    1
  );

  return (
    <div className="mt-8">
      <div className="flex h-64 items-end gap-3 border-b border-[#1d1916]/10 pb-3 sm:gap-5">
        {points.map(
          (point, index) => {
            const height =
              point.value > 0
                ? Math.max(
                    (point.value /
                      maxValue) *
                      92,
                    7
                  )
                : 5;

            return (
              <div
                key={`${point.label}-${index}`}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-3"
              >
                <div className="flex h-52 w-full items-end justify-center">
                  <div
                    className="w-full max-w-12 bg-[#1d1916] transition-all"
                    style={{
                      height: `${height}%`,
                    }}
                    title={money(
                      point.value
                    )}
                  />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8176]">
                  {point.label}
                </span>
              </div>
            );
          }
        )}
      </div>

      {sales.length === 0 && (
        <p className="mt-4 text-xs text-[#8b8177]">
          No monthly sales values were returned by the dashboard API. The month labels are placeholders until real sales data is available.
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}) {
  return (
    <article className="border border-[#1d1916]/10 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
            {label}
          </p>

          <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-[#8b8176]">
            {detail}
          </p>
        </div>

        <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#1d1916]/10 bg-[#f8f3eb] text-sm text-[#7c7064]">
          {icon}
        </span>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#f7f3ec] animate-pulse">
      <div className="h-20 border-b border-[#1d1916]/10 bg-white" />

      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="h-3 w-28 bg-[#e3dcd1]" />
        <div className="mt-4 h-14 w-80 bg-[#e3dcd1]" />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-40 bg-white"
              />
            )
          )}
        </div>

        <div className="mt-8 h-96 bg-white" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth();

  const [user, setUser] = useState(
    () => authUser || readStoredUser()
  );

  const [stats, setStats] =
    useState({
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      productsCount: 0,
      sales: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  const loadDashboard = useCallback(
    async () => {
      setLoading(true);
      setError("");

      if (!getAuthToken()) {
        navigate("/login");
        return;
      }

      if (authUser) {
        setUser(authUser);
      }

      try {
        try {
          const me =
            await apiRequest(
              "/user/me"
            );

          const freshUser =
            me?.data?.user ||
            me?.user ||
            me?.data ||
            null;

          if (freshUser) {
            setUser(freshUser);
          }
        } catch {
          // Current backend may not expose /user/me.
          // Cached logged-in user remains usable.
        }

        const response =
          await apiRequest(
            "/admin/stats"
          );

        setStats(
          normalizeStats(
            response
          )
        );
      } catch (err) {
        setError(
          err?.message ||
            "Could not load the admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    },
    [authUser, navigate]
  );

  useEffect(() => {
    if (!authLoading) {
      loadDashboard();
    }
  }, [authLoading, loadDashboard]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }

  const isAdmin =
    String(
      user?.role || ""
    ).toLowerCase() === "admin";

  const quickStats = useMemo(
    () => [
      {
        label: "Total users",
        value: number(
          stats.totalUsers
        ),
        detail:
          "Registered customer and account base",
        icon: "U",
      },
      {
        label: "Total orders",
        value: number(
          stats.totalOrders
        ),
        detail:
          "Orders recorded across the store",
        icon: "O",
      },
      {
        label: "Revenue",
        value: money(
          stats.totalRevenue
        ),
        detail:
          "Revenue reported by the dashboard API",
        icon: "₹",
      },
      {
        label: "Products",
        value: number(
          stats.productsCount
        ),
        detail:
          "Products available to admin management",
        icon: "P",
      },
    ],
    [stats]
  );

  if (authLoading || loading) {
    return <Skeleton />;
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
            Styleverse / Admin
          </p>

          <h1
            className="mt-4 text-5xl leading-none tracking-[-0.04em] sm:text-6xl"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Administrator access required.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#70685f]">
            This area is reserved for accounts with the admin role.
          </p>

          <Link
            to="/"
            className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-[#f7f3ec]"
          >
            Return to store
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[#1d1916]/10 bg-[#eee7dc] lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-[#1d1916]/10 px-6 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                Styleverse
              </p>

              <h2
                className="mt-2 text-3xl"
                style={{
                  fontFamily:
                    "Georgia, 'Times New Roman', serif",
                }}
              >
                Admin.
              </h2>

              <p className="mt-2 text-sm text-[#81776c]">
                Control centre
              </p>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {NAV_ITEMS.map(
                (item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={
                      item.to ===
                      "/admin"
                    }
                    className={({ isActive }) =>
                      [
                        "flex items-center justify-between px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] transition",
                        isActive
                          ? "bg-[#1d1916] text-[#f7f3ec]"
                          : "text-[#665d54] hover:bg-[#f7f3ec]",
                      ].join(" ")
                    }
                  >
                    <span>
                      {item.label}
                    </span>

                    {item.id ===
                      "dashboard" && (
                      <span className="text-[11px]">
                        •
                      </span>
                    )}
                  </NavLink>
                )
              )}
            </nav>

            <div className="border-t border-[#1d1916]/10 p-5">
              <div className="text-sm font-semibold">
                {getDisplayName(
                  user
                )}
              </div>

              <div className="mt-1 text-xs text-[#81776c]">
                {user?.email ||
                  "Administrator"}
              </div>

              <Link
                to="/profile"
                className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.12em] underline"
              >
                Account →
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-[#1d1916]/10 bg-[#f7f3ec]">
            <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-10">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                    Styleverse / Administration
                  </p>

                  <h1
                    className="mt-3 text-5xl leading-none tracking-[-0.045em] sm:text-6xl lg:text-7xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Welcome back,{" "}
                    {getDisplayName(
                      user
                    )}
                    .
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#70685f]">
                    Your store at a glance — products, customers, orders and revenue in one place.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="border border-[#1d1916]/15 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </button>

                  <Link
                    to="/"
                    className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                  >
                    View store
                  </Link>

                  <Link
                    to="/admin/products/new"
                    className="border border-[#1d1916] bg-[#1d1916] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f7f3ec]"
                  >
                    + Add product
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto lg:hidden">
                {NAV_ITEMS.map(
                  (item) => (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      end={
                        item.to ===
                        "/admin"
                      }
                      className={({ isActive }) =>
                        [
                          "shrink-0 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em]",
                          isActive
                            ? "border-[#1d1916] bg-[#1d1916] text-[#f7f3ec]"
                            : "border-[#1d1916]/15 bg-white text-[#655c53]",
                        ].join(" ")
                      }
                    >
                      {item.label}
                    </NavLink>
                  )
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            {error && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={
                    loadDashboard
                  }
                  className="text-sm font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {quickStats.map(
                (item) => (
                  <StatCard
                    key={
                      item.label
                    }
                    {...item}
                  />
                )
              )}
            </section>

            <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
              <div className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
                <div className="flex flex-col gap-4 border-b border-[#1d1916]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                      Sales overview
                    </p>

                    <h2
                      className="mt-2 text-4xl sm:text-5xl"
                      style={{
                        fontFamily:
                          "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      Revenue, by month.
                    </h2>
                  </div>

                  <div className="text-right">
                    <span className="text-xs uppercase tracking-[0.12em] text-[#8a8177]">
                      Last 12 months when available
                    </span>
                    <p className="mt-1 text-[10px] text-[#aaa095]">
                      Source: /admin/stats
                    </p>
                  </div>
                </div>

                <MiniBarChart
                  sales={
                    stats.sales
                  }
                />
              </div>

              <aside className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                  Workspace
                </p>

                <h2
                  className="mt-2 text-4xl"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  What needs your attention?
                </h2>

                <div className="mt-7 divide-y divide-[#1d1916]/10 border-y border-[#1d1916]/10">
                  <Link
                    to="/admin/products"
                    className="flex items-center justify-between py-4 text-sm font-semibold"
                  >
                    <span>
                      Manage products
                    </span>
                    <span>→</span>
                  </Link>

                  <Link
                    to="/admin/orders"
                    className="flex items-center justify-between py-4 text-sm font-semibold"
                  >
                    <span>
                      Review orders
                    </span>
                    <span>→</span>
                  </Link>

                  <Link
                    to="/admin/users"
                    className="flex items-center justify-between py-4 text-sm font-semibold"
                  >
                    <span>
                      Manage users
                    </span>
                    <span>→</span>
                  </Link>

                  <Link
                    to="/admin/coupons"
                    className="flex items-center justify-between py-4 text-sm font-semibold"
                  >
                    <span>
                      Manage coupons
                    </span>
                    <span>→</span>
                  </Link>

                  <Link
                    to="/admin/reports"
                    className="flex items-center justify-between py-4 text-sm font-semibold"
                  >
                    <span>
                      Open reports
                    </span>
                    <span>→</span>
                  </Link>
                </div>
              </aside>
            </section>

            <section className="mt-8 border border-[#1d1916]/10 bg-[#eee7dc] p-6 sm:p-8">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                    Styleverse operations
                  </p>

                  <h2
                    className="mt-2 max-w-3xl text-4xl leading-tight sm:text-5xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Keep the catalogue beautiful and the customer journey moving.
                  </h2>

                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#6f665d]">
                    Product management, order updates, users and coupons are all available from the admin workspace.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-px border border-[#1d1916]/10 bg-[#1d1916]/10">
                  <div className="bg-white px-5 py-4 text-center">
                    <p className="text-2xl font-semibold">
                      {number(
                        stats.totalOrders
                      )}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#92887c]">
                      orders
                    </p>
                  </div>

                  <div className="bg-white px-5 py-4 text-center">
                    <p className="text-2xl font-semibold">
                      {number(
                        stats.productsCount
                      )}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#92887c]">
                      products
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}