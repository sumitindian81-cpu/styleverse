import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiJson, apiRequest, getAuthToken } from "../utils/api";

const TYPES = [
  ["", "All types"],
  ["top", "Tops"],
  ["bottom", "Bottoms"],
  ["dress", "Dresses"],
  ["shoes", "Shoes"],
  ["bag", "Bags"],
  ["jewelry", "Jewelry"],
  ["accessory", "Accessories"],
  ["outerwear", "Outerwear"],
];

const GENDERS = [
  ["", "All genders"],
  ["women", "Women"],
  ["men", "Men"],
  ["kids", "Kids"],
  ["unisex", "Unisex"],
];

const SORTS = [
  ["new", "Newest"],
  ["price_asc", "Price: Low to High"],
  ["price_desc", "Price: High to Low"],
  ["rating", "Top Rated"],
];

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  type: "",
  gender: "",
  size: "",
  color: "",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  sort: "new",
};

const ICONS = {
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M20.8 8.7c0 5.4-8.8 10-8.8 10s-8.8-4.6-8.8-10A4.7 4.7 0 0 1 8 4c1.5 0 2.9.7 4 2 1.1-1.3 2.5-2 4-2a4.7 4.7 0 0 1 4.8 4.7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  heartFill: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M20.8 8.7c0 5.4-8.8 10-8.8 10s-8.8-4.6-8.8-10A4.7 4.7 0 0 1 8 4c1.5 0 2.9.7 4 2 1.1-1.3 2.5-2 4-2a4.7 4.7 0 0 1 4.8 4.7Z" fill="currentColor" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="m6 12 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function getImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  if (typeof image === "object") return image.url || image.secure_url || "";
  return "";
}

function getProductId(product) {
  return product?._id || product?.id || "";
}

function getProductImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  return images.map(getImageUrl).filter(Boolean);
}

function getMainImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const main = images.find((image) => image?.isMain === true) || images[0];
  return getImageUrl(main);
}

