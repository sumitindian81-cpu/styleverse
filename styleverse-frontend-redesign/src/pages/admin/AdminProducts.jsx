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

function getMainImage(product) {
  const images = Array.isArray(product?.images)
    ? product.images
    : [];

  const main =
    images.find(
      (image) => image?.isMain === true
    ) || images[0];

  if (!main) return "";

  return typeof main === "string"
    ? main
    : main.url ||
        main.secure_url ||
        "";
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function stockLabel(value) {
  const stock = Number(value) || 0;

  if (stock <= 0) {
    return {
      label: "Out of stock",
      className:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (stock <= 5) {
    return {
      label: `Low stock · ${stock}`,
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: `${stock} in stock`,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function formatType(value) {
  return String(value || "product")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
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

function ProductSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse border border-[#1d1916]/10 bg-white p-4 sm:p-5"
          >
            <div className="flex gap-4">
              <div className="h-20 w-16 shrink-0 bg-[#e5ddd2]" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-40 bg-[#e5ddd2]" />
                <div className="h-3 w-24 bg-[#e5ddd2]" />
                <div className="h-3 w-32 bg-[#e5ddd2]" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({ reset }) {
  return (
    <div className="border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
        Catalogue
      </p>

      <h2
        className="mt-4 text-4xl leading-none tracking-[-0.035em] sm:text-5xl"
        style={{
          fontFamily:
            "Georgia, 'Times New Roman', serif",
        }}
      >
        No products found.
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#71685f]">
        Try a different search or clear the filter to see the current catalogue.
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-7 border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#f7f3ec]"
      >
        Clear search
      </button>
    </div>
  );
}

export default function AdminProducts() {
  const navigate = useNavigate();

  const [products, setProducts] =
    useState([]);

  const [searchInput, setSearchInput] =
    useState("");

  const [activeSearch, setActiveSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const loadProducts = useCallback(
    async (searchValue = "") => {
      setLoading(true);
      setError("");

      if (!getAuthToken()) {
        navigate("/login");
        setLoading(false);
        return;
      }

      try {
        const query =
          new URLSearchParams({
            limit: "50",
          });

        if (searchValue.trim()) {
          query.set(
            "search",
            searchValue.trim()
          );
        }

        const result =
          await apiRequest(
            `/admin/products?${query.toString()}`
          );

        const items =
          result?.data?.items ||
          result?.data?.products ||
          result?.items ||
          result?.products ||
          [];

        setProducts(
          Array.isArray(items)
            ? items
            : []
        );
      } catch (err) {
        setProducts([]);
        setError(
          err?.message ||
            "Unable to load products."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadProducts("");
  }, [loadProducts]);

  function runSearch(event) {
    event?.preventDefault?.();

    const next =
      searchInput.trim();

    setActiveSearch(next);
    loadProducts(next);
  }

  function clearSearch() {
    setSearchInput("");
    setActiveSearch("");
    loadProducts("");
  }

  async function handleDelete(product) {
    const productName =
      product?.name ||
      "this product";

    const confirmed =
      window.confirm(
        `Remove “${productName}” from the active catalogue?`
      );

    if (!confirmed) return;

    const id =
      product?._id ||
      product?.id;

    if (!id) return;

    setBusyId(id);
    setError("");

    try {
      await apiRequest(
        `/admin/products/${id}`,
        {
          method: "DELETE",
        }
      );

      setProducts((current) =>
        current.filter(
          (item) =>
            (item?._id ||
              item?.id) !== id
        )
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to remove this product."
      );
    } finally {
      setBusyId("");
    }
  }

  const summary = useMemo(() => {
    const total = products.length;

    const lowStock =
      products.filter(
        (product) =>
          Number(product?.stock) > 0 &&
          Number(product?.stock) <= 5
      ).length;

    const outOfStock =
      products.filter(
        (product) =>
          Number(product?.stock) <= 0
      ).length;

    const featured =
      products.filter(
        (product) =>
          product?.isFeatured === true
      ).length;

    return {
      total,
      lowStock,
      outOfStock,
      featured,
    };
  }, [products]);

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
                Catalogue control
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
                      "Products" && (
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
                    Styleverse / Administration / Products
                  </p>

                  <h1
                    className="mt-3 text-5xl leading-none tracking-[-0.045em] sm:text-6xl lg:text-7xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    The catalogue.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#70685f]">
                    Add, edit, search and curate every product in the Styleverse collection.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/"
                    className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                  >
                    View store
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      loadProducts(
                        activeSearch
                      )
                    }
                    disabled={loading}
                    className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Refreshing…" : "Refresh"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/admin/products/new"
                      )
                    }
                    className="border border-[#1d1916] bg-[#1d1916] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f7f3ec]"
                  >
                    + Add product
                  </button>
                </div>
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
                  Listed
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.total}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Products in current result
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Low stock
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.lowStock}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  1–5 units remaining
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Out of stock
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.outOfStock}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Products needing restock
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Featured
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.featured}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Products marked featured
                </p>
              </div>
            </section>

            <section className="mt-7 border border-[#1d1916]/10 bg-white p-5 sm:p-6">
              <form
                onSubmit={runSearch}
                className="flex flex-col gap-3 lg:flex-row"
              >
                <div className="flex-1">
                  <label
                    htmlFor="admin-product-search"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#81776c]"
                  >
                    Search catalogue
                  </label>

                  <input
                    id="admin-product-search"
                    value={
                      searchInput
                    }
                    onChange={(event) =>
                      setSearchInput(
                        event.target.value
                      )
                    }
                    placeholder="Search by product name or brand…"
                    className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none transition placeholder:text-[#a59a8e] focus:border-[#1d1916] focus:bg-white"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#f7f3ec]"
                  >
                    Search
                  </button>

                  {activeSearch && (
                    <button
                      type="button"
                      onClick={
                        clearSearch
                      }
                      className="border border-[#1d1916]/20 bg-white px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.15em]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#81776c]">
                <span>
                  {activeSearch
                    ? `Showing results for “${activeSearch}”`
                    : "Showing the latest admin catalogue results"}
                </span>

                <span>
                  Up to 50 products loaded
                </span>
              </div>
            </section>

            {error && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() =>
                    loadProducts(
                      activeSearch
                    )
                  }
                  className="text-sm font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            <section className="mt-7">
              {loading ? (
                <ProductSkeleton />
              ) : products.length === 0 ? (
                <EmptyState
                  reset={
                    clearSearch
                  }
                />
              ) : (
                <>
                  <div className="hidden overflow-hidden border border-[#1d1916]/10 bg-white xl:block">
                    <div className="grid grid-cols-[88px_1.7fr_0.7fr_0.8fr_0.85fr_0.7fr_0.9fr] border-b border-[#1d1916]/10 bg-[#eee7dc] px-5 py-4 text-xs font-semibold uppercase tracking-[0.13em] text-[#766b60]">
                      <span>Image</span>
                      <span>Product</span>
                      <span>Category</span>
                      <span>Price</span>
                      <span>Stock</span>
                      <span>Updated</span>
                      <span className="text-right">
                        Actions
                      </span>
                    </div>

                    {products.map(
                      (product) => {
                        const id =
                          product?._id ||
                          product?.id ||
                          "";

                        const image =
                          getMainImage(
                            product
                          );

                        const stock =
                          stockLabel(
                            product?.stock
                          );

                        return (
                          <div
                            key={id}
                            className="grid grid-cols-[88px_1.7fr_0.7fr_0.8fr_0.85fr_0.7fr_0.9fr] items-center border-b border-[#1d1916]/10 px-5 py-4 last:border-b-0"
                          >
                            <div className="h-20 w-16 overflow-hidden bg-[#eee8df]">
                              {image ? (
                                <img
                                  src={
                                    image
                                  }
                                  alt={
                                    product?.name ||
                                    "Product"
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-center text-[10px] uppercase tracking-[0.08em] text-[#978d81]">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 pr-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7655]">
                                {formatType(
                                  product?.type
                                )}
                              </p>

                              <h2 className="mt-1 truncate text-base font-semibold">
                                {product?.name ||
                                  "Unnamed product"}
                              </h2>

                              <p className="mt-1 truncate text-sm text-[#81776c]">
                                {product?.brand ||
                                  "Styleverse"}
                              </p>
                            </div>

                            <span className="text-sm capitalize text-[#625950]">
                              {product
                                ?.categoryId
                                ?.name ||
                                product
                                  ?.category
                                  ?.name ||
                                "—"}
                            </span>

                            <span className="text-sm font-semibold">
                              {money(
                                product?.price
                              )}
                            </span>

                            <span>
                              <span
                                className={[
                                  "inline-flex border px-2.5 py-1 text-[10px] font-semibold",
                                  stock.className,
                                ].join(" ")}
                              >
                                {
                                  stock.label
                                }
                              </span>
                            </span>

                            <span className="text-sm text-[#81776c]">
                              {formatDate(
                                product?.updatedAt ||
                                  product?.createdAt
                              )}
                            </span>

                            <div className="flex justify-end gap-3">
                              <Link
                                to={`/admin/products/${id}/edit`}
                                className="text-xs font-semibold uppercase tracking-[0.11em] underline"
                              >
                                Edit
                              </Link>

                              <button
                                type="button"
                                disabled={
                                  busyId ===
                                  id
                                }
                                onClick={() =>
                                  handleDelete(
                                    product
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.11em] text-red-700 underline disabled:opacity-50"
                              >
                                {busyId ===
                                id
                                  ? "Removing…"
                                  : "Remove"}
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <div className="space-y-3 xl:hidden">
                    {products.map(
                      (product) => {
                        const id =
                          product?._id ||
                          product?.id ||
                          "";

                        const image =
                          getMainImage(
                            product
                          );

                        const stock =
                          stockLabel(
                            product?.stock
                          );

                        return (
                          <article
                            key={id}
                            className="border border-[#1d1916]/10 bg-white p-4 sm:p-5"
                          >
                            <div className="flex gap-4 sm:gap-5">
                              <div className="h-28 w-20 shrink-0 overflow-hidden bg-[#eee8df] sm:h-32 sm:w-24">
                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt={
                                      product?.name ||
                                      "Product"
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full place-items-center px-2 text-center text-[10px] uppercase tracking-[0.08em] text-[#978d81]">
                                    No image
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a7655]">
                                      {formatType(
                                        product?.type
                                      )}
                                    </p>

                                    <h2 className="mt-1 line-clamp-2 text-lg font-semibold">
                                      {product?.name ||
                                        "Unnamed product"}
                                    </h2>

                                    <p className="mt-1 truncate text-sm text-[#81776c]">
                                      {product?.brand ||
                                        "Styleverse"}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-lg font-semibold">
                                    {money(
                                      product?.price
                                    )}
                                  </span>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#70675d]">
                                  <span>
                                    {product
                                      ?.categoryId
                                      ?.name ||
                                      product
                                        ?.category
                                        ?.name ||
                                      "Uncategorized"}
                                  </span>

                                  <span className="text-[#c0b5a9]">
                                    ·
                                  </span>

                                  <span>
                                    {formatDate(
                                      product?.updatedAt ||
                                        product?.createdAt
                                    )}
                                  </span>
                                </div>

                                <div className="mt-3">
                                  <span
                                    className={[
                                      "inline-flex border px-2.5 py-1 text-[10px] font-semibold",
                                      stock.className,
                                    ].join(" ")}
                                  >
                                    {
                                      stock.label
                                    }
                                  </span>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-4 border-t border-[#1d1916]/10 pt-4">
                                  <Link
                                    to={`/admin/products/${id}/edit`}
                                    className="text-xs font-semibold uppercase tracking-[0.12em] underline"
                                  >
                                    Edit product
                                  </Link>

                                  <button
                                    type="button"
                                    disabled={
                                      busyId ===
                                      id
                                    }
                                    onClick={() =>
                                      handleDelete(
                                        product
                                      )
                                    }
                                    className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700 underline disabled:opacity-50"
                                  >
                                    {busyId ===
                                    id
                                      ? "Removing…"
                                      : "Remove"}
                                  </button>
                                </div>
                              </div>
                            </div>
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
    </div>
  );
}