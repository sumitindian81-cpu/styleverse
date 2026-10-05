import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiJson, apiRequest, getAuthToken } from "../utils/api";

function getImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return image;

  if (typeof image === "object") {
    return image.url || image.secure_url || "";
  }

  return "";
}

function getMainImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const main = images.find((image) => image?.isMain === true) || images[0];
  return getImageUrl(main);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getCategoryId(product) {
  if (typeof product?.categoryId === "string") return product.categoryId;
  return product?.categoryId?._id || "";
}

function getCategoryName(product) {
  if (typeof product?.categoryId === "object") {
    return product?.categoryId?.name || "";
  }

  return "";
}

function StarRating({ value = 0 }) {
  const rating = Number(value) || 0;

  return (
    <span className="inline-flex items-center gap-1 text-sm text-[#3f3932]">
      <span className="font-semibold">★ {rating.toFixed(1)}</span>
    </span>
  );
}

function ProductSkeleton() {
  return (
    <section className="min-h-screen bg-[#f7f3ec] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-4 w-28 bg-[#e6dfd4]" />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="grid gap-4 sm:grid-cols-[92px_minmax(0,1fr)]">
            <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 w-20 shrink-0 rounded-xl bg-[#e6dfd4]"
                />
              ))}
            </div>

            <div className="order-1 aspect-[4/5] rounded-3xl bg-[#e6dfd4] sm:order-2" />
          </div>

          <div className="space-y-5 pt-2">
            <div className="h-3 w-24 bg-[#e6dfd4]" />
            <div className="h-14 w-4/5 bg-[#e6dfd4]" />
            <div className="h-9 w-40 bg-[#e6dfd4]" />
            <div className="h-24 w-full bg-[#e6dfd4]" />
            <div className="h-12 w-full bg-[#e6dfd4]" />
            <div className="h-12 w-full bg-[#e6dfd4]" />
            <div className="h-14 w-full bg-[#e6dfd4]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductMiniCard({ product }) {
  const imageUrl = getMainImage(product);

  return (
    <Link
      to={`/product/${product?._id}`}
      className="group block overflow-hidden border border-[#1d1916]/10 bg-white"
    >
      <div className="aspect-[4/5] overflow-hidden bg-[#eee8df]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product?.name || "Product"}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.16em] text-[#8d857a]">
            Image unavailable
          </div>
        )}
      </div>

      <div className="px-3 py-4 sm:px-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8d857a]">
          {product?.brand || "Styleverse"}
        </p>

        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-[#1d1916]">
          {product?.name || "Untitled product"}
        </h3>

        <p className="mt-3 text-sm font-semibold text-[#1d1916]">
          {formatPrice(product?.price)}
        </p>
      </div>
    </Link>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [zoomOpen, setZoomOpen] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const images = useMemo(
    () => normalizeArray(product?.images),
    [product]
  );

  const sizes = useMemo(
    () => normalizeArray(product?.sizes),
    [product]
  );

  const colors = useMemo(
    () => normalizeArray(product?.colors),
    [product]
  );

  const currentImage =
    getImageUrl(images[selectedImageIndex]) || getMainImage(product);

  const availableStock = Math.max(Number(product?.stock) || 0, 0);

  const categoryName = getCategoryName(product);

  const selectedColorObject = colors.find(
    (color) => String(color?.name || "") === String(selectedColor)
  );

  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);

    setActionMessage("");
    setActionError("");

    setReviewComment("");
    setReviewRating(5);
  }, [id]);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(`/products/${id}`);

      const nextProduct =
        response?.data?.product ||
        response?.product ||
        null;

      if (!nextProduct) {
        throw new Error("Product not found.");
      }

      setProduct(nextProduct);

      const nextImages = normalizeArray(nextProduct.images);
      const mainIndex = nextImages.findIndex(
        (image) => image?.isMain === true
      );

      setSelectedImageIndex(mainIndex >= 0 ? mainIndex : 0);

      const firstAvailableSize =
        normalizeArray(nextProduct.sizes).find(
          (item) => Number(item?.stock ?? 0) > 0
        )?.size || "";

      const firstSize =
        firstAvailableSize ||
        normalizeArray(nextProduct.sizes)[0]?.size ||
        "";

      const firstColor =
        normalizeArray(nextProduct.colors)[0]?.name ||
        "";

      setSelectedSize(firstSize);
      setSelectedColor(firstColor);
    } catch (err) {
      setProduct(null);
      setError(err?.message || "Could not load this product.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);

    try {
      const response = await apiRequest(`/products/${id}/reviews`);

      const nextReviews =
        response?.data?.items ||
        response?.data?.reviews ||
        response?.items ||
        response?.reviews ||
        [];

      setReviews(Array.isArray(nextReviews) ? nextReviews : []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const loadRelated = useCallback(async () => {
    if (!product) return;

    setRelatedLoading(true);

    try {
      const categoryId = getCategoryId(product);

      const query = categoryId
        ? `/products?category=${encodeURIComponent(
            categoryId
          )}&limit=4&sort=new`
        : `/products?type=${encodeURIComponent(
            product?.type || ""
          )}&limit=4&sort=new`;

      const response = await apiRequest(query);

      const nextProducts =
        response?.data?.items ||
        response?.items ||
        [];

      const filtered = Array.isArray(nextProducts)
        ? nextProducts
            .filter(
              (item) =>
                String(item?._id) !== String(id)
            )
            .slice(0, 4)
        : [];

      setRelatedProducts(filtered);
    } catch {
      setRelatedProducts([]);
    } finally {
      setRelatedLoading(false);
    }
  }, [id, product]);

  useEffect(() => {
    loadProduct();
    loadReviews();
  }, [loadProduct, loadReviews]);

  useEffect(() => {
    if (product) {
      loadRelated();
    }
  }, [product, loadRelated]);

  async function addToCart({ goToCart = false } = {}) {
    setActionMessage("");
    setActionError("");

    if (!getAuthToken()) {
      setActionError("Please log in before adding items to your cart.");
      return;
    }

    if (availableStock <= 0) {
      setActionError("This product is currently out of stock.");
      return;
    }

    if (sizes.length > 0 && !selectedSize) {
      setActionError("Please select a size.");
      return;
    }

    if (colors.length > 0 && !selectedColor) {
      setActionError("Please select a color.");
      return;
    }

    if (quantity > availableStock) {
      setActionError(
        `Only ${availableStock} item${
          availableStock === 1 ? "" : "s"
        } available.`
      );
      setQuantity(availableStock);
      return;
    }

    try {
      await apiJson("/cart", {
        method: "POST",
        data: {
          productId: product._id,
          quantity,
          selectedSize: selectedSize || undefined,
          selectedColor: selectedColor || undefined,
        },
      });

      setActionMessage(
        goToCart
          ? "Added to cart. Opening your bag…"
          : "Product added to your bag successfully."
      );

      if (goToCart) {
        navigate("/cart");
      }
    } catch (err) {
      setActionError(
        err?.message || "Could not add this product to your cart."
      );
    }
  }

  async function addToWishlist() {
    setActionMessage("");
    setActionError("");

    if (!getAuthToken()) {
      setActionError("Please log in before using your wishlist.");
      return;
    }

    try {
      await apiJson("/wishlist", {
        method: "POST",
        data: {
          productId: product._id,
        },
      });

      setActionMessage("Product added to your wishlist.");
    } catch (err) {
      setActionError(
        err?.message || "Could not update your wishlist."
      );
    }
  }

  async function submitReview(event) {
    event.preventDefault();

    setActionMessage("");
    setActionError("");

    if (!getAuthToken()) {
      setActionError("Please log in to submit a review.");
      return;
    }

    if (!reviewComment.trim()) {
      setActionError("Please write a review comment.");
      return;
    }

    setReviewSubmitting(true);

    try {
      await apiJson(`/products/${id}/reviews`, {
        method: "POST",
        data: {
          rating: Number(reviewRating),
          comment: reviewComment.trim(),
        },
      });

      setReviewComment("");
      setReviewRating(5);

      await Promise.all([loadProduct(), loadReviews()]);

      setActionMessage("Your review was submitted successfully.");
    } catch (err) {
      setActionError(
        err?.message || "Could not submit your review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return <ProductSkeleton />;
  }

  if (error || !product) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-14 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
            Styleverse
          </p>

          <h1
            className="mt-3 text-4xl text-[#1d1916] sm:text-5xl"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            Product unavailable
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#6e665d]">
            {error || "This product could not be found."}
          </p>

          <Link
            to="/shop"
            className="mt-8 inline-flex items-center border border-[#1d1916] bg-[#1d1916] px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#f7f3ec] transition hover:bg-[#2a2521]"
          >
            Back to Shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Link
            to="/shop"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71695f] transition hover:text-[#1d1916]"
          >
            ← Back to collection
          </Link>

          {categoryName && (
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
              {categoryName}
            </span>
          )}
        </div>

        {(actionMessage || actionError) && (
          <div
            className={[
              "mb-7 border px-4 py-3 text-sm",
              actionError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {actionError || actionMessage}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] xl:gap-14">
          {/* Product imagery */}
          <div className="min-w-0">
            <div className="grid gap-4 sm:grid-cols-[94px_minmax(0,1fr)]">
              <div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
                {images.length > 0 ? (
                  images.map((image, index) => {
                    const url = getImageUrl(image);

                    return (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() =>
                          setSelectedImageIndex(index)
                        }
                        className={[
                          "h-[84px] w-[72px] shrink-0 overflow-hidden border bg-white transition sm:h-[104px] sm:w-[88px]",
                          selectedImageIndex === index
                            ? "border-[#1d1916] ring-1 ring-[#1d1916]"
                            : "border-[#1d1916]/10 hover:border-[#1d1916]/40",
                        ].join(" ")}
                        aria-label={`View product image ${
                          index + 1
                        }`}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={`${product.name} ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] uppercase tracking-[0.12em] text-[#9a9389]">
                            No image
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#9a9389]">
                    No images
                  </p>
                )}
              </div>

              <div className="order-1 border border-[#1d1916]/10 bg-[#eee8df] sm:order-2">
                <button
                  type="button"
                  onClick={() => currentImage && setZoomOpen(true)}
                  className="block w-full"
                  aria-label="Open product image zoom"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    {currentImage ? (
                      <img
                        src={currentImage}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-700 hover:scale-[1.025]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.16em] text-[#8d857a]">
                        Image unavailable
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Product information */}
          <div className="lg:sticky lg:top-32 lg:h-fit">
            <div className="border-b border-[#1d1916]/10 pb-7">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
                  {product.brand || "Styleverse"}
                </p>

                {product?.isNewArrival && (
                  <span className="border border-[#1d1916]/15 bg-white px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em]">
                    New arrival
                  </span>
                )}
              </div>

              <h1
                className="mt-4 max-w-xl text-4xl leading-[0.98] tracking-[-0.025em] sm:text-5xl"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                {product.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-end gap-4">
                <p className="text-2xl font-semibold tracking-[-0.02em]">
                  {formatPrice(product.price)}
                </p>

                {Number(product.mrp) > Number(product.price) && (
                  <p className="pb-1 text-sm text-[#a39b90] line-through">
                    {formatPrice(product.mrp)}
                  </p>
                )}

                {Number(product.discountPercent) > 0 && (
                  <span className="border border-[#9a7655]/30 bg-[#efe4d7] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#76583c]">
                    {product.discountPercent}% off
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#686057]">
                <StarRating value={product.averageRating} />
                <span>
                  {Number(product.totalReviews) || 0} reviews
                </span>
              </div>
            </div>

            <div className="border-b border-[#1d1916]/10 py-7">
              <p className="max-w-2xl text-sm leading-7 text-[#686057]">
                {product.description ||
                  "A considered Styleverse piece designed for an easy, elevated everyday wardrobe."}
              </p>
            </div>

            {sizes.length > 0 && (
              <div className="border-b border-[#1d1916]/10 py-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                    Select size
                  </h2>

                  <span className="text-[9px] uppercase tracking-[0.14em] text-[#9a9389]">
                    Required
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {sizes.map((option) => {
                    const label = option?.size || "";
                    const sizeStock = Number(option?.stock ?? 0);
                    const disabled = sizeStock <= 0;

                    return (
                      <button
                        key={label}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedSize(label)}
                        className={[
                          "min-w-14 border px-4 py-3 text-xs font-semibold transition",
                          selectedSize === label
                            ? "border-[#1d1916] bg-[#1d1916] text-[#f7f3ec]"
                            : "border-[#1d1916]/15 bg-white text-[#322d29] hover:border-[#1d1916]/50",
                          disabled
                            ? "cursor-not-allowed opacity-30"
                            : "",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {colors.length > 0 && (
              <div className="border-b border-[#1d1916]/10 py-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                    Select colour
                  </h2>

                  <span className="text-xs text-[#686057]">
                    {selectedColor || "Choose"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {colors.map((color, index) => {
                    const name =
                      color?.name || `Colour ${index + 1}`;

                    const swatch =
                      color?.code ||
                      color?.hex ||
                      color?.value ||
                      "#d9d3c9";

                    return (
                      <button
                        key={`${name}-${index}`}
                        type="button"
                        onClick={() => setSelectedColor(name)}
                        className={[
                          "group inline-flex items-center gap-2 border px-3 py-2 transition",
                          selectedColor === name
                            ? "border-[#1d1916] bg-white"
                            : "border-transparent",
                        ].join(" ")}
                      >
                        <span
                          className="h-6 w-6 rounded-full border border-[#1d1916]/15"
                          style={{ backgroundColor: swatch }}
                        />
                        <span className="text-xs font-medium text-[#4e4841]">
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedColorObject?.code && (
                  <p className="mt-3 text-[9px] uppercase tracking-[0.14em] text-[#9a9389]">
                    Selected finish: {selectedColorObject.code}
                  </p>
                )}
              </div>
            )}

            <div className="border-b border-[#1d1916]/10 py-7">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Quantity
                </h2>

                <span className="text-[9px] uppercase tracking-[0.14em] text-[#8d857a]">
                  {availableStock > 0
                    ? `${availableStock} available`
                    : "Out of stock"}
                </span>
              </div>

              <div className="mt-4 inline-flex items-center border border-[#1d1916]/15 bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.max(1, current - 1)
                    )
                  }
                  className="h-12 w-12 text-lg"
                  aria-label="Decrease quantity"
                >
                  −
                </button>

                <span className="w-12 text-center text-sm font-semibold">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(
                        availableStock || 99,
                        current + 1
                      )
                    )
                  }
                  className="h-12 w-12 text-lg"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="py-7">
              <button
                type="button"
                onClick={() => addToCart()}
                className="w-full bg-[#1d1916] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] transition hover:bg-[#302a26]"
              >
                Add to bag
              </button>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => addToCart({ goToCart: true })}
                  className="border border-[#1d1916] bg-transparent px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1916] transition hover:bg-white"
                >
                  Buy now
                </button>

                <button
                  type="button"
                  onClick={() => addToWishlist()}
                  className="border border-[#1d1916]/15 bg-white px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d1916] transition hover:border-[#1d1916]"
                >
                  ♡ Wishlist
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 border-y border-[#1d1916]/10 text-center">
              <div className="px-2 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                  Secure
                </p>
                <p className="mt-1 text-[9px] text-[#8d857a]">
                  Checkout
                </p>
              </div>

              <div className="border-x border-[#1d1916]/10 px-2 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                  Easy
                </p>
                <p className="mt-1 text-[9px] text-[#8d857a]">
                  Returns
                </p>
              </div>

              <div className="px-2 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em]">
                  Fast
                </p>
                <p className="mt-1 text-[9px] text-[#8d857a]">
                  Delivery
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <section className="mt-20 border-t border-[#1d1916]/10 pt-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                Product notes
              </p>

              <h2
                className="mt-3 text-4xl leading-tight"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                The details that make the piece.
              </h2>
            </div>

            <div className="grid border-t border-[#1d1916]/10 sm:grid-cols-2">
              {[
                ["Type", product.type],
                ["Gender", product.gender],
                ["Material", product.material],
                ["Pattern", product.pattern],
                ["Brand", product.brand],
                ["Category", categoryName],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-[#1d1916]/10 px-1 py-5 sm:px-4"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9a9389]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#342e29]">
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-20 border-t border-[#1d1916]/10 pt-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                    Community notes
                  </p>

                  <h2
                    className="mt-2 text-4xl"
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Reviews
                  </h2>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-semibold">
                    {(Number(product.averageRating) || 0).toFixed(1)}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.16em] text-[#8d857a]">
                    Average rating
                  </div>
                </div>
              </div>

              {reviewsLoading ? (
                <div className="mt-8 space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse border border-[#1d1916]/10 bg-white p-6"
                    >
                      <div className="h-3 w-24 bg-[#e6dfd4]" />
                      <div className="mt-4 h-4 w-3/4 bg-[#e6dfd4]" />
                      <div className="mt-2 h-4 w-1/2 bg-[#e6dfd4]" />
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {reviews.map((review, index) => (
                    <article
                      key={
                        review?._id ||
                        review?.id ||
                        `review-${index}`
                      }
                      className="border-b border-[#1d1916]/10 py-6"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold">
                          {review?.userId?.name ||
                            review?.user?.name ||
                            "Customer"}
                        </p>
                        <StarRating value={review?.rating} />
                      </div>

                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#676057]">
                        {review?.comment || "No written comment."}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 border border-dashed border-[#1d1916]/15 bg-white p-8 text-sm leading-6 text-[#777067]">
                  No reviews yet. Be the first to share your experience.
                </div>
              )}
            </div>

            <form
              onSubmit={submitReview}
              className="h-fit border border-[#1d1916]/10 bg-white p-6 sm:p-7"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                Your experience
              </p>

              <h3
                className="mt-2 text-3xl"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Write a review
              </h3>

              <label className="mt-7 block text-[10px] font-semibold uppercase tracking-[0.18em]">
                Rating
              </label>

              <select
                value={reviewRating}
                onChange={(event) =>
                  setReviewRating(Number(event.target.value))
                }
                className="mt-2 h-12 w-full border border-[#1d1916]/15 bg-[#fbf8f3] px-3 text-sm outline-none focus:border-[#1d1916]"
              >
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Good</option>
                <option value="3">3 — Average</option>
                <option value="2">2 — Fair</option>
                <option value="1">1 — Poor</option>
              </select>

              <label className="mt-6 block text-[10px] font-semibold uppercase tracking-[0.18em]">
                Comment
              </label>

              <textarea
                value={reviewComment}
                onChange={(event) =>
                  setReviewComment(event.target.value)
                }
                rows={6}
                placeholder="Tell us what you thought about the piece…"
                className="mt-2 w-full resize-y border border-[#1d1916]/15 bg-[#fbf8f3] px-3 py-3 text-sm leading-6 outline-none focus:border-[#1d1916]"
              />

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="mt-4 w-full bg-[#1d1916] px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] transition hover:bg-[#302a26] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {reviewSubmitting ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </div>
        </section>

        {/* Related */}
        <section className="mt-20 border-t border-[#1d1916]/10 pt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                Continue browsing
              </p>

              <h2
                className="mt-2 text-4xl"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                You may also like.
              </h2>
            </div>

            <Link
              to="/shop"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71695f] hover:text-[#1d1916]"
            >
              View collection →
            </Link>
          </div>

          {relatedLoading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse border border-[#1d1916]/10 bg-white"
                >
                  <div className="aspect-[4/5] bg-[#e6dfd4]" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-20 bg-[#e6dfd4]" />
                    <div className="h-4 w-3/4 bg-[#e6dfd4]" />
                  </div>
                </div>
              ))}
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {relatedProducts.map((item) => (
                <ProductMiniCard
                  key={item?._id || item?.id}
                  product={item}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-dashed border-[#1d1916]/15 bg-white p-8 text-sm text-[#777067]">
              No related products available right now.
            </div>
          )}
        </section>
      </div>

      {/* Image zoom */}
      {zoomOpen && currentImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#171411]/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Product image zoom"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-h-[92vh] max-w-5xl overflow-hidden bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center bg-white text-xl text-[#1d1916] shadow"
              aria-label="Close image zoom"
            >
              ×
            </button>

            <img
              src={currentImage}
              alt={product.name}
              className="max-h-[92vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