function formatPrice(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function titleCase(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCategoryName(product) {
  if (typeof product?.categoryId === "object") {
    return product.categoryId?.name || "Collection";
  }
  return product?.type ? titleCase(product.type) : "Collection";
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

function getWishlistProductId(item) {
  if (!item) return "";
  if (typeof item?.productId === "object") {
    return getProductId(item.productId);
  }
  return item?.productId || item?._id || item?.id || "";
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-[#ebe5dc]" />
      <div className="space-y-3 px-1 pt-4">
        <div className="h-2.5 w-20 bg-[#e1d9cf]" />
        <div className="h-4 w-3/4 bg-[#e1d9cf]" />
        <div className="h-3 w-1/3 bg-[#e1d9cf]" />
      </div>
    </div>
  );
}

function ProductCard({ product, isWishlisted, wishlistBusy, onWishlistToggle }) {
  const [imageBroken, setImageBroken] = useState(false);
  const productId = getProductId(product);
  const images = getProductImages(product);
  const imageUrl = images[0] || getMainImage(product);
  const hoverImageUrl = images[1] || "";
  const discount = Number(product?.discountPercent) || 0;
  const rating = Number(product?.averageRating) || 0;
  const reviews = Number(product?.totalReviews) || 0;
  const colors = Array.isArray(product?.colors) ? product.colors.slice(0, 4) : [];
  const stock = Number(product?.stock);
  const outOfStock = Number.isFinite(stock) && stock <= 0;

  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden bg-[#eee8df]">
        <Link to={`/product/${productId}`} className="block aspect-[4/5]">
          {!imageBroken && imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={product?.name || "Product"}
                className={`h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035] ${hoverImageUrl ? "group-hover:opacity-0" : ""}`}
                loading="lazy"
                onError={() => setImageBroken(true)}
              />
              {hoverImageUrl && (
                <img
                  src={hoverImageUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 ease-out group-hover:opacity-100 group-hover:scale-[1.035]"
                  loading="lazy"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#8d8276]">
              Image unavailable
            </div>
          )}
        </Link>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            {product?.isNewArrival && (
              <span className="border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#24211e] backdrop-blur">
                New
              </span>
            )}
            {product?.isBestSeller && (
              <span className="border border-[#dcc9a7]/70 bg-[#f0dfbd]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3a3023] backdrop-blur">
                Bestseller
              </span>
            )}
            {!product?.isNewArrival && !product?.isBestSeller && discount > 0 && (
              <span className="border border-white/70 bg-[#221f1d]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                {discount}% off
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWishlisted}
            disabled={wishlistBusy}
            onClick={() => onWishlistToggle(productId)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/75 bg-white/90 text-[#292522] shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {isWishlisted ? ICONS.heartFill : ICONS.heart}
          </button>
        </div>

        {outOfStock && (
          <div className="absolute inset-x-0 bottom-0 border-t border-black/10 bg-white/90 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6d655e] backdrop-blur">
            Out of stock
          </div>
        )}
      </div>

      <div className="px-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a8077]">
              {product?.brand || "Styleverse"} · {getCategoryName(product)}
            </div>
            <Link
              to={`/product/${productId}`}
              className="mt-1 block line-clamp-2 min-h-[3rem] text-[15px] font-medium leading-6 text-[#1e1c1a] transition group-hover:text-[#725b43]"
            >
              {product?.name || "Untitled product"}
            </Link>
          </div>

          <Link
            to={`/product/${productId}`}
            aria-label={`View ${product?.name || "product"}`}
            className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center border border-[#d8d0c6] text-[#292522] transition hover:bg-[#1f1d1b] hover:text-white sm:flex"
          >
            {ICONS.arrow}
          </Link>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold text-[#181614]">
              {formatPrice(product?.price)}
            </div>
            {product?.mrp && Number(product.mrp) > Number(product.price) && (
              <div className="mt-0.5 text-xs text-[#988e84] line-through">
                {formatPrice(product.mrp)}
              </div>
            )}
          </div>

          <div className="text-right text-[11px] text-[#756c64]">
            <div className="font-medium text-[#4f4741]">
              {rating > 0 ? `★ ${rating.toFixed(1)}` : "New"}
            </div>
            {reviews > 0 && <div>{reviews} reviews</div>}
          </div>
        </div>

        {colors.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {colors.map((color, index) => {
              const colorValue = color?.hex || color?.value || color?.code || "#d4cec5";
              return (
                <span
                  key={`${color?.name || "color"}-${index}`}
                  title={color?.name || "Color"}
                  className="h-3.5 w-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: colorValue }}
                />
              );
            })}
            {Array.isArray(product?.colors) && product.colors.length > 4 && (
              <span className="ml-1 text-[10px] text-[#938980]">
                +{product.colors.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#776e67]">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none border border-[#d7d0c8] bg-[#fbf8f3] px-3 py-3 pr-9 text-sm text-[#27231f] outline-none transition focus:border-[#9f8871]"
        >
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue || "all"} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6f675f]">
          {ICONS.chevron}
        </span>
      </div>
    </div>
  );
}

function FilterPanel({ filters, categories, categoryLoading, categoryError, onChange, onClear }) {
  return (
    <div className="border border-[#ded7cf] bg-[#fbf8f3] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-[#ddd5cc] pb-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d8176]">
            Refine the edit
          </div>
          <h2 className="mt-1 font-serif text-xl text-[#24211e]">Filters</h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b6349] transition hover:text-[#241f1b]"
        >
          Clear all
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#776e67]">
            Search
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#776e67]">
              {ICONS.search}
            </span>
            <input
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Search products, brands..."
              className="w-full border border-[#d7d0c8] bg-[#fffdf9] py-3 pl-10 pr-3 text-sm text-[#27231f] outline-none placeholder:text-[#aaa198] focus:border-[#9f8871]"
            />
          </div>
        </div>

        <FilterSelect
          label="Category"
          value={filters.category}
          onChange={(value) => onChange("category", value)}
          options={[
            ["", "All categories"],
            ...categories.map((category) => [
              category?._id || category?.id || "",
              category?.name || category?.title || "Category",
            ]),
          ]}
        />
        {categoryError && <p className="-mt-4 text-xs leading-5 text-[#9b6c28]">{categoryError}</p>}

        {categoryLoading && (
          <p className="-mt-4 text-[11px] text-[#958b82]">Loading categories…</p>
        )}

        <FilterSelect label="Product type" value={filters.type} onChange={(value) => onChange("type", value)} options={TYPES} />
        <FilterSelect label="For" value={filters.gender} onChange={(value) => onChange("gender", value)} options={GENDERS} />

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#776e67]">Size</label>
          <input
            value={filters.size}
            onChange={(event) => onChange("size", event.target.value)}
            placeholder="e.g. S, M, L"
            className="w-full border border-[#d7d0c8] bg-[#fffdf9] px-3 py-3 text-sm text-[#27231f] outline-none placeholder:text-[#aaa198] focus:border-[#9f8871]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#776e67]">Color</label>
          <input
            value={filters.color}
            onChange={(event) => onChange("color", event.target.value)}
            placeholder="e.g. Black, Blue"
            className="w-full border border-[#d7d0c8] bg-[#fffdf9] px-3 py-3 text-sm text-[#27231f] outline-none placeholder:text-[#aaa198] focus:border-[#9f8871]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#776e67]">Price</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={(event) => onChange("minPrice", event.target.value)}
              placeholder="Min"
              className="w-full border border-[#d7d0c8] bg-[#fffdf9] px-3 py-3 text-sm text-[#27231f] outline-none placeholder:text-[#aaa198] focus:border-[#9f8871]"
            />
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(event) => onChange("maxPrice", event.target.value)}
              placeholder="Max"
              className="w-full border border-[#d7d0c8] bg-[#fffdf9] px-3 py-3 text-sm text-[#27231f] outline-none placeholder:text-[#aaa198] focus:border-[#9f8871]"
            />
          </div>
        </div>

        <FilterSelect
          label="Minimum rating"
          value={filters.minRating}
          onChange={(value) => onChange("minRating", value)}
          options={[
            ["", "Any rating"],
            ["4", "4 stars & above"],
            ["3", "3 stars & above"],
            ["2", "2 stars & above"],
            ["1", "1 star & above"],
          ]}
        />
      </div>
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="border border-dashed border-[#ccc2b7] bg-[#fbf8f3] px-6 py-20 text-center">
      <div className="mx-auto max-w-md">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a7d72]">No pieces found</div>
        <h2 className="mt-3 font-serif text-3xl text-[#24211e]">Let’s change the edit.</h2>
        <p className="mt-3 text-sm leading-6 text-[#756c64]">
          Try removing one of your filters or explore the full collection again.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-7 inline-flex items-center gap-2 border border-[#25211e] bg-[#25211e] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#4a413a]"
        >
          Reset filters {ICONS.arrow}
        </button>
      </div>
    </div>
  );
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    type: searchParams.get("type") || "",
    gender: searchParams.get("gender") || "",
    size: searchParams.get("size") || "",
    color: searchParams.get("color") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    minRating: searchParams.get("minRating") || "",
    sort: searchParams.get("sort") || "new",
  }));

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: Number(searchParams.get("page")) || 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [wishlistBusyId, setWishlistBusyId] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.set(key, value);
      }
    });

    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
    return params.toString();
  }, [filters, pagination.page, pagination.limit]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(
      ([key, value]) => key !== "sort" && value !== ""
    ).length;
  }, [filters]);

  const loadCategories = useCallback(async () => {
    setCategoryLoading(true);
    setCategoryError("");

    try {
      const response = await apiRequest("/categories");
      const list =
        response?.data?.items ||
        response?.data?.categories ||
        response?.items ||
        response?.categories ||
        [];
      setCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      setCategories([]);
      setCategoryError(err?.message || "Could not load categories.");
    } finally {
      setCategoryLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(`/products?${queryString}`);
      const nextProducts = response?.data?.items || response?.items || [];
      const nextPagination = response?.data?.pagination || response?.pagination || {};

      setProducts(Array.isArray(nextProducts) ? nextProducts : []);
      setPagination((current) => ({
        ...current,
        page: Number(nextPagination.page) || current.page,
        limit: Number(nextPagination.limit) || current.limit,
        total: Number(nextPagination.total) || 0,
        totalPages: Number(nextPagination.totalPages) || 1,
      }));
    } catch (err) {
      setProducts([]);
      setError(err?.message || "Could not load the collection.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  const loadWishlist = useCallback(async () => {
    if (!getAuthToken()) {
      setWishlistIds(new Set());
      return;
    }

    try {
      const response = await apiRequest("/wishlist");
      const items = normalizeWishlist(response);
      const ids = new Set(
        items.map(getWishlistProductId).filter(Boolean).map(String)
      );
      setWishlistIds(ids);
    } catch {
      // Wishlist failure should not block catalog browsing.
      setWishlistIds(new Set());
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadWishlist();

    const handleAuthChange = () => loadWishlist();
    window.addEventListener("styleverse-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("styleverse-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [loadWishlist]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        nextParams.set(key, value);
      }
    });

    nextParams.set("page", String(pagination.page));
    setSearchParams(nextParams, { replace: true });
  }, [filters, pagination.page, setSearchParams]);

  function updateFilter(key, value) {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters({ ...DEFAULT_FILTERS });
    setMobileFiltersOpen(false);
  }

  async function toggleWishlist(productId) {
    if (!productId || wishlistBusyId) return;

    if (!getAuthToken()) {
      window.location.assign(`/login?redirect=${encodeURIComponent("/shop")}`);
      return;
    }

    setWishlistBusyId(productId);
    setError("");

    const alreadySaved = wishlistIds.has(String(productId));

    try {
      if (alreadySaved) {
        await apiRequest(`/wishlist/${productId}`, { method: "DELETE" });
        setWishlistIds((current) => {
          const next = new Set(current);
          next.delete(String(productId));
          return next;
        });
      } else {
        await apiJson("/wishlist", {
          method: "POST",
          data: { productId },
        });
        setWishlistIds((current) => new Set(current).add(String(productId)));
      }
    } catch (err) {
      setError(err?.message || "Could not update your wishlist.");
    } finally {
      setWishlistBusyId("");
    }
  }

  const showingStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  const activeChips = [
    filters.search ? { key: "search", label: `Search: ${filters.search}` } : null,
    filters.category
      ? {
          key: "category",
          label:
            categories.find((category) => String(category?._id || category?.id) === String(filters.category))?.name ||
            "Category",
        }
      : null,
    filters.type ? { key: "type", label: titleCase(filters.type) } : null,
    filters.gender ? { key: "gender", label: titleCase(filters.gender) } : null,
    filters.size ? { key: "size", label: `Size ${filters.size}` } : null,
    filters.color ? { key: "color", label: `Color ${filters.color}` } : null,
    filters.minPrice || filters.maxPrice
      ? {
          key: "price",
          label: `Price ${filters.minPrice || "₹0"}–${filters.maxPrice || "∞"}`,
        }
      : null,
    filters.minRating ? { key: "minRating", label: `${filters.minRating}+ stars` } : null,
  ].filter(Boolean);

  return (
    <section className="min-h-screen bg-[#f7f3ed] text-[#24211e]">
      <div className="border-b border-[#dfd7ce] bg-[#eee7dd]">
        <div className="mx-auto max-w-[1500px] px-4 py-2.5 text-center sm:px-6 lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d6258]">
            The Styleverse Edit · New season pieces, everyday essentials, personal style
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-12">
        <div className="border-b border-[#dcd4ca] pb-9 lg:pb-11">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a7e73]">
                <Link to="/" className="transition hover:text-[#2e2925]">Home</Link>
                <span>/</span>
                <span>Shop</span>
              </div>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.94] tracking-[-0.035em] text-[#211e1b] sm:text-6xl lg:text-[78px]">
                The collection,
                <span className="block italic text-[#7a654f]">edited for you.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#746b63] sm:text-base">
                Discover considered pieces across women, men, kids and accessories. Filter by the details that matter, then open any piece for the full story.
              </p>
            </div>

            <div className="hidden min-w-[190px] border-l border-[#d4ccc2] pl-6 lg:block">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b7f74]">Current catalogue</div>
              <div className="mt-2 font-serif text-4xl text-[#24211e]">{loading ? "—" : pagination.total}</div>
              <div className="mt-1 text-xs leading-5 text-[#82786f]">active Styleverse pieces</div>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-4 border-b border-[#ded6cd] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-2 border border-[#26221f] bg-[#26221f] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#4b433c] lg:hidden"
            >
              {ICONS.filter}
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>

            {activeChips.length > 0 ? (
              activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => {
                    if (chip.key === "price") {
                      updateFilter("minPrice", "");
                      updateFilter("maxPrice", "");
                    } else {
                      updateFilter(chip.key, "");
                    }
                  }}
                  className="inline-flex items-center gap-2 border border-[#d2c9bf] bg-[#fbf8f3] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f554d] transition hover:border-[#9d8871]"
                >
                  {chip.label}
                  <span className="text-[#9b9087]">×</span>
                </button>
              ))
            ) : (
              <span className="text-xs text-[#958b82]">All pieces · no filters applied</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#867c73] sm:inline">
              {loading ? "Updating collection…" : `${showingStart}–${showingEnd} of ${pagination.total}`}
            </span>
            <div className="relative min-w-[190px]">
              <select
                value={filters.sort}
                onChange={(event) => updateFilter("sort", event.target.value)}
                className="w-full appearance-none border border-[#d3cbc2] bg-[#fbf8f3] px-3 py-3 pr-9 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4e4741] outline-none focus:border-[#9f8871]"
              >
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#766d65]">{ICONS.chevron}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[255px_minmax(0,1fr)] xl:grid-cols-[275px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-5">
              <FilterPanel
                filters={filters}
                categories={categories}
                categoryLoading={categoryLoading}
                categoryError={categoryError}
                onChange={updateFilter}
                onClear={clearFilters}
              />
            </div>
          </aside>

          <main className="min-w-0">
            {error && (
              <div className="mb-6 flex flex-col gap-3 border border-[#dfc4bd] bg-[#f8ece8] px-4 py-4 text-sm text-[#7f493f] sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <button type="button" onClick={loadProducts} className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] underline underline-offset-4">
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, index) => <SkeletonCard key={index} />)}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => {
                  const productId = String(getProductId(product));
                  return (
                    <ProductCard
                      key={productId}
                      product={product}
                      isWishlisted={wishlistIds.has(productId)}
                      wishlistBusy={wishlistBusyId === productId}
                      onWishlistToggle={toggleWishlist}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState onClear={clearFilters} />
            )}

            {pagination.totalPages > 1 && (
              <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#dcd4ca] pt-7 sm:flex-row">
                <div className="text-xs text-[#867c73]">
                  Page {pagination.page} of {pagination.totalPages}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
                    className="border border-[#d3cbc2] bg-[#fbf8f3] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4a433e] transition hover:border-[#99836b] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Previous
                  </button>
                  <div className="min-w-12 border border-[#26221f] bg-[#26221f] px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                    {pagination.page}
                  </div>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
                    className="border border-[#d3cbc2] bg-[#fbf8f3] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4a433e] transition hover:border-[#99836b] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <div className="mt-16 grid gap-px bg-[#d7cfc5] sm:grid-cols-3">
              <div className="bg-[#f7f3ed] px-5 py-7">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f746b]">01</div>
                <h3 className="mt-3 font-serif text-xl text-[#28231f]">Curated discovery</h3>
                <p className="mt-2 text-xs leading-5 text-[#7a7169]">Browse the catalogue by category, type, gender, size, colour and price.</p>
              </div>
              <div className="bg-[#f7f3ed] px-5 py-7">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f746b]">02</div>
                <h3 className="mt-3 font-serif text-xl text-[#28231f]">Built for personal style</h3>
                <p className="mt-2 text-xs leading-5 text-[#7a7169]">Save pieces to your wishlist, then use them later in your Styleverse wardrobe.</p>
              </div>
              <div className="bg-[#f7f3ed] px-5 py-7">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f746b]">03</div>
                <h3 className="mt-3 font-serif text-xl text-[#28231f]">Designed to continue</h3>
                <p className="mt-2 text-xs leading-5 text-[#7a7169]">Open any product for variants, reviews, purchase actions and related pieces.</p>
              </div>
            </div>
          </main>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Product filters">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-[#15110e]/45 backdrop-blur-[2px]"
          />
          <div className="absolute inset-y-0 left-0 w-[92%] max-w-md overflow-y-auto bg-[#f7f3ed] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ddd4ca] px-5 py-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8d8176]">The edit</div>
                <div className="mt-1 font-serif text-2xl">Filter collection</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center border border-[#d2c9bf] bg-[#fbf8f3] text-[#2d2925]"
                aria-label="Close filter drawer"
              >
                {ICONS.close}
              </button>
            </div>
            <div className="p-5">
              <FilterPanel
                filters={filters}
                categories={categories}
                categoryLoading={categoryLoading}
                categoryError={categoryError}
                onChange={updateFilter}
                onClear={clearFilters}
              />
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-4 flex w-full items-center justify-center gap-2 bg-[#24211e] px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
              >
                View {pagination.total || 0} pieces {ICONS.arrow}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}