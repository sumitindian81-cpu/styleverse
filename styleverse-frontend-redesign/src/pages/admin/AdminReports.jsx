import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiRequest, getAuthToken } from "../../utils/api";

const ADMIN_NAV = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Products", to: "/admin/products", end: true },
  { label: "Orders", to: "/admin/orders", end: true },
  { label: "Coupons", to: "/admin/coupons", end: true },
  { label: "Users", to: "/admin/users", end: true },
  { label: "Reports", to: "/admin/reports", end: true },
];

function readStoredUser() {
  const keys = ["styleverse_user", "user", "styleverseUser"];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
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
    (user?.email ? user.email.split("@")[0] : "") ||
    "Administrator"
  );
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function number(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function unwrap(response) {
  return response?.data ?? response ?? {};
}

function normalizeSales(response) {
  const root = unwrap(response);
  const data = root?.report || root?.salesReport || root?.stats || root;

  const raw = firstArray(
    data?.sales,
    data?.monthlySales,
    data?.revenue,
    data?.months,
    data?.items,
    data
  );

  return raw
    .map((item) => {
      if (item == null) return null;

      if (typeof item === "number") {
        return {
          label: "Month",
          value: Number(item) || 0,
        };
      }

      return {
        label:
          item?.label ||
          item?.monthName ||
          item?.month ||
          item?.period ||
          item?.date ||
          "Month",
        value: Number(
          item?.value ??
            item?.revenue ??
            item?.sales ??
            item?.total ??
            item?.amount ??
            0
        ) || 0,
      };
    })
    .filter(Boolean);
}

function normalizeTopProducts(response) {
  const root = unwrap(response);
  const data = root?.report || root?.topProductsReport || root?.stats || root;

  const raw = firstArray(
    data?.topProducts,
    data?.products,
    data?.items,
    data
  );

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const product = item?.product || item?.productId || item;
      const name =
        product?.name ||
        item?.productName ||
        item?.name ||
        "Unnamed product";

      return {
        id: product?._id || product?.id || item?._id || item?.id || name,
        name,
        brand: product?.brand || item?.brand || "",
        image:
          product?.images?.find((image) => image?.isMain)?.url ||
          product?.images?.[0]?.url ||
          product?.image ||
          item?.image ||
          "",
        units:
          Number(
            item?.unitsSold ??
              item?.quantity ??
              item?.sold ??
              item?.count ??
              product?.unitsSold ??
              0
          ) || 0,
        revenue:
          Number(
            item?.revenue ??
              item?.totalRevenue ??
              item?.sales ??
              item?.amount ??
              product?.revenue ??
              0
          ) || 0,
      };
    })
    .filter(Boolean);
}

function normalizeStats(response) {
  const root = unwrap(response);
  const stats = root?.stats || root;

  return {
    totalRevenue: Number(
      stats?.totalRevenue ?? stats?.revenue ?? 0
    ) || 0,
    totalOrders: Number(
      stats?.totalOrders ?? stats?.ordersCount ?? 0
    ) || 0,
    sales: firstArray(
      stats?.sales,
      stats?.monthlySales,
      root?.sales
    ),
    topProducts: firstArray(
      stats?.topProducts,
      root?.topProducts
    ),
  };
}

function getProductRankClass(index) {
  if (index === 0) return "bg-[#1d1916] text-white";
  if (index === 1) return "bg-[#ece3d6] text-[#1d1916]";
  if (index === 2) return "bg-[#f2ece4] text-[#6d5b4a]";
  return "bg-[#f6f2ed] text-[#7e7266]";
}

