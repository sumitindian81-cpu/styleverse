import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
    month: "long",
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

function statusLabel(status) {
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return (
    labels[status] ||
    status.replace(/_/g, " ")
  );
}

function itemName(item) {
  return (
    item?.productName ||
    item?.name ||
    item?.product?.name ||
    item?.title ||
    item?.productId?.name ||
    "Styleverse item"
  );
}

function itemPrice(item) {
  return Number(
    item?.price ??
      item?.unitPrice ??
      item?.product?.price ??
      item?.productId?.price ??
      0
  );
}

function itemImage(item) {
  const product =
    item?.product ||
    (item?.productId &&
    typeof item.productId === "object"
      ? item.productId
      : null);

  const images = Array.isArray(product?.images)
    ? product.images
    : [];

  const image =
    images.find(
      (entry) => entry?.isMain === true
    ) || images[0];

  if (image) {
    return typeof image === "string"
      ? image
      : image.url || image.secure_url || "";
  }

  return item?.imageUrl || "";
}

function getHistory(order) {
  const history = Array.isArray(
    order?.statusHistory
  )
    ? order.statusHistory
    : [];

  if (history.length > 0) {
    return history;
  }

  const status = getStatus(order);

  const orderStages = [
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];

  const currentIndex =
    orderStages.indexOf(status);

  if (status === "cancelled") {
    return [
      {
        status: "cancelled",
        note: "Order was cancelled.",
        changedAt:
          order?.cancelledAt ||
          order?.updatedAt ||
          order?.createdAt,
      },
    ];
  }

  const safeCurrentIndex =
    currentIndex < 0 ? 0 : currentIndex;

  return orderStages
    .map((stage, index) => ({
      status: stage,
      changedAt:
        index <= safeCurrentIndex
          ? order?.updatedAt ||
            order?.placedAt ||
            order?.createdAt
          : null,
      note:
        index <= safeCurrentIndex
          ? index === 0
            ? "Order confirmed."
            : stage === "processing"
            ? "Order is being prepared."
            : stage === "shipped"
            ? "Order has been shipped."
            : "Order delivered."
          : "",
    }))
    .filter(
      (entry) =>
        entry.changedAt ||
        entry.status === status
    );
}

function getStatusClass(status) {
  if (status === "delivered") {
    return "bg-emerald-700";
  }

  if (status === "cancelled") {
    return "bg-red-700";
  }

  if (status === "shipped") {
    return "bg-blue-700";
  }

  return "bg-[#1d1916]";
}

function LoadingState() {
  return (
    <section className="min-h-screen bg-[#f7f3ec] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="h-3 w-24 bg-[#e6dfd4]" />
        <div className="mt-5 h-12 w-72 bg-[#e6dfd4]" />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_390px]">
          <div className="h-[650px] bg-white" />
          <div className="h-[500px] bg-white" />
        </div>
      </div>
    </section>
  );
}

