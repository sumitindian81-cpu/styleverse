import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiJson, apiRequest, getAuthToken } from "../utils/api";

function getImageUrl(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const image = images.find((image) => image?.isMain === true) || images[0];

  if (!image) return "";

  return typeof image === "string"
    ? image
    : image.url || image.secure_url || "";
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getItemProduct(item) {
  return item?.productId && typeof item.productId === "object"
    ? item.productId
    : null;
}

function getItemDesign(item) {
  return item?.customDesignId &&
    typeof item.customDesignId === "object"
    ? item.customDesignId
    : null;
}

function getItemName(item) {
  const product = getItemProduct(item);
  const design = getItemDesign(item);

  return (
    product?.name ||
    design?.title ||
    item?.name ||
    "Styleverse item"
  );
}

function getItemImage(item) {
  const product = getItemProduct(item);
  const design = getItemDesign(item);

  if (product) {
    return getImageUrl(product);
  }

  return (
    design?.previewImageUrl ||
    getImageUrl(design?.baseProductId)
  );
}

function getItemPrice(item) {
  const product = getItemProduct(item);
  const design = getItemDesign(item);

  return Number(
    product?.price ??
      design?.price ??
      item?.price ??
      0
  );
}

function getAvailableQuantity(item) {
  const product = getItemProduct(item);

  return Math.max(
    Number(product?.stock) || 0,
    0
  );
}

function CartSkeleton() {
  return (
    <section className="min-h-screen bg-[#f7f3ec] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="h-3 w-28 bg-[#e6dfd4]" />
        <div className="mt-5 h-12 w-64 bg-[#e6dfd4]" />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_390px]">
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex gap-5 border border-[#1d1916]/10 bg-white p-5"
              >
                <div className="h-36 w-28 bg-[#e6dfd4]" />
                <div className="flex-1 space-y-4">
                  <div className="h-3 w-24 bg-[#e6dfd4]" />
                  <div className="h-5 w-1/2 bg-[#e6dfd4]" />
                  <div className="h-4 w-1/3 bg-[#e6dfd4]" />
                  <div className="h-10 w-32 bg-[#e6dfd4]" />
                </div>
              </div>
            ))}
          </div>

          <div className="h-96 bg-white" />
        </div>
      </div>
    </section>
  );
}

