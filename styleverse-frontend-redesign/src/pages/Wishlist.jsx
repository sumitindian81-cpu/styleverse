import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson, apiRequest, getAuthToken } from "../utils/api";

function getProductImage(product) {
  const images = Array.isArray(product?.images)
    ? product.images
    : [];

  const image =
    images.find((item) => item?.isMain === true) ||
    images[0];

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

function normalizeWishlist(response) {
  const root = response?.data ?? response ?? {};

  const candidates = [
    root.wishlist?.products,
    root.wishlist?.productIds,
    root.wishlist?.items,
    root.products,
    root.productIds,
    root.items,
    root,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function normalizeProduct(item) {
  if (!item) return null;

  if (
    item.productId &&
    typeof item.productId === "object"
  ) {
    return item.productId;
  }

  return typeof item === "object"
    ? item
    : null;
}

function getId(product) {
  return (
    product?._id ||
    product?.id ||
    product?.productId?._id ||
    product?.productId ||
    ""
  );
}

function getSizeLabel(item) {
  return typeof item === "string"
    ? item
    : item?.size || item?.name || "";
}

function isSizeAvailable(item) {
  if (typeof item === "string") return true;

  const stockValue = item?.stock;
  return stockValue === undefined
    ? true
    : Number(stockValue) > 0;
}

function getColorName(item, index = 0) {
  return typeof item === "string"
    ? item
    : item?.name || item?.label || `Colour ${index + 1}`;
}

function getColorCode(item) {
  return typeof item === "object"
    ? item?.code || item?.hex || ""
    : "";
}

function getFirstAvailableSize(product) {
  const sizes = Array.isArray(product?.sizes)
    ? product.sizes
    : [];

  const available = sizes.find(isSizeAvailable);

  return getSizeLabel(available);
}

function getFirstColor(product) {
  const colors = Array.isArray(product?.colors)
    ? product.colors
    : [];

  return getColorName(colors[0], 0);
}

function availableStockForWishlist(product) {
  const rootStock = Number(product?.stock);

  if (Number.isFinite(rootStock) && rootStock > 0) {
    return rootStock;
  }

  const sizes = Array.isArray(product?.sizes)
    ? product.sizes
    : [];

  if (sizes.length === 0) return 0;

  const variantStocks = sizes
    .filter((item) => typeof item !== "string")
    .map((item) => Number(item?.stock))
    .filter((stock) => Number.isFinite(stock));

  if (variantStocks.length === 0) {
    return sizes.some(isSizeAvailable) ? 1 : 0;
  }

  return Math.max(...variantStocks, 0);
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden border border-[#1d1916]/10 bg-white">
      <div className="aspect-[4/5] bg-[#e6dfd4]" />

      <div className="space-y-3 p-4">
        <div className="h-3 w-20 bg-[#e6dfd4]" />
        <div className="h-4 w-3/4 bg-[#e6dfd4]" />
        <div className="h-4 w-1/3 bg-[#e6dfd4]" />
      </div>
    </div>
  );
}

export default function Wishlist() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedSizes, setSelectedSizes] =
    useState({});
  const [selectedColors, setSelectedColors] =
    useState({});

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("/wishlist");

      const rawItems = normalizeWishlist(response);

      const normalized = rawItems
        .map(normalizeProduct)
        .filter(Boolean);

      setProducts(normalized);

      const nextSizes = {};
      const nextColors = {};

      normalized.forEach((product) => {
        const id = getId(product);

        if (!id) return;

        nextSizes[id] =
          getFirstAvailableSize(product);

        nextColors[id] =
          getFirstColor(product);
      });

      setSelectedSizes(nextSizes);
      setSelectedColors(nextColors);
    } catch (err) {
      setProducts([]);
      setError(
        err?.message ||
          "Could not load your wishlist."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  async function removeFromWishlist(productId) {
    if (!productId) return;

    setBusyId(productId);
    setError("");
    setMessage("");

    try {
      await apiRequest(
        `/wishlist/${productId}`,
        { method: "DELETE" }
      );

      setProducts((current) =>
        current.filter(
          (product) =>
            String(getId(product)) !==
            String(productId)
        )
      );

      setMessage(
        "Product removed from your wishlist."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not remove this product."
      );
    } finally {
      setBusyId("");
    }
  }

  async function moveToCart(product) {
    const productId = getId(product);

    if (!productId) return;

    const sizes = Array.isArray(product?.sizes)
      ? product.sizes
      : [];

    const colors = Array.isArray(product?.colors)
      ? product.colors
      : [];

    const selectedSize =
      selectedSizes[productId] ||
      getFirstAvailableSize(product);

    const selectedColor =
      selectedColors[productId] ||
      getFirstColor(product);

    if (sizes.length > 0 && !selectedSize) {
      setError(
        `Please select an available size for "${product.name}".`
      );
      return;
    }

    if (colors.length > 0 && !selectedColor) {
      setError(
        `Please select a color for "${product.name}".`
      );
      return;
    }

    if (availableStockForWishlist(product) <= 0) {
      setError(
        `"${product.name}" is currently out of stock.`
      );
      return;
    }

    setBusyId(productId);
    setError("");
    setMessage("");

    try {
      await apiJson("/cart", {
        method: "POST",
        data: {
          productId,
          quantity: 1,
          selectedSize:
            selectedSize || undefined,
          selectedColor:
            selectedColor || undefined,
        },
      });

      await apiRequest(
        `/wishlist/${productId}`,
        { method: "DELETE" }
      );

      setProducts((current) =>
        current.filter(
          (item) =>
            String(getId(item)) !==
            String(productId)
        )
      );

      setMessage(
        "Product moved to your shopping bag."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not move this product to your cart."
      );
    } finally {
      setBusyId("");
    }
  }

  const totalSaved = useMemo(
    () => products.length,
    [products]
  );

  if (!getAuthToken()) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse / Personal edit
          </p>

          <h1
            className="mt-4 text-5xl leading-none tracking-[-0.035em] text-[#1d1916] sm:text-6xl"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Keep the pieces you love close.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
            Sign in to save products to your wishlist and come back to them whenever you're ready.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
            >
              Explore the collection
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center justify-center border border-[#1d1916]/20 bg-white px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d1916]"
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
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="animate-pulse">
            <div className="h-3 w-32 bg-[#e6dfd4]" />
            <div className="mt-4 h-14 w-64 bg-[#e6dfd4]" />

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map(
                (_, index) => (
                  <SkeletonCard key={index} />
                )
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="border-b border-[#1d1916]/10 pb-9">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
                Styleverse / Saved pieces
              </p>

              <h1
                className="mt-3 text-5xl leading-none tracking-[-0.04em] sm:text-6xl"
                style={{
                  fontFamily:
                    "Georgia, 'Times New Roman', serif",
                }}
              >
                Your wishlist.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[#70685f]">
                A personal edit of pieces you're considering, ready whenever the moment feels right.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-left sm:text-right">
                <p className="text-3xl font-semibold tracking-[-0.03em]">
                  {totalSaved}
                </p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#938a80]">
                  Saved pieces
                </p>
              </div>

              <Link
                to="/shop"
                className="hidden border border-[#1d1916] bg-transparent px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] transition hover:bg-white sm:inline-flex"
              >
                Continue shopping
              </Link>
            </div>
          </div>
        </div>

        {(message || error) && (
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

        {/* Empty */}
        {products.length === 0 ? (
          <div className="py-28 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              Nothing saved yet
            </p>

            <h2
              className="mx-auto mt-4 max-w-2xl text-5xl leading-none tracking-[-0.035em] sm:text-6xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              Save what speaks to you.
            </h2>

            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
              Tap the wishlist action on any product and it will appear here.
            </p>

            <Link
              to="/shop"
              className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
            >
              Discover the collection
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile continue shopping */}
            <div className="mt-6 sm:hidden">
              <Link
                to="/shop"
                className="inline-flex border border-[#1d1916]/20 bg-white px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.17em]"
              >
                Continue shopping →
              </Link>
            </div>

            {/* Product grid */}
            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
              {products.map((product) => {
                const productId = getId(product);
                const image = getProductImage(product);
                const busy = busyId === productId;

                const sizes = Array.isArray(
                  product?.sizes
                )
                  ? product.sizes
                  : [];

                const colors = Array.isArray(
                  product?.colors
                )
                  ? product.colors
                  : [];

                const selectedSize =
                  selectedSizes[productId] || "";

                const selectedColor =
                  selectedColors[productId] || "";

                const availableStock = Math.max(
                  Number(product?.stock) || 0,
                  0
                );

                const discount =
                  Number(
                    product?.discountPercent
                  ) || 0;

                return (
                  <article
                    key={productId}
                    className="group min-w-0"
                  >
                    <div className="relative overflow-hidden border border-[#1d1916]/10 bg-[#eee8df]">
                      <Link
                        to={`/product/${productId}`}
                        className="block aspect-[4/5]"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={
                              product?.name ||
                              "Product"
                            }
                            loading="lazy"
                            className={[
                              "h-full w-full object-cover transition duration-700",
                              "group-hover:scale-[1.035]",
                              availableStock <= 0
                                ? "grayscale-[0.3] opacity-70"
                                : "",
                            ].join(" ")}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-[#92897e]">
                            Image unavailable
                          </div>
                        )}
                      </Link>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          removeFromWishlist(
                            productId
                          )
                        }
                        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-base text-[#1d1916] shadow-sm transition hover:bg-white disabled:opacity-50"
                        aria-label={`Remove ${
                          product?.name ||
                          "product"
                        } from wishlist`}
                      >
                        ♥
                      </button>

                      {discount > 0 && (
                        <span className="absolute left-3 top-3 border border-[#1d1916]/10 bg-[#1d1916] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#f7f3ec]">
                          {discount}% off
                        </span>
                      )}

                      {availableStock <= 0 && (
                        <span className="absolute bottom-3 left-3 border border-[#1d1916]/10 bg-[#f7f3ec]/95 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#6f675e]">
                          Out of stock
                        </span>
                      )}
                    </div>

                    <div className="pt-4">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                        {product?.brand ||
                          "Styleverse"}
                      </p>

                      <Link
                        to={`/product/${productId}`}
                        className="mt-1 block line-clamp-2 text-sm font-medium leading-5 text-[#1d1916] hover:underline"
                      >
                        {product?.name ||
                          "Untitled product"}
                      </Link>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-sm font-semibold">
                          {money(product?.price)}
                        </p>

                        {Number(
                          product?.mrp
                        ) >
                          Number(
                            product?.price
                          ) && (
                          <p className="text-[10px] text-[#aaa095] line-through">
                            {money(
                              product?.mrp
                            )}
                          </p>
                        )}
                      </div>

                      {sizes.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#81786e]">
                            Size
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            {sizes.map(
                              (size) => {
                                const label =
                                  getSizeLabel(size);

                                const inStock =
                                  isSizeAvailable(size);

                                return (
                                  <button
                                    key={
                                      label
                                    }
                                    type="button"
                                    disabled={
                                      !inStock ||
                                      busy
                                    }
                                    onClick={() =>
                                      setSelectedSizes(
                                        (
                                          current
                                        ) => ({
                                          ...current,
                                          [productId]:
                                            label,
                                        })
                                      )
                                    }
                                    className={[
                                      "min-w-9 border px-2 py-1.5 text-[9px] font-semibold transition",
                                      selectedSize ===
                                      label
                                        ? "border-[#1d1916] bg-[#1d1916] text-[#f7f3ec]"
                                        : "border-[#1d1916]/15 bg-white text-[#5c554d]",
                                      !inStock
                                        ? "cursor-not-allowed opacity-30"
                                        : "hover:border-[#1d1916]/50",
                                    ].join(" ")}
                                  >
                                    {label}
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}

                      {colors.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#81786e]">
                            Colour
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            {colors.map(
                              (color, index) => {
                                const name =
                                  getColorName(
                                    color,
                                    index
                                  );

                                return (
                                  <button
                                    key={`${name}-${index}`}
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      setSelectedColors(
                                        (
                                          current
                                        ) => ({
                                          ...current,
                                          [productId]:
                                            name,
                                        })
                                      )
                                    }
                                    className={[
                                      "inline-flex items-center gap-1.5 border px-2 py-1.5 text-[9px] font-semibold transition",
                                      selectedColor ===
                                      name
                                        ? "border-[#1d1916] bg-white"
                                        : "border-transparent bg-transparent",
                                    ].join(" ")}
                                  >
                                    <span
                                      className="h-3.5 w-3.5 rounded-full border border-[#1d1916]/15"
                                      style={{
                                        backgroundColor:
                                          getColorCode(color) ||
                                          "#d8d1c7",
                                      }}
                                    />
                                    <span className="max-w-24 truncate text-[#5d554d]">
                                      {name}
                                    </span>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <button
                          type="button"
                          disabled={
                            busy ||
                            availableStock <=
                              0 ||
                            (sizes.length >
                              0 &&
                              !selectedSize) ||
                            (colors.length >
                              0 &&
                              !selectedColor)
                          }
                          onClick={() =>
                            moveToCart(
                              product
                            )
                          }
                          className="border border-[#1d1916] bg-[#1d1916] px-3 py-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#f7f3ec] transition hover:bg-[#302a26] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {busy
                            ? "Working…"
                            : "Move to bag"}
                        </button>

                        <Link
                          to={`/product/${productId}`}
                          className="grid min-w-11 place-items-center border border-[#1d1916]/15 bg-white text-[#1d1916] transition hover:border-[#1d1916]"
                          aria-label={`View ${
                            product?.name ||
                            "product"
                          }`}
                        >
                          →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}