function StatusMessage({ type = "error", children }) {
  const classes =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <div
      className={`border px-4 py-3 text-sm font-medium ${classes}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-7">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="border border-[#1d1916]/10 bg-white p-6"
          >
            <div className="h-3 w-24 bg-[#e8dfd4]" />
            <div className="mt-4 h-8 w-36 bg-[#e8dfd4]" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
          <div className="h-7 w-56 bg-[#e8dfd4]" />
          <div className="mt-8 flex h-64 items-end gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex-1 bg-[#e8dfd4]"
                style={{ height: `${25 + ((index * 17) % 60)}%` }}
              />
            ))}
          </div>
        </div>

        <div className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
          <div className="h-7 w-40 bg-[#e8dfd4]" />
          <div className="mt-8 space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#e8dfd4]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-[#e8dfd4]" />
                  <div className="h-3 w-1/3 bg-[#e8dfd4]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => readStoredUser(), []);
  const isAdmin =
    String(storedUser?.role || "").toLowerCase() === "admin";

  const [sales, setSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [partialError, setPartialError] = useState("");

  const loadReports = useCallback(async ({ silent = false } = {}) => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setPartialError("");

    const salesPromise = apiRequest("/admin/reports/sales");
    const topProductsPromise = apiRequest("/admin/reports/top-products");
    const statsPromise = apiRequest("/admin/stats");

    const [salesResult, topProductsResult, statsResult] =
      await Promise.allSettled([
        salesPromise,
        topProductsPromise,
        statsPromise,
      ]);

    let didReceiveAnything = false;
    let reportsError = "";

    if (salesResult.status === "fulfilled") {
      const normalized = normalizeSales(salesResult.value);
      setSales(normalized);
      didReceiveAnything = true;
    } else {
      reportsError =
        salesResult.reason?.message ||
        "Sales report endpoint could not be loaded.";
    }

    if (topProductsResult.status === "fulfilled") {
      const normalized = normalizeTopProducts(topProductsResult.value);
      setTopProducts(normalized);
      didReceiveAnything = true;
    } else if (!reportsError) {
      reportsError =
        topProductsResult.reason?.message ||
        "Top products report endpoint could not be loaded.";
    }

    if (statsResult.status === "fulfilled") {
      const normalizedStats = normalizeStats(statsResult.value);
      setStats((current) => ({
        totalRevenue: normalizedStats.totalRevenue || current.totalRevenue,
        totalOrders: normalizedStats.totalOrders || current.totalOrders,
      }));

      if (salesResult.status !== "fulfilled" && normalizedStats.sales.length) {
        setSales(
          normalizeSales({
            data: {
              sales: normalizedStats.sales,
            },
          })
        );
        didReceiveAnything = true;
      }

      if (
        topProductsResult.status !== "fulfilled" &&
        normalizedStats.topProducts.length
      ) {
        setTopProducts(
          normalizeTopProducts({
            data: {
              topProducts: normalizedStats.topProducts,
            },
          })
        );
        didReceiveAnything = true;
      }
    }

    if (!didReceiveAnything) {
      setError(
        reportsError ||
          "Unable to load reports. Please check the admin report APIs."
      );
    } else if (reportsError) {
      setPartialError(
        "Some report data could not be loaded. Available admin statistics are still shown."
      );
    }

    if (silent) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const chartPoints = useMemo(() => {
    if (sales.length) {
      return sales.slice(-12);
    }

    return [];
  }, [sales]);

  const chartMax = useMemo(() => {
    return Math.max(
      ...chartPoints.map((item) => Number(item.value) || 0),
      1
    );
  }, [chartPoints]);

  const displayedRevenue = useMemo(() => {
    if (stats.totalRevenue > 0) return stats.totalRevenue;
    return sales.reduce((sum, item) => sum + item.value, 0);
  }, [sales, stats.totalRevenue]);

  const topProductUnits = useMemo(() => {
    return topProducts.reduce((sum, item) => sum + item.units, 0);
  }, [topProducts]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f6f1e9] text-[#1d1916]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-5 py-12">
          <section className="w-full border border-[#1d1916]/10 bg-white p-8 text-center shadow-[0_18px_70px_rgba(29,25,22,0.07)] sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              Styleverse Admin
            </p>
            <h1
              className="mt-4 text-4xl leading-tight sm:text-5xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Admin access required
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#6f665d]">
              This reports workspace is protected. Sign in with an administrator
              account to view store reporting data.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="border border-[#1d1916] bg-[#1d1916] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#332c27]"
              >
                Sign in
              </Link>
              <Link
                to="/"
                className="border border-[#1d1916]/15 bg-white px-6 py-3 text-sm font-semibold text-[#1d1916] transition hover:bg-[#faf8f4]"
              >
                Return to store
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f1e9] text-[#1d1916]">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        <aside className="hidden min-h-screen w-72 shrink-0 border-r border-[#1d1916]/10 bg-[#eee7dc] px-6 py-8 lg:block">
          <div className="sticky top-8">
            <div className="border-b border-[#1d1916]/10 pb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
                Styleverse
              </p>
              <p
                className="mt-2 text-3xl"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Administration
              </p>
              <p className="mt-3 text-sm leading-6 text-[#6f665d]">
                Store reporting, catalogue intelligence and operating signals.
              </p>
            </div>

            <nav className="mt-7 space-y-1" aria-label="Admin navigation">
              {ADMIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between border px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "border-[#1d1916] bg-[#1d1916] text-white"
                        : "border-transparent text-[#5f554c] hover:border-[#1d1916]/10 hover:bg-white/60 hover:text-[#1d1916]"
                    }`
                  }
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true">→</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-10 border-t border-[#1d1916]/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b8074]">
                Signed in as
              </p>
              <p className="mt-2 text-base font-semibold">
                {getDisplayName(storedUser)}
              </p>
              <p className="mt-1 text-sm text-[#6f665d]">Administrator</p>

              <div className="mt-6 grid gap-2">
                <Link
                  to="/"
                  className="border border-[#1d1916]/15 bg-white px-4 py-3 text-center text-sm font-semibold transition hover:bg-[#faf8f4]"
                >
                  View Store
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(0)}
                  className="border border-[#1d1916]/15 bg-transparent px-4 py-3 text-sm font-semibold text-[#5f554c] transition hover:bg-white/50 hover:text-[#1d1916]"
                >
                  Refresh page
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 border-b border-[#1d1916]/10 pb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
                  Store intelligence
                </p>
                <h1
                  className="mt-3 text-5xl leading-none sm:text-6xl"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Reports
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#6f665d] sm:text-lg">
                  Monthly revenue and top-product performance in one editorial
                  view, built for quick admin review.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/admin"
                  className="border border-[#1d1916]/15 bg-white px-4 py-3 text-sm font-semibold text-[#1d1916] transition hover:bg-[#faf8f4]"
                >
                  ← Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => loadReports({ silent: true })}
                  disabled={refreshing}
                  className="border border-[#1d1916] bg-[#1d1916] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#332c27] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? "Refreshing…" : "Refresh reports"}
                </button>
              </div>
            </div>

            <div className="mt-8">
              {loading ? (
                <ReportSkeleton />
              ) : (
                <>
                  {error ? <StatusMessage>{error}</StatusMessage> : null}
                  {!error && partialError ? (
                    <StatusMessage>{partialError}</StatusMessage>
                  ) : null}

                  <section className="mt-6 grid gap-4 sm:grid-cols-3">
                    <article className="border border-[#1d1916]/10 bg-white p-6 sm:p-7">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7f73]">
                        Reported revenue
                      </p>
                      <p
                        className="mt-3 text-3xl sm:text-4xl"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      >
                        {money(displayedRevenue)}
                      </p>
                      <p className="mt-2 text-sm text-[#6f665d]">
                        From the available admin reporting data.
                      </p>
                    </article>

                    <article className="border border-[#1d1916]/10 bg-white p-6 sm:p-7">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7f73]">
                        Orders tracked
                      </p>
                      <p
                        className="mt-3 text-3xl sm:text-4xl"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      >
                        {number(stats.totalOrders)}
                      </p>
                      <p className="mt-2 text-sm text-[#6f665d]">
                        Total orders exposed by the admin stats endpoint.
                      </p>
                    </article>

                    <article className="border border-[#1d1916]/10 bg-white p-6 sm:p-7">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7f73]">
                        Units in top products
                      </p>
                      <p
                        className="mt-3 text-3xl sm:text-4xl"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      >
                        {number(topProductUnits)}
                      </p>
                      <p className="mt-2 text-sm text-[#6f665d]">
                        Sum of reported units sold across returned top products.
                      </p>
                    </article>
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                    <article className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                            Revenue trend
                          </p>
                          <h2
                            className="mt-2 text-3xl sm:text-4xl"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                          >
                            Monthly revenue
                          </h2>
                        </div>
                        <p className="text-sm text-[#7a7065]">
                          {chartPoints.length
                            ? `${chartPoints.length} reported periods`
                            : "No monthly data returned yet"}
                        </p>
                      </div>

                      {chartPoints.length ? (
                        <div className="mt-9 overflow-x-auto pb-2">
                          <div className="flex h-[320px] min-w-[720px] items-end gap-4 border-b border-[#1d1916]/10 px-1 pb-4 sm:gap-6">
                            {chartPoints.map((point, index) => {
                              const height =
                                point.value > 0
                                  ? Math.max(
                                      (point.value / chartMax) * 88,
                                      7
                                    )
                                  : 4;

                              return (
                                <div
                                  key={`${point.label}-${index}`}
                                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-3"
                                >
                                  <div className="flex h-[255px] w-full items-end justify-center">
                                    <div
                                      className="w-full max-w-11 bg-[#1d1916] transition-all duration-300 hover:bg-[#332c27]"
                                      style={{ height: `${height}%` }}
                                      title={`${point.label}: ${money(point.value)}`}
                                    />
                                  </div>
                                  <span className="max-w-20 truncate text-center text-xs font-semibold uppercase tracking-[0.1em] text-[#7f756a]">
                                    {String(point.label)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-9 border border-dashed border-[#1d1916]/15 bg-[#fbf8f3] px-6 py-16 text-center">
                          <p
                            className="text-2xl"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                          >
                            No monthly revenue data yet
                          </p>
                          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#756b61]">
                            The page is ready for the sales report response. Once the
                            backend returns monthly values, the chart will populate
                            automatically.
                          </p>
                        </div>
                      )}
                    </article>

                    <article className="border border-[#1d1916]/10 bg-[#eee7dc] p-6 sm:p-8">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                          Product performance
                        </p>
                        <h2
                          className="mt-2 text-3xl sm:text-4xl"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                        >
                          Top products
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-[#6f665d]">
                          A compact view of the products returned by the admin
                          reporting layer.
                        </p>
                      </div>

                      {topProducts.length ? (
                        <div className="mt-7 divide-y divide-[#1d1916]/10 border-y border-[#1d1916]/10">
                          {topProducts.slice(0, 8).map((product, index) => (
                            <div key={`${product.id}-${index}`} className="py-4">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center text-sm font-semibold ${getProductRankClass(
                                    index
                                  )}`}
                                >
                                  {index + 1}
                                </div>

                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-14 w-12 shrink-0 object-cover bg-white"
                                  />
                                ) : (
                                  <div className="flex h-14 w-12 shrink-0 items-center justify-center bg-white text-lg text-[#9a8e81]">
                                    SV
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-base font-semibold">
                                    {product.name}
                                  </p>
                                  {product.brand ? (
                                    <p className="mt-1 truncate text-sm text-[#7b7064]">
                                      {product.brand}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="text-right">
                                  <p className="text-sm font-semibold">
                                    {money(product.revenue)}
                                  </p>
                                  <p className="mt-1 text-xs text-[#7b7064]">
                                    {number(product.units)} units
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-7 border border-dashed border-[#1d1916]/15 bg-white/60 px-5 py-12 text-center">
                          <p
                            className="text-2xl"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                          >
                            No top products yet
                          </p>
                          <p className="mt-3 text-sm leading-6 text-[#756b61]">
                            The list will appear when the top-products report returns
                            product performance data.
                          </p>
                        </div>
                      )}
                    </article>
                  </section>

                  <section className="mt-6 border border-[#1d1916]/10 bg-white p-6 sm:p-8">
                    <div className="flex flex-col gap-3 border-b border-[#1d1916]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                          Detailed view
                        </p>
                        <h2
                          className="mt-2 text-3xl sm:text-4xl"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                        >
                          Top-product table
                        </h2>
                      </div>
                      <p className="text-sm text-[#7b7064]">
                        {topProducts.length
                          ? `${topProducts.length} products reported`
                          : "No products returned"}
                      </p>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                      <table className="min-w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-[#1d1916]/10 text-xs uppercase tracking-[0.14em] text-[#857a6e]">
                            <th className="px-3 py-4 font-semibold">Rank</th>
                            <th className="px-3 py-4 font-semibold">Product</th>
                            <th className="px-3 py-4 font-semibold">Brand</th>
                            <th className="px-3 py-4 text-right font-semibold">Units</th>
                            <th className="px-3 py-4 text-right font-semibold">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProducts.length ? (
                            topProducts.map((product, index) => (
                              <tr
                                key={`table-${product.id}-${index}`}
                                className="border-b border-[#1d1916]/10 last:border-b-0"
                              >
                                <td className="px-3 py-4 text-sm font-semibold">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-4">
                                  <div className="flex min-w-[240px] items-center gap-3">
                                    {product.image ? (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        className="h-14 w-11 object-cover bg-[#f7f3ed]"
                                      />
                                    ) : (
                                      <div className="flex h-14 w-11 items-center justify-center bg-[#f7f3ed] text-xs font-semibold text-[#8d8275]">
                                        SV
                                      </div>
                                    )}
                                    <p className="text-sm font-semibold leading-6">
                                      {product.name}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-4 text-sm text-[#6f665d]">
                                  {product.brand || "—"}
                                </td>
                                <td className="px-3 py-4 text-right text-sm font-semibold">
                                  {number(product.units)}
                                </td>
                                <td className="px-3 py-4 text-right text-sm font-semibold">
                                  {money(product.revenue)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-14 text-center text-sm text-[#756b61]"
                              >
                                No top-product report data is available yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="mt-6 border border-[#1d1916]/10 bg-[#1d1916] p-7 text-white sm:p-9">
                    <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b795]">
                          Reporting foundation
                        </p>
                        <h2
                          className="mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                        >
                          One place to read revenue and product movement.
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                          The page is intentionally powered by the reporting APIs,
                          with the existing admin statistics endpoint used as a
                          graceful fallback where dedicated report responses are not
                          yet available.
                        </p>
                      </div>

                      <Link
                        to="/admin/orders"
                        className="inline-flex items-center justify-center border border-white/20 bg-white px-5 py-3 text-sm font-semibold text-[#1d1916] transition hover:bg-[#f4eee6]"
                      >
                        Review orders →
                      </Link>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      <div className="sticky bottom-0 border-t border-[#1d1916]/10 bg-[#eee7dc]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#1d1916] bg-[#1d1916] text-white"
                    : "border-[#1d1916]/15 bg-white text-[#1d1916]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}