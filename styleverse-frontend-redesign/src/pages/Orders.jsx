import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, getAuthToken } from "../utils/api";

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatus(order) {
  return String(
    order?.status ||
      order?.orderStatus ||
      "pending"
  ).toLowerCase();
}

function getPaymentStatus(order) {
  return String(
    order?.paymentStatus || "pending"
  ).toLowerCase();
}

function getPaymentLabel(status) {
  const labels = {
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
    partially_refunded: "Partially refunded",
  };

  return (
    labels[status] ||
    status.replace(/_/g, " ")
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pending",
    processing: "Processing",
    confirmed: "Confirmed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    failed: "Payment failed",
  };

  return (
    labels[status] ||
    status.replace(/_/g, " ")
  );
}

function getStatusClass(status) {
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

function getOrderItemCount(order) {
  const items = Array.isArray(order?.items)
    ? order.items
    : [];

  return items.reduce(
    (sum, item) =>
      sum + Number(item?.quantity || 1),
    0
  );
}

function OrderSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="border border-[#1d1916]/10 bg-white p-6"
        >
          <div className="flex gap-5">
            <div className="h-24 w-20 bg-[#e6dfd4]" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-24 bg-[#e6dfd4]" />
              <div className="h-5 w-48 bg-[#e6dfd4]" />
              <div className="h-3 w-32 bg-[#e6dfd4]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("/orders");

      const nextOrders =
        response?.data?.orders ||
        response?.orders ||
        [];

      setOrders(
        Array.isArray(nextOrders)
          ? nextOrders
          : []
      );
    } catch (err) {
      setOrders([]);
      setError(
        err?.message ||
          "Could not load your orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const totalSpent = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          Number(
            order?.totalAmount || 0
          ),
        0
      ),
    [orders]
  );

  if (!getAuthToken()) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse / Orders
          </p>

          <h1
            className="mt-4 text-5xl tracking-[-0.035em] text-[#1d1916] sm:text-6xl"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Your orders live here.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
            Sign in to view purchases, payment status and delivery progress.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/shop"
              className="border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
            >
              Explore collection
            </Link>

            <Link
              to="/login"
              className="border border-[#1d1916]/20 bg-white px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d1916]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-9 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="animate-pulse">
            <div className="h-3 w-24 bg-[#e6dfd4]" />
            <div className="mt-4 h-14 w-64 bg-[#e6dfd4]" />
            <div className="mt-10">
              <OrderSkeleton />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-7 border-b border-[#1d1916]/10 pb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              Styleverse / Purchase history
            </p>

            <h1
              className="mt-3 text-5xl leading-none tracking-[-0.04em] sm:text-6xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              Your orders.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#70685f]">
              Every Styleverse purchase, together in one place.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="hidden border border-[#1d1916]/15 bg-white px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#4d463f] transition hover:border-[#1d1916] disabled:opacity-40 sm:inline-flex"
            >
              Refresh
            </button>

            <div className="text-left sm:text-right">
              <p className="text-3xl font-semibold">
                {orders.length}
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#938a80]">
                {orders.length === 1
                  ? "Order"
                  : "Orders"}
              </p>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-3xl font-semibold">
                {money(totalSpent)}
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#938a80]">
                Order value
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={loadOrders}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="py-28 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              No purchases yet
            </p>

            <h2
              className="mx-auto mt-4 max-w-2xl text-5xl leading-none tracking-[-0.035em] sm:text-6xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              Your next favourite piece is waiting.
            </h2>

            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
              Browse the collection and your completed purchases will appear here.
            </p>

            <Link
              to="/shop"
              className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
            >
              Shop the collection
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {orders.map((order) => {
              const orderId =
                order?._id ||
                order?.id ||
                "";

              const status = getStatus(order);
              const paymentStatus =
                getPaymentStatus(order);

              const itemCount =
                getOrderItemCount(order);

              const date =
                order?.placedAt ||
                order?.createdAt;

              return (
                <article
                  key={orderId}
                  className="border border-[#1d1916]/10 bg-white transition hover:border-[#1d1916]/25"
                >
                  <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-7">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                          Order
                        </span>

                        <span className="text-[10px] font-semibold tracking-[0.06em] text-[#70685f]">
                          #{String(orderId).slice(-8)}
                        </span>

                        <span
                          className={[
                            "border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em]",
                            getStatusClass(
                              status
                            ),
                          ].join(" ")}
                        >
                          {getStatusLabel(
                            status
                          )}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-2xl font-semibold tracking-[-0.02em]">
                            {money(
                              order?.totalAmount
                            )}
                          </p>

                          <p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[#91887d]">
                            {formatDate(date)}
                            <span className="px-2">
                              ·
                            </span>
                            {itemCount}{" "}
                            {itemCount === 1
                              ? "item"
                              : "items"}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8c8379]">
                            Payment
                          </p>

                          <p className="mt-1 text-xs font-semibold capitalize">
                            {getPaymentLabel(
                              paymentStatus
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end sm:items-center">
                      <Link
                        to={`/orders/${orderId}`}
                        className="flex w-full items-center justify-center border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#f7f3ec] transition hover:bg-[#302a26] sm:w-auto"
                      >
                        View order →
                      </Link>
                    </div>
                  </div>

                  {Array.isArray(order?.items) &&
                    order.items.length > 0 && (
                      <div className="grid gap-2 border-t border-[#1d1916]/10 bg-[#fbf8f3] px-5 py-4 sm:grid-cols-2 sm:px-7 lg:grid-cols-3">
                        {order.items
                          .slice(0, 3)
                          .map((item, index) => {
                            const itemName =
                              item?.productName ||
                              item?.name ||
                              item?.product?.name ||
                              item?.title ||
                              "Order item";

                            return (
                              <div
                                key={
                                  item?._id ||
                                  `${orderId}-${index}`
                                }
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="min-w-0 truncate text-[#6c645c]">
                                  {itemName}
                                </span>

                                <span className="shrink-0 text-[#3c3530]">
                                  ×{" "}
                                  {Number(
                                    item?.quantity ||
                                      1
                                  )}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}