export default function OrderDetail() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest(
        `/orders/${id}`
      );

      const nextOrder =
        response?.data?.order ||
        response?.order ||
        null;

      if (!nextOrder) {
        throw new Error(
          "Order could not be found."
        );
      }

      setOrder(nextOrder);
    } catch (err) {
      setOrder(null);
      setError(
        err?.message ||
          "Could not load this order."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const items = useMemo(
    () =>
      Array.isArray(order?.items)
        ? order.items
        : [],
    [order]
  );

  const currentStatus = getStatus(order);
  const paymentStatus =
    getPaymentStatus(order);

  const history = useMemo(
    () => getHistory(order),
    [order]
  );

  if (loading) {
    return <LoadingState />;
  }

  if (!getAuthToken()) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse / Order
          </p>

          <h1
            className="mt-4 text-5xl tracking-[-0.035em]"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Sign in to view this order.
          </h1>

          <Link
            to="/login"
            className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
          >
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse / Order
          </p>

          <h1
            className="mt-4 text-5xl tracking-[-0.035em]"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Order unavailable.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
            {error ||
              "The requested order could not be found."}
          </p>

          <Link
            to="/orders"
            className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
          >
            Back to orders
          </Link>
        </div>
      </section>
    );
  }

  const orderId =
    order?._id ||
    order?.id ||
    id;

  const address =
    order?.shippingAddress ||
    order?.address ||
    {};

  const paymentMethod =
    order?.paymentMethod ||
    "—";

  return (
    <section className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-[#1d1916]/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/orders"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#726960] hover:text-[#1d1916]"
            >
              ← Back to orders
            </Link>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              Styleverse / Order detail
            </p>

            <h1
              className="mt-3 text-5xl leading-none tracking-[-0.04em] sm:text-6xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              {currentStatus === "delivered"
                ? "Order delivered."
                : currentStatus === "shipped"
                ? "Order on the way."
                : currentStatus === "cancelled"
                ? "Order cancelled."
                : "Order confirmed."}
            </h1>

            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#847a70]">
              #{String(orderId)}
              <span className="px-2">·</span>
              {formatDate(
                order?.placedAt ||
                  order?.createdAt
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="border border-[#cdb898]/40 bg-[#f2e8da] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#765c41]">
              {statusLabel(currentStatus)}
            </span>

            <p className="mt-4 text-3xl font-semibold">
              {money(
                order?.totalAmount
              )}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
          <div className="space-y-8">
            {/* Tracking */}
            <section className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-[#1d1916]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                    Delivery
                  </p>

                  <h2
                    className="mt-2 text-4xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Track your order.
                  </h2>
                </div>

                <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                  {order?.trackingNumber ? (
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#8f867b]">
                      Tracking {order.trackingNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#8f867b]">
                      Tracking details will appear when available
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={loadOrder}
                    disabled={loading}
                    className="border border-[#1d1916]/15 bg-white px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#4d463f] transition hover:border-[#1d1916] disabled:opacity-40"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-8">
                {history.map(
                  (entry, index) => {
                    const status =
                      String(
                        entry?.status ||
                          ""
                      ).toLowerCase();

                    const done =
                      Boolean(
                        entry?.changedAt
                      ) ||
                      status ===
                        currentStatus;

                    const isLast =
                      index ===
                      history.length - 1;

                    return (
                      <div
                        key={`${status}-${index}`}
                        className="relative flex gap-4"
                      >
                        <div className="flex flex-col items-center">
                          <span
                            className={[
                              "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white",
                              done
                                ? getStatusClass(
                                    status
                                  )
                                : "bg-[#d8d0c5] text-[#7d7369]",
                            ].join(
                              " "
                            )}
                          >
                            {done
                              ? "✓"
                              : index + 1}
                          </span>

                          {!isLast && (
                            <span
                              className={[
                                "mt-1 min-h-12 w-px",
                                done
                                  ? "bg-[#1d1916]/25"
                                  : "bg-[#ddd5ca]",
                              ].join(
                                " "
                              )}
                            />
                          )}
                        </div>

                        <div className="pb-8">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                            {statusLabel(
                              status
                            )}
                          </p>

                          {entry?.changedAt && (
                            <p className="mt-1 text-[10px] text-[#958b80]">
                              {formatDate(
                                entry.changedAt
                              )}
                            </p>
                          )}

                          {entry?.note && (
                            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6c645b]">
                              {entry.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {!order?.trackingNumber && (
                <div className="border-t border-[#1d1916]/10 pt-5 text-[10px] leading-5 text-[#81776c]">
                  Courier tracking information is shown here when the order receives a tracking number.
                </div>
              )}
            </section>

            {/* Items */}
            <section className="border border-[#1d1916]/10 bg-white">
              <div className="border-b border-[#1d1916]/10 px-6 py-5 sm:px-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                  Order contents
                </p>

                <h2
                  className="mt-2 text-4xl"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  Your pieces.
                </h2>
              </div>

              <div className="divide-y divide-[#1d1916]/10">
                {items.length > 0 ? (
                  items.map((item, index) => {
                    const image =
                      itemImage(item);

                    const name =
                      itemName(item);

                    const qty =
                      Number(
                        item?.quantity || 1
                      );

                    const price =
                      itemPrice(item);

                    return (
                      <div
                        key={
                          item?._id ||
                          `item-${index}`
                        }
                        className="flex gap-5 px-6 py-6 sm:px-8"
                      >
                        <div className="h-32 w-24 shrink-0 overflow-hidden bg-[#eee8df]">
                          {image ? (
                            <img
                              src={image}
                              alt={name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-center text-[8px] uppercase tracking-[0.14em] text-[#938a80]">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                            Styleverse
                          </p>

                          <h3
                            className="mt-1 text-2xl leading-tight"
                            style={{
                              fontFamily:
                                "Georgia, 'Times New Roman', serif",
                            }}
                          >
                            {name}
                          </h3>

                          <div className="mt-3 flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.12em] text-[#8c8378]">
                            <span>
                              Qty {qty}
                            </span>

                            {item?.selectedSize && (
                              <span>
                                Size{" "}
                                {
                                  item.selectedSize
                                }
                              </span>
                            )}

                            {item?.selectedColor && (
                              <span>
                                Colour{" "}
                                {
                                  item.selectedColor
                                }
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {money(
                              price * qty
                            )}
                          </p>

                          {qty > 1 && (
                            <p className="mt-1 text-[9px] text-[#968d82]">
                              {money(
                                price
                              )}{" "}
                              each
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-sm text-[#776e65]">
                    No item details were returned for this order.
                  </div>
                )}
              </div>
            </section>

            {/* Address */}
            <section className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                Shipping
              </p>

              <h2
                className="mt-2 text-4xl"
                style={{
                  fontFamily:
                    "Georgia, 'Times New Roman', serif",
                }}
              >
                Delivery address.
              </h2>

              <div className="mt-6 border-t border-[#1d1916]/10 pt-5 text-sm leading-7 text-[#625a52]">
                <p className="font-semibold text-[#1d1916]">
                  {address?.fullName ||
                    address?.name ||
                    "Recipient"}
                </p>

                {address?.phone && (
                  <p>{address.phone}</p>
                )}

                <p>
                  {[
                    address?.addressLine1 ||
                      address?.street,
                    address?.addressLine2,
                    address?.city,
                    address?.state,
                    address?.postalCode ||
                      address?.zip,
                    address?.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="h-fit lg:sticky lg:top-28">
            <div className="border border-[#1d1916]/10 bg-white p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                Payment & totals
              </p>

              <h2
                className="mt-3 text-4xl"
                style={{
                  fontFamily:
                    "Georgia, 'Times New Roman', serif",
                }}
              >
                Final details.
              </h2>

              <div className="mt-7 space-y-4 border-y border-[#1d1916]/10 py-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#71685f]">
                    Subtotal
                  </span>
                  <span className="font-semibold">
                    {money(
                      order?.subtotal ??
                        order?.totalAmount
                    )}
                  </span>
                </div>

                {Number(
                  order?.discount || 0
                ) > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#71685f]">
                      Discount
                    </span>
                    <span className="font-semibold text-emerald-700">
                      −
                      {money(
                        order.discount
                      )}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4">
                  <span className="text-[#71685f]">
                    Shipping
                  </span>
                  <span className="font-semibold">
                    {Number(
                      order?.shippingFee || 0
                    ) === 0
                      ? "Free"
                      : money(
                          order.shippingFee
                        )}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-t border-[#1d1916]/10 pt-5">
                  <span className="font-semibold">
                    Total
                  </span>
                  <span className="text-2xl font-semibold">
                    {money(
                      order?.totalAmount
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#91877b]">
                  Payment method
                </p>

                <p className="mt-2 text-sm font-semibold capitalize">
                  {paymentMethod}
                </p>

                <p className="mt-1 text-xs capitalize text-[#756c63]">
                  Payment status:{" "}
                  {paymentStatus.replace(/_/g, " ")}
                </p>

                {(order?.paymentId ||
                  order?.razorpayPaymentId ||
                  order?.transactionId) && (
                  <p className="mt-2 break-all text-[10px] leading-5 text-[#93887d]">
                    Payment reference:{" "}
                    {order?.paymentId ||
                      order?.razorpayPaymentId ||
                      order?.transactionId}
                  </p>
                )}
              </div>

              {order?.couponCode && (
                <div className="mt-5 border border-[#1d1916]/10 bg-[#f3eadf] p-4 text-xs text-[#6f6357]">
                  Coupon applied:{" "}
                  <span className="font-semibold">
                    {order.couponCode}
                  </span>
                </div>
              )}

              <Link
                to="/shop"
                className="mt-7 block border border-[#1d1916] bg-[#1d1916] px-5 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] transition hover:bg-[#302a26]"
              >
                Continue shopping →
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 border border-[#1d1916]/10 bg-white text-center">
              <div className="px-2 py-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.14em]">
                  Secure
                </p>
                <p className="mt-1 text-[8px] text-[#91887d]">
                  Payment
                </p>
              </div>

              <div className="border-x border-[#1d1916]/10 px-2 py-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.14em]">
                  Easy
                </p>
                <p className="mt-1 text-[8px] text-[#91887d]">
                  Support
                </p>
              </div>

              <div className="px-2 py-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.14em]">
                  Track
                </p>
                <p className="mt-1 text-[8px] text-[#91887d]">
                  Order
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}