export default function Cart() {
  const navigate = useNavigate();

  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [busyItem, setBusyItem] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [couponState, setCouponState] = useState({
    code: "",
    discountAmount: 0,
    totalAfterDiscount: null,
    couponId: "",
  });

  const [checkoutPreview, setCheckoutPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const items = Array.isArray(cart?.items)
    ? cart.items
    : [];

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("/cart");

      setCart(
        response?.data?.cart || {
          items: [],
        }
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not load your shopping bag."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCheckoutPreview =
    useCallback(async () => {
      if (!getAuthToken()) return;

      setPreviewLoading(true);

      try {
        const response = await apiRequest(
          "/cart/checkout"
        );

        setCheckoutPreview(
          response?.data || null
        );
      } catch {
        setCheckoutPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    try {
      const savedCoupon = localStorage.getItem(
        "styleverse_applied_coupon"
      );

      if (!savedCoupon) return;

      const parsed = JSON.parse(savedCoupon);

      if (!parsed?.code) return;

      setCouponState({
        code: String(parsed.code),
        discountAmount: Number(parsed.discountAmount) || 0,
        totalAfterDiscount:
          parsed.totalAfterDiscount === null ||
          parsed.totalAfterDiscount === undefined
            ? null
            : Number(parsed.totalAfterDiscount),
        couponId: String(parsed.couponId || ""),
      });
    } catch {
      localStorage.removeItem(
        "styleverse_applied_coupon"
      );
    }
  }, []);

  useEffect(() => {
    if (!loading && items.length > 0) {
      loadCheckoutPreview();
    }
  }, [
    loading,
    items.length,
    loadCheckoutPreview,
  ]);

  async function updateQuantity(itemId, quantity) {
    if (!itemId || quantity < 1) return;

    setBusyItem(itemId);
    setError("");
    setMessage("");

    try {
      const response = await apiJson(
        `/cart/${itemId}`,
        {
          method: "PATCH",
          data: { quantity },
        }
      );

      setCart(
        response?.data?.cart || {
          items: [],
        }
      );

      await loadCheckoutPreview();
    } catch (err) {
      setError(
        err?.message ||
          "Could not update this item."
      );
    } finally {
      setBusyItem("");
    }
  }

  async function removeItem(itemId) {
    if (!itemId) return;

    setBusyItem(itemId);
    setError("");
    setMessage("");

    try {
      const response = await apiRequest(
        `/cart/${itemId}`,
        { method: "DELETE" }
      );

      setCart(
        response?.data?.cart || {
          items: [],
        }
      );

      setMessage("Item removed from your bag.");
      await loadCheckoutPreview();
    } catch (err) {
      setError(
        err?.message ||
          "Could not remove this item."
      );
    } finally {
      setBusyItem("");
    }
  }

  async function applyCoupon() {
    const code = couponCode.trim();

    if (!code) {
      setError("Enter a coupon code first.");
      return;
    }

    setCouponLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiJson(
        "/coupons/apply",
        {
          method: "POST",
          data: { code },
        }
      );

      const root =
        response?.data ??
        response ??
        {};

      const discountAmount = Number(
        root.discountAmount ??
          root.discount ??
          0
      );

      const totalAfterDiscountValue =
        root.totalAfterDiscount ??
        root.finalTotal ??
        null;

      const appliedCode =
        root.code ||
        root.coupon?.code ||
        code;

      const couponId =
        root.couponId ||
        root.coupon?._id ||
        root.coupon?.id ||
        "";

      setCouponState({
        code: appliedCode,
        discountAmount,
        totalAfterDiscount:
          totalAfterDiscountValue === null
            ? null
            : Number(totalAfterDiscountValue),
        couponId,
      });

      localStorage.setItem(
        "styleverse_applied_coupon",
        JSON.stringify({
          code: appliedCode,
          discountAmount,
          totalAfterDiscount:
            totalAfterDiscountValue === null
              ? null
              : Number(totalAfterDiscountValue),
          couponId,
        })
      );

      setCouponCode("");
      setMessage(
        `Coupon ${appliedCode} applied successfully.`
      );
    } catch (err) {
      setCouponState({
        code: "",
        discountAmount: 0,
        totalAfterDiscount: null,
        couponId: "",
      });

      setError(
        err?.message ||
          "This coupon could not be applied."
      );
    } finally {
      setCouponLoading(false);
    }
  }

  const fallbackSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          getItemPrice(item) *
            Number(item?.quantity || 0),
        0
      ),
    [items]
  );

  const subtotal = Number(
    checkoutPreview?.subtotal ??
      fallbackSubtotal
  );

  const serverDiscount = Number(
    checkoutPreview?.discount ??
      couponState.discountAmount ??
      0
  );

  const discount = Math.max(
    serverDiscount,
    couponState.discountAmount
  );

  const shippingFee = Number(
    checkoutPreview?.shippingFee ?? 0
  );

  const estimatedDelivery =
    checkoutPreview?.estimatedDelivery ||
    checkoutPreview?.deliveryEstimate ||
    checkoutPreview?.estimatedDeliveryDate ||
    "Calculated at checkout";

  const serverTotal = Number(
    checkoutPreview?.totalAmount ?? NaN
  );

  const calculatedTotal = Math.max(
    subtotal - discount + shippingFee,
    0
  );

  const total =
    couponState.totalAfterDiscount !== null
      ? Number(
          couponState.totalAfterDiscount
        ) + shippingFee
      : Number.isFinite(serverTotal)
        ? serverTotal
        : calculatedTotal;

  const totalItemCount = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item?.quantity || 0),
        0
      ),
    [items]
  );

  if (loading) {
    return <CartSkeleton />;
  }

  if (!getAuthToken()) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-14 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse
          </p>

          <h1
            className="mt-3 text-5xl tracking-[-0.025em] text-[#1d1916]"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Your bag awaits.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
            Sign in to view your saved cart items and continue your purchase.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
            >
              Continue shopping
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center justify-center border border-[#1d1916]/20 bg-white px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1916]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-[#1d1916]/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              Styleverse / Your selection
            </p>

            <h1
              className="mt-3 text-5xl leading-none tracking-[-0.04em] sm:text-6xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              Your shopping bag.
            </h1>

            <p className="mt-4 text-sm text-[#70685f]">
              {totalItemCount}{" "}
              {totalItemCount === 1
                ? "item"
                : "items"}{" "}
              selected for checkout.
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex w-fit items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#625b53] transition hover:text-[#1d1916]"
          >
            Continue shopping
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {(error || message) && (
          <div
            className={[
              "mt-6 border px-4 py-3 text-sm",
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {error || message}
          </div>
        )}

        {items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              Nothing here yet
            </p>

            <h2
              className="mt-3 text-5xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              Start with one good piece.
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#70685f]">
              Browse the latest Styleverse edit and add something you love to your bag.
            </p>

            <Link
              to="/shop"
              className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
            >
              Explore the collection
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
            <div className="min-w-0">
              <div className="mb-4 grid grid-cols-[1fr_auto] border-b border-[#1d1916]/10 pb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8f877d]">
                <span>Items</span>
                <span>Amount</span>
              </div>

              <div className="divide-y divide-[#1d1916]/10">
                {items.map((item) => {
                  const itemId = item?._id;
                  const product = getItemProduct(item);
                  const design = getItemDesign(item);

                  const name = getItemName(item);
                  const image = getItemImage(item);
                  const price = getItemPrice(item);
                  const qty = Number(
                    item?.quantity || 1
                  );

                  const stock = getAvailableQuantity(
                    item
                  );

                  const busy =
                    busyItem === itemId;

                  const isDesign =
                    Boolean(design) && !product;

                  return (
                    <article
                      key={
                        itemId ||
                        `${name}-${price}`
                      }
                      className="py-6"
                    >
                      <div className="grid gap-5 sm:grid-cols-[150px_1fr_auto] sm:items-start">
                        <Link
                          to={
                            product?._id
                              ? `/product/${product._id}`
                              : "#"
                          }
                          className="block aspect-[4/5] overflow-hidden bg-[#eee7dd]"
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={name}
                              className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-5 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-[#90877c]">
                              Image unavailable
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                              {isDesign
                                ? "Custom design"
                                : product?.brand ||
                                  "Styleverse"}
                            </p>

                            {item?.outfitId && (
                              <span className="border border-[#1d1916]/10 bg-white px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-[#837a70]">
                                Outfit
                              </span>
                            )}
                          </div>

                          <Link
                            to={
                              product?._id
                                ? `/product/${product._id}`
                                : "#"
                            }
                            className="mt-2 block max-w-xl text-2xl leading-tight tracking-[-0.02em] text-[#1d1916] hover:underline"
                            style={{
                              fontFamily:
                                "Georgia, 'Times New Roman', serif",
                            }}
                          >
                            {name}
                          </Link>

                          {(item?.selectedSize ||
                            item?.selectedColor) && (
                            <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[#847b71]">
                              {item.selectedSize
                                ? `Size ${item.selectedSize}`
                                : ""}
                              {item.selectedSize &&
                              item.selectedColor
                                ? "  ·  "
                                : ""}
                              {item.selectedColor
                                ? `Colour ${item.selectedColor}`
                                : ""}
                            </p>
                          )}

                          {design?.attributes && (
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.12em] text-[#847b71]">
                              {Object.entries(
                                design.attributes
                              )
                                .filter(
                                  ([, value]) =>
                                    value !== undefined &&
                                    value !== null &&
                                    value !== ""
                                )
                                .slice(0, 4)
                                .map(
                                  ([key, value]) => (
                                    <span key={key}>
                                      {key}: {String(value)}
                                    </span>
                                  )
                                )}
                            </div>
                          )}

                          <div className="mt-6 flex flex-wrap items-center gap-5">
                            <div className="inline-flex items-center border border-[#1d1916]/15 bg-white">
                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  qty <= 1
                                }
                                onClick={() =>
                                  updateQuantity(
                                    itemId,
                                    qty - 1
                                  )
                                }
                                className="grid h-10 w-10 place-items-center text-lg disabled:opacity-30"
                                aria-label={`Decrease quantity of ${name}`}
                              >
                                −
                              </button>

                              <span className="w-10 text-center text-xs font-semibold">
                                {busy
                                  ? "…"
                                  : qty}
                              </span>

                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  (stock > 0 &&
                                    qty >= stock)
                                }
                                onClick={() =>
                                  updateQuantity(
                                    itemId,
                                    qty + 1
                                  )
                                }
                                className="grid h-10 w-10 place-items-center text-lg disabled:opacity-30"
                                aria-label={`Increase quantity of ${name}`}
                              >
                                +
                              </button>
                            </div>

                            {stock > 0 && (
                              <span className="text-[9px] uppercase tracking-[0.15em] text-[#8f877d]">
                                {stock} available
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                removeItem(itemId)
                              }
                              disabled={busy}
                              className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#857c72] transition hover:text-[#1d1916] disabled:opacity-30"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-base font-semibold">
                            {money(price * qty)}
                          </p>
                          {qty > 1 && (
                            <p className="mt-1 text-[10px] text-[#948b81]">
                              {money(price)} each
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="h-fit lg:sticky lg:top-28">
              <div className="border border-[#1d1916]/10 bg-white p-6 sm:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                  Summary
                </p>

                <h2
                  className="mt-3 text-4xl"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  Finish your order.
                </h2>

                <div className="mt-8 border-y border-[#1d1916]/10 py-5">
                  <div className="flex justify-between gap-4 text-sm text-[#686057]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#1d1916]">
                      {money(subtotal)}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between gap-4 text-sm text-[#686057]">
                    <span>Shipping</span>
                    <span className="font-semibold text-emerald-700">
                      {shippingFee > 0
                        ? money(shippingFee)
                        : "Free"}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between gap-4 text-sm text-[#686057]">
                    <span>Estimated delivery</span>
                    <span className="max-w-[175px] text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[#575047]">
                      {String(estimatedDelivery)}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="mt-4 flex justify-between gap-4 text-sm text-[#686057]">
                      <span>
                        Discount
                        {couponState.code
                          ? ` · ${couponState.code}`
                          : ""}
                      </span>
                      <span className="font-semibold text-emerald-700">
                        −{money(discount)}
                      </span>
                    </div>
                  )}

                  <div className="mt-5 flex justify-between gap-4 border-t border-[#1d1916]/10 pt-5">
                    <span className="text-sm font-semibold">
                      Total
                    </span>

                    <span className="text-2xl font-semibold">
                      {previewLoading
                        ? "…"
                        : money(total)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="coupon"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  >
                    Have a code?
                  </label>

                  <div className="mt-2 flex">
                    <input
                      id="coupon"
                      value={couponCode}
                      onChange={(event) =>
                        setCouponCode(
                          event.target.value
                        )
                      }
                      placeholder="Enter coupon code"
                      className="min-w-0 flex-1 border border-[#1d1916]/15 bg-[#fbf8f3] px-3 py-3 text-xs uppercase tracking-[0.1em] outline-none placeholder:normal-case placeholder:tracking-normal focus:border-[#1d1916]"
                    />

                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      className="border border-[#1d1916] bg-[#1d1916] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#f7f3ec] disabled:opacity-50"
                    >
                      {couponLoading
                        ? "…"
                        : "Apply"}
                    </button>
                  </div>

                  {couponState.code && (
                    <div className="mt-3 flex items-center justify-between gap-3 bg-[#f1eadf] px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-[#685e54]">
                      <span>
                        {couponState.code} applied
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCouponState({
                            code: "",
                            discountAmount: 0,
                            totalAfterDiscount:
                              null,
                            couponId: "",
                          });
                          localStorage.removeItem(
                            "styleverse_applied_coupon"
                          );
                        }}
                        className="font-semibold hover:text-[#1d1916]"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  className="mt-7 w-full bg-[#1d1916] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] transition hover:bg-[#302a26]"
                >
                  Proceed to checkout →
                </button>

                <div className="mt-5 grid grid-cols-3 border-t border-[#1d1916]/10 pt-5 text-center">
                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.14em]">
                      Secure
                    </p>
                    <p className="mt-1 text-[8px] text-[#91887d]">
                      Payment
                    </p>
                  </div>

                  <div className="border-x border-[#1d1916]/10">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.14em]">
                      Easy
                    </p>
                    <p className="mt-1 text-[8px] text-[#91887d]">
                      Returns
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.14em]">
                      Fast
                    </p>
                    <p className="mt-1 text-[8px] text-[#91887d]">
                      Delivery
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}