import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { apiJson, apiRequest } from "../../utils/api";

const ADMIN_NAV = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Products", to: "/admin/products", end: true },
  { label: "Orders", to: "/admin/orders", end: true },
  { label: "Coupons", to: "/admin/coupons", end: true },
  { label: "Users", to: "/admin/users", end: true },
  { label: "Reports", to: "/admin/reports", end: true },
];

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["pending", "Pending"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

const UPDATE_STATUSES = [
  ["pending", "Pending"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

function getId(item) {
  return item?._id || item?.id || "";
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatus(order) {
  return String(
    order?.orderStatus ||
      order?.status ||
      "pending"
  ).toLowerCase();
}

function statusLabel(status) {
  const labels = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return (
    labels[status] ||
    String(status)
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      )
  );
}

function statusClass(status) {
  if (status === "delivered") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "shipped") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-[#cdb898]/40 bg-[#f2e8da] text-[#765c41]";
}

function getItemCount(order) {
  const items = Array.isArray(order?.items)
    ? order.items
    : [];

  return items.reduce(
    (sum, item) =>
      sum + Number(item?.quantity || 1),
    0
  );
}

function getCustomerName(order) {
  return (
    order?.userId?.name ||
    order?.user?.name ||
    order?.customer?.name ||
    order?.shippingAddress?.fullName ||
    order?.shippingAddress?.name ||
    order?.userId?.email ||
    order?.user?.email ||
    "Customer"
  );
}

function getCustomerEmail(order) {
  return (
    order?.userId?.email ||
    order?.user?.email ||
    order?.customer?.email ||
    "—"
  );
}

function normalizeOrders(response) {
  const root =
    response?.data ?? response ?? {};

  const candidates = [
    root.orders,
    root.items,
    root.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getInitials(name) {
  return String(name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function AdminOrderSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse border border-[#1d1916]/10 bg-white p-5"
          >
            <div className="h-4 w-40 bg-[#e4ddd2]" />
            <div className="mt-3 h-3 w-56 bg-[#e4ddd2]" />
            <div className="mt-5 h-3 w-full bg-[#e4ddd2]" />
          </div>
        )
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] =
    useState("");
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [busyId, setBusyId] =
    useState("");
  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const loadOrders = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams({
            limit: "50",
          });

        if (statusFilter) {
          params.set(
            "status",
            statusFilter
          );
        }

        const response =
          await apiRequest(
            `/admin/orders?${params.toString()}`
          );

        setOrders(
          normalizeOrders(response)
        );
      } catch (err) {
        setOrders([]);
        setError(
          err?.message ||
            "Unable to load admin orders."
        );
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) {
      return orders;
    }

    return orders.filter(
      (order) => {
        const id =
          String(
            getId(order)
          ).toLowerCase();

        const customer =
          String(
            getCustomerName(order)
          ).toLowerCase();

        const email =
          String(
            getCustomerEmail(order)
          ).toLowerCase();

        return (
          id.includes(term) ||
          customer.includes(term) ||
          email.includes(term)
        );
      }
    );
  }, [orders, search]);

  const summary = useMemo(() => {
    const totalOrders =
      filteredOrders.length;

    const revenue =
      filteredOrders.reduce(
        (sum, order) =>
          sum +
          Number(
            order?.totalAmount || 0
          ),
        0
      );

    const processing =
      filteredOrders.filter(
        (order) =>
          getStatus(order) ===
          "processing"
      ).length;

    const delivered =
      filteredOrders.filter(
        (order) =>
          getStatus(order) ===
          "delivered"
      ).length;

    return {
      totalOrders,
      revenue,
      processing,
      delivered,
    };
  }, [filteredOrders]);

  async function updateStatus(
    order,
    nextStatus
  ) {
    const id = getId(order);

    if (!id || !nextStatus) return;

    const currentStatus =
      getStatus(order);

    if (
      currentStatus ===
      nextStatus
    ) {
      return;
    }

    setBusyId(id);
    setError("");

    try {
      const response =
        await apiJson(
          `/admin/orders/${id}`,
          {
            method: "PATCH",
            data: {
              orderStatus:
                nextStatus,
            },
          }
        );

      const updated =
        response?.data?.order ||
        response?.order ||
        null;

      setOrders((current) =>
        current.map((item) =>
          getId(item) === id
            ? updated || {
                ...item,
                orderStatus:
                  nextStatus,
              }
            : item
        )
      );

      setSelectedOrder((current) =>
        current &&
        getId(current) === id
          ? updated || {
              ...current,
              orderStatus:
                nextStatus,
            }
          : current
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not update order status."
      );
    } finally {
      setBusyId("");
    }
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
                Order control
              </p>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {ADMIN_NAV.map(
                (item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        "flex items-center justify-between px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] transition",
                        isActive
                          ? "bg-[#1d1916] text-[#f7f3ec]"
                          : "text-[#665d54] hover:bg-[#f7f3ec]",
                      ].join(" ")
                    }
                  >
                    {item.label}
                    {item.label ===
                      "Orders" && (
                      <span className="text-xs">
                        •
                      </span>
                    )}
                  </NavLink>
                )
              )}
            </nav>

            <div className="border-t border-[#1d1916]/10 p-5">
              <Link
                to="/admin"
                className="text-xs font-semibold uppercase tracking-[0.14em] underline"
              >
                ← Dashboard
              </Link>

              <Link
                to="/"
                className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-[#82786c] underline"
              >
                View store →
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-[#1d1916]/10 bg-[#f7f3ec]">
            <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                    Styleverse / Administration / Orders
                  </p>

                  <h1
                    className="mt-3 text-5xl leading-none tracking-[-0.045em] sm:text-6xl lg:text-7xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    The orders.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#70685f]">
                    Review purchases, see customer details and keep order status moving from pending to delivery.
                  </p>
                </div>

                <Link
                  to="/admin"
                  className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                >
                  Back to dashboard
                </Link>
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto lg:hidden">
                {ADMIN_NAV.map(
                  (item) => (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [
                          "shrink-0 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.11em]",
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
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Orders
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.totalOrders}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Current result
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Value
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {money(
                    summary.revenue
                  )}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Current result total
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Processing
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.processing}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Orders being prepared
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Delivered
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.delivered}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Completed deliveries
                </p>
              </div>
            </section>

            <section className="mt-7 border border-[#1d1916]/10 bg-white p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div>
                  <label
                    htmlFor="admin-order-search"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#81776c]"
                  >
                    Search orders
                  </label>

                  <input
                    id="admin-order-search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search order ID, customer name or email…"
                    className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none focus:border-[#1d1916] focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="order-status-filter"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#81776c]"
                  >
                    Status
                  </label>

                  <select
                    id="order-status-filter"
                    value={
                      statusFilter
                    }
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value
                      )
                    }
                    className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none focus:border-[#1d1916] focus:bg-white"
                  >
                    {STATUS_OPTIONS.map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-[#81776c]">
                <span>
                  {search.trim()
                    ? `Searching for “${search.trim()}”`
                    : "Latest orders from the admin order endpoint"}
                </span>

                <button
                  type="button"
                  onClick={loadOrders}
                  disabled={loading}
                  className="border border-[#1d1916]/15 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#1d1916] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Refreshing…" : "Refresh orders"}
                </button>
              </div>
            </section>

            {error && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={
                    loadOrders
                  }
                  className="text-sm font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            <section className="mt-7">
              {loading ? (
                <AdminOrderSkeleton />
              ) : filteredOrders.length ===
                0 ? (
                <div className="border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                    Orders
                  </p>

                  <h2
                    className="mt-4 text-4xl sm:text-5xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Nothing matches.
                  </h2>

                  <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#71685f]">
                    Clear the search or choose another status to see more orders.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                    }}
                    className="mt-7 border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#f7f3ec]"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden border border-[#1d1916]/10 bg-white xl:block">
                    <div className="grid grid-cols-[1.25fr_1.25fr_0.65fr_0.75fr_0.9fr_1fr] border-b border-[#1d1916]/10 bg-[#eee7dc] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#766b60]">
                      <span>Order</span>
                      <span>Customer</span>
                      <span>Items</span>
                      <span>Total</span>
                      <span>Date</span>
                      <span>Status</span>
                    </div>

                    {filteredOrders.map(
                      (order) => {
                        const id =
                          getId(
                            order
                          );

                        const status =
                          getStatus(
                            order
                          );

                        const itemCount =
                          getItemCount(
                            order
                          );

                        return (
                          <div
                            key={id}
                            className="grid grid-cols-[1.25fr_1.25fr_0.65fr_0.75fr_0.9fr_1fr] items-center border-b border-[#1d1916]/10 px-5 py-5 last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="text-left"
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#9a7655]">
                                Order
                              </p>

                              <p className="mt-1 text-sm font-semibold underline">
                                #{String(
                                  id
                                ).slice(
                                  -10
                                )}
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="flex min-w-0 items-center gap-3 text-left"
                            >
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1d1916] text-xs font-semibold text-[#f7f3ec]">
                                {getInitials(
                                  getCustomerName(
                                    order
                                  )
                                )}
                              </span>

                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {getCustomerName(
                                    order
                                  )}
                                </span>

                                <span className="mt-1 block truncate text-xs text-[#8b8177]">
                                  {getCustomerEmail(
                                    order
                                  )}
                                </span>
                              </span>
                            </button>

                            <span className="text-sm text-[#615950]">
                              {itemCount}{" "}
                              {itemCount ===
                              1
                                ? "item"
                                : "items"}
                            </span>

                            <span className="text-sm font-semibold">
                              {money(
                                order?.totalAmount
                              )}
                            </span>

                            <span className="text-sm text-[#81776c]">
                              {formatDate(
                                order?.createdAt ||
                                  order?.placedAt
                              )}
                            </span>

                            <div>
                              <select
                                value={
                                  status
                                }
                                disabled={
                                  busyId ===
                                  id
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateStatus(
                                    order,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className={[
                                  "w-full border bg-white px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] outline-none",
                                  statusClass(
                                    status
                                  ),
                                ].join(
                                  " "
                                )}
                                aria-label={`Update order ${id} status`}
                              >
                                {UPDATE_STATUSES.map(
                                  ([
                                    value,
                                    label,
                                  ]) => (
                                    <option
                                      key={
                                        value
                                      }
                                      value={
                                        value
                                      }
                                    >
                                      {label}
                                    </option>
                                  )
                                )}
                              </select>

                              {busyId ===
                                id && (
                                <p className="mt-1 text-[10px] text-[#8c8378]">
                                  Updating…
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <div className="space-y-3 xl:hidden">
                    {filteredOrders.map(
                      (order) => {
                        const id =
                          getId(
                            order
                          );

                        const status =
                          getStatus(
                            order
                          );

                        const itemCount =
                          getItemCount(
                            order
                          );

                        return (
                          <article
                            key={id}
                            className="border border-[#1d1916]/10 bg-white p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedOrder(
                                    order
                                  )
                                }
                                className="min-w-0 text-left"
                              >
                                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#9a7655]">
                                  Order
                                </p>

                                <p className="mt-1 text-base font-semibold underline">
                                  #{String(
                                    id
                                  ).slice(
                                    -10
                                  )}
                                </p>
                              </button>

                              <span
                                className={[
                                  "shrink-0 border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                                  statusClass(
                                    status
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                {statusLabel(
                                  status
                                )}
                              </span>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1d1916] text-xs font-semibold text-[#f7f3ec]">
                                {getInitials(
                                  getCustomerName(
                                    order
                                  )
                                )}
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {getCustomerName(
                                    order
                                  )}
                                </p>

                                <p className="truncate text-xs text-[#8b8177]">
                                  {getCustomerEmail(
                                    order
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#1d1916]/10 py-4">
                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Total
                                </p>
                                <p className="mt-1 text-base font-semibold">
                                  {money(
                                    order?.totalAmount
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Items
                                </p>
                                <p className="mt-1 text-base font-semibold">
                                  {itemCount}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Date
                                </p>
                                <p className="mt-1 text-sm">
                                  {formatDate(
                                    order?.createdAt ||
                                      order?.placedAt
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Payment
                                </p>
                                <p className="mt-1 text-sm capitalize">
                                  {order?.paymentStatus ||
                                    "—"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#81776c]">
                                Update status
                              </label>

                              <select
                                value={
                                  status
                                }
                                disabled={
                                  busyId ===
                                  id
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateStatus(
                                    order,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className={[
                                  "w-full border px-3 py-3 text-sm font-semibold outline-none",
                                  statusClass(
                                    status
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                {UPDATE_STATUSES.map(
                                  ([
                                    value,
                                    label,
                                  ]) => (
                                    <option
                                      key={
                                        value
                                      }
                                      value={
                                        value
                                      }
                                    >
                                      {label}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOrder(
                                  order
                                )
                              }
                              className="mt-4 w-full border border-[#1d1916]/20 bg-[#fbf8f3] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                            >
                              View order details
                            </button>
                          </article>
                        );
                      }
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Order ${String(getId(selectedOrder)).slice(-10)} details`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1d1916]/45 p-0 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedOrder(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full overflow-y-auto border border-[#1d1916]/10 bg-[#f7f3ec] sm:max-w-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#1d1916]/10 bg-[#f7f3ec] px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                  Order detail
                </p>

                <h2
                  className="mt-2 text-4xl"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  #{String(
                    getId(
                      selectedOrder
                    )
                  ).slice(-10)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(
                    null
                  )
                }
                className="border border-[#1d1916]/15 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border border-[#1d1916]/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8d8378]">
                    Customer
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    {getCustomerName(
                      selectedOrder
                    )}
                  </p>

                  <p className="mt-1 break-all text-xs text-[#81776c]">
                    {getCustomerEmail(
                      selectedOrder
                    )}
                  </p>
                </div>

                <div className="border border-[#1d1916]/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8d8378]">
                    Total
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {money(
                      selectedOrder?.totalAmount
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[#81776c]">
                    Payment:{" "}
                    {selectedOrder?.paymentStatus ||
                      "—"}
                  </p>
                </div>

                <div className="border border-[#1d1916]/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8d8378]">
                    Status
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    {statusLabel(
                      getStatus(
                        selectedOrder
                      )
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[#81776c]">
                    {formatDate(
                      selectedOrder?.createdAt ||
                        selectedOrder?.placedAt
                    )}
                  </p>
                </div>
              </div>

              <section className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                  Shipping
                </p>

                <h3
                  className="mt-2 text-3xl"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  Delivery address.
                </h3>

                <div className="mt-5 border-t border-[#1d1916]/10 pt-4 text-sm leading-7 text-[#625a52]">
                  <p className="font-semibold text-[#1d1916]">
                    {selectedOrder
                      ?.shippingAddress
                      ?.fullName ||
                      selectedOrder
                        ?.shippingAddress
                        ?.name ||
                      getCustomerName(
                        selectedOrder
                      )}
                  </p>

                  {selectedOrder
                    ?.shippingAddress
                    ?.phone && (
                    <p>
                      {
                        selectedOrder
                          .shippingAddress
                          .phone
                      }
                    </p>
                  )}

                  <p>
                    {[
                      selectedOrder
                        ?.shippingAddress
                        ?.addressLine1 ||
                        selectedOrder
                          ?.shippingAddress
                          ?.street,
                      selectedOrder
                        ?.shippingAddress
                        ?.addressLine2,
                      selectedOrder
                        ?.shippingAddress
                        ?.city,
                      selectedOrder
                        ?.shippingAddress
                        ?.state,
                      selectedOrder
                        ?.shippingAddress
                        ?.postalCode ||
                        selectedOrder
                          ?.shippingAddress
                          ?.zip,
                      selectedOrder
                        ?.shippingAddress
                        ?.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </section>

              <section className="border border-[#1d1916]/10 bg-white">
                <div className="border-b border-[#1d1916]/10 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                    Items
                  </p>
                </div>

                <div className="divide-y divide-[#1d1916]/10">
                  {Array.isArray(
                    selectedOrder?.items
                  ) &&
                  selectedOrder.items
                    .length > 0 ? (
                    selectedOrder.items.map(
                      (item, index) => {
                        const name =
                          item?.productName ||
                          item?.name ||
                          item?.product?.name ||
                          item?.title ||
                          "Order item";

                        const qty =
                          Number(
                            item?.quantity ||
                              1
                          );

                        const price =
                          Number(
                            item?.price ??
                              item?.unitPrice ??
                              item?.product
                                ?.price ??
                              0
                          );

                        return (
                          <div
                            key={
                              item?._id ||
                              `order-item-${index}`
                            }
                            className="flex items-center justify-between gap-4 px-5 py-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {name}
                              </p>

                              <p className="mt-1 text-xs text-[#81776c]">
                                Qty {qty}
                                {item?.selectedSize
                                  ? ` · Size ${item.selectedSize}`
                                  : ""}
                                {item?.selectedColor
                                  ? ` · ${item.selectedColor}`
                                  : ""}
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-semibold">
                              {money(
                                price *
                                  qty
                              )}
                            </p>
                          </div>
                        );
                      }
                    )
                  ) : (
                    <p className="px-5 py-5 text-sm text-[#7b7167]">
                      Item details are not available in this response.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}