import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { apiForm, apiRequest } from "../../utils/api";

const ADMIN_NAV = [
  ["Dashboard", "/admin"],
  ["Products", "/admin/products"],
  ["Orders", "/admin/orders"],
  ["Coupons", "/admin/coupons"],
  ["Users", "/admin/users"],
  ["Reports", "/admin/reports"],
];

const TYPE_OPTIONS = [
  ["top", "Top"],
  ["bottom", "Bottom"],
  ["dress", "Dress"],
  ["shoes", "Shoes"],
  ["bag", "Bag"],
  ["jewelry", "Jewelry"],
  ["accessory", "Accessory"],
  ["outerwear", "Outerwear"],
];

const GENDER_OPTIONS = [
  ["men", "Men"],
  ["women", "Women"],
  ["kids", "Kids"],
  ["unisex", "Unisex"],
];

const DEFAULT_FORM = {
  name: "",
  slug: "",
  description: "",
  brand: "",
  categoryId: "",
  price: "",
  mrp: "",
  discountPercent: "0",
  stock: "0",
  gender: "unisex",
  type: "top",
  material: "",
  pattern: "",
  status: "active",
  isFeatured: false,
  isNewArrival: false,
  isBestSeller: false,
  isOnSale: false,
  isCustomizable: false,
};

const DEFAULT_SIZES = [
  { size: "S", stock: 0 },
  { size: "M", stock: 0 },
  { size: "L", stock: 0 },
];

const DEFAULT_COLORS = [{ name: "Black", code: "#000000" }];

const inputClass =
  "w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-sm text-[#1d1916] outline-none transition placeholder:text-[#aaa095] focus:border-[#1d1916] focus:bg-white";

function revokePreviewUrls(items) {
  items.forEach((item) => {
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
}

function normalizeCategories(payload) {
  const root = payload?.data ?? payload ?? {};
  const candidates = [root.categories, root.items, root.data, root];
  return candidates.find(Array.isArray) || [];
}

function getId(item) {
  return item?._id || item?.id || "";
}

function formatType(value) {
  return (
    TYPE_OPTIONS.find(([option]) => option === value)?.[1] ||
    String(value || "Product")
  );
}

function Field({ label, required = false, hint = "", children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-[#877d72]">
        {label} {required && <span className="text-[#9a7655]">*</span>}
      </span>
      {children}
      {hint && <span className="mt-2 block text-xs leading-5 text-[#948a80]">{hint}</span>}
    </label>
  );
}

function Section({ eyebrow, title, body = "", children }) {
  return (
    <section className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
      <div className="border-b border-[#1d1916]/10 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.21em] text-[#9a7655]">
          {eyebrow}
        </p>
        <h2
          className="mt-2 text-3xl leading-none tracking-[-0.03em] sm:text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {title}
        </h2>
        {body && <p className="mt-3 max-w-3xl text-sm leading-7 text-[#766d64]">{body}</p>}
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function isHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim());
}

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState(DEFAULT_SIZES);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [keepExistingImages, setKeepExistingImages] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayedExistingImages = keepExistingImages ? existingImages : [];

  const totalPreviewImages = useMemo(
    () => [
      ...displayedExistingImages.map((image, index) => ({
        key: `existing-${image?.url || index}`,
        url: image?.url || "",
        existing: true,
        sourceIndex: index,
      })),
      ...newImages.map((image, index) => ({
        key: `new-${image.file.name}-${image.file.size}-${index}`,
        url: image.previewUrl,
        existing: false,
        sourceIndex: index,
      })),
    ],
    [displayedExistingImages, newImages]
  );

  useEffect(() => {
    return () => revokePreviewUrls(newImages);
  }, [newImages]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await apiRequest("/categories");
        if (!cancelled) setCategories(normalizeCategories(response));
      } catch (err) {
        if (!cancelled) setError(err?.message || "Unable to load categories.");
      }
    }

    async function loadProduct() {
      try {
        const response = await apiRequest(`/admin/products/${id}`);
        const product = response?.data?.product;
        if (!product) throw new Error("Product not found.");
        if (cancelled) return;

        setForm({
          name: product?.name || "",
          slug: product?.slug || "",
          description: product?.description || "",
          brand: product?.brand || "",
          categoryId: product?.categoryId?._id || product?.categoryId || "",
          price: product?.price ?? "",
          mrp: product?.mrp ?? "",
          discountPercent: product?.discountPercent ?? "0",
          stock: product?.stock ?? "0",
          gender: product?.gender || "unisex",
          type: product?.type || "top",
          material: product?.material || "",
          pattern: product?.pattern || "",
          status: product?.status || "active",
          isFeatured: Boolean(product?.isFeatured),
          isNewArrival: Boolean(product?.isNewArrival),
          isBestSeller: Boolean(product?.isBestSeller),
          isOnSale: Boolean(product?.isOnSale),
          isCustomizable: Boolean(product?.isCustomizable),
        });

        setSizes(
          Array.isArray(product?.sizes) && product.sizes.length
            ? product.sizes.map((item) => ({
                size: item?.size || "",
                stock: Number(item?.stock || 0),
              }))
            : DEFAULT_SIZES
        );

        setColors(
          Array.isArray(product?.colors) && product.colors.length
            ? product.colors.map((item) => ({
                name: item?.name || "",
                code: item?.code || "",
              }))
            : DEFAULT_COLORS
        );

        setExistingImages(Array.isArray(product?.images) ? product.images : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Unable to load product.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCategories();
    if (isEdit) loadProduct();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleNameChange(value) {
    setForm((current) => {
      const shouldGenerateSlug = !current.slug || current.slug === toSlug(current.name);
      return {
        ...current,
        name: value,
        slug: shouldGenerateSlug ? toSlug(value) : current.slug,
      };
    });
  }

  function handleImageSelection(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const totalAvailable = displayedExistingImages.length + newImages.length;
    const remaining = Math.max(5 - totalAvailable, 0);

    if (remaining <= 0) {
      setError("A product can have a maximum of 5 images in this form.");
      return;
    }

    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    const accepted = validFiles.slice(0, remaining).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (validFiles.length !== files.length) {
      setError("Only image files are allowed.");
    } else if (accepted.length < files.length) {
      setError("Only 5 images can be kept in the product gallery.");
    } else {
      setError("");
    }

    setNewImages((current) => [...current, ...accepted]);
  }

  function removeNewImage(index) {
    setNewImages((current) => {
      const item = current[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function removeExistingImage(index) {
    setExistingImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleRemovePreview(image) {
    if (image.existing) removeExistingImage(image.sourceIndex);
    else removeNewImage(image.sourceIndex);

    setMainImageIndex((current) => {
      if (totalPreviewImages.length <= 1) return 0;
      return Math.min(current, totalPreviewImages.length - 2);
    });
  }

  function addSize() {
    setSizes((current) => [...current, { size: "", stock: 0 }]);
  }

  function removeSize(index) {
    setSizes((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function updateSize(index, field, value) {
    setSizes((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: field === "stock" ? Number(value || 0) : value }
          : row
      )
    );
  }

  function addColor() {
    setColors((current) => [...current, { name: "", code: "#000000" }]);
  }

  function removeColor(index) {
    setColors((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function updateColor(index, field, value) {
    setColors((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function validate() {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.slug.trim()) return "Slug is required.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return "Slug must use lowercase letters, numbers and hyphens only.";
    }
    if (!form.description.trim()) return "Description is required.";
    if (!form.categoryId) return "Please select a category.";

    const price = Number(form.price);
    const mrp = form.mrp === "" ? null : Number(form.mrp);
    const discount = Number(form.discountPercent);
    const stock = Number(form.stock);

    if (!Number.isFinite(price) || price < 0) return "Please enter a valid selling price.";
    if (mrp !== null && (!Number.isFinite(mrp) || mrp < 0)) return "Please enter a valid MRP.";
    if (mrp !== null && mrp > 0 && price > mrp) return "Selling price cannot be greater than MRP.";
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) return "Discount must be between 0 and 100%.";
    if (!Number.isFinite(stock) || stock < 0) return "Please enter valid stock.";

    const cleanedSizes = sizes.filter((item) => String(item?.size || "").trim());
    if (cleanedSizes.some((item) => Number(item.stock) < 0)) return "Size stock cannot be negative.";

    const cleanedColors = colors.filter((item) => String(item?.name || "").trim());
    if (cleanedColors.some((item) => item.code && !isHexColor(item.code))) {
      return "Color codes must be valid HEX values such as #000000.";
    }

    const duplicateSizes = new Set();
    for (const item of cleanedSizes) {
      const key = String(item.size).trim().toLowerCase();
      if (duplicateSizes.has(key)) return "Each size can appear only once.";
      duplicateSizes.add(key);
    }

    if (!isEdit && newImages.length === 0) return "Please select at least one product image.";
    if (!totalPreviewImages.length) return "Please keep at least one product image.";
    if (newImages.length + displayedExistingImages.length > 5) {
      return "A maximum of 5 images can be kept in the product gallery.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const safeMainImageIndex = Math.min(
      Math.max(Number(mainImageIndex) || 0, 0),
      totalPreviewImages.length - 1
    );

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("slug", form.slug.trim());
    payload.append("description", form.description.trim());
    payload.append("brand", form.brand.trim());
    payload.append("categoryId", form.categoryId);
    payload.append("price", String(form.price));
    payload.append("mrp", form.mrp === "" ? "" : String(form.mrp));
    payload.append("discountPercent", String(form.discountPercent || 0));
    payload.append("stock", String(form.stock));
    payload.append("gender", form.gender);
    payload.append("type", form.type);
    payload.append("material", form.material.trim());
    payload.append("pattern", form.pattern.trim());
    payload.append("status", form.status);
    payload.append("sizes", JSON.stringify(sizes.filter((item) => String(item?.size || "").trim())));
    payload.append("colors", JSON.stringify(colors.filter((item) => String(item?.name || "").trim())));
    payload.append("isFeatured", String(Boolean(form.isFeatured)));
    payload.append("isNewArrival", String(Boolean(form.isNewArrival)));
    payload.append("isBestSeller", String(Boolean(form.isBestSeller)));
    payload.append("isOnSale", String(Boolean(form.isOnSale)));
    payload.append("isCustomizable", String(Boolean(form.isCustomizable)));
    payload.append("mainImageIndex", String(safeMainImageIndex));

    if (isEdit) {
      payload.append("keepExistingImages", String(keepExistingImages));
    }

    newImages.forEach(({ file }) => payload.append("images", file));

    try {
      setSaving(true);
      await apiForm(isEdit ? `/admin/products/${id}` : "/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        formData: payload,
      });

      setSuccess(isEdit ? "Product updated successfully." : "Product created successfully.");
      window.setTimeout(() => navigate("/admin/products"), 700);
    } catch (err) {
      setError(err?.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f3ec] animate-pulse">
        <div className="h-24 border-b border-[#1d1916]/10 bg-white" />
        <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-10">
          <div className="h-3 w-36 bg-[#e7dfd4]" />
          <div className="mt-4 h-14 w-80 bg-[#e7dfd4]" />
          <div className="mt-10 h-[700px] bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[#1d1916]/10 bg-[#eee7dc] lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-[#1d1916]/10 px-6 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7655]">Styleverse</p>
              <h2 className="mt-2 text-3xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Admin.</h2>
              <p className="mt-2 text-sm text-[#81776c]">Catalogue editor</p>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {ADMIN_NAV.map(([label, to]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
                  className={({ isActive }) =>
                    [
                      "flex items-center justify-between px-4 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] transition",
                      isActive ? "bg-[#1d1916] text-[#f7f3ec]" : "text-[#665d54] hover:bg-[#f7f3ec]",
                    ].join(" ")
                  }
                >
                  <span>{label}</span>
                  {label === "Products" && <span className="text-xs">•</span>}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-[#1d1916]/10 p-5">
              <Link to="/admin/products" className="text-xs font-semibold uppercase tracking-[0.14em] underline">
                ← Products
              </Link>
              <Link to="/" className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-[#82786c] underline">
                View store →
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-[#1d1916]/10 bg-[#f7f3ec]">
            <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                    Styleverse / Administration / Products
                  </p>
                  <h1
                    className="mt-3 text-5xl leading-none tracking-[-0.045em] sm:text-6xl lg:text-7xl"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {isEdit ? "Edit the piece." : "Add a new piece."}
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#70685f]">
                    Build a complete catalogue entry with imagery, variants, pricing and merchandising controls.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to="/admin/products" className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
                    Back to products
                  </Link>
                  <Link to="/" className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]">
                    View store
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto lg:hidden">
                {ADMIN_NAV.map(([label, to]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/admin"}
                    className={({ isActive }) =>
                      [
                        "shrink-0 border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.11em]",
                        isActive ? "border-[#1d1916] bg-[#1d1916] text-[#f7f3ec]" : "border-[#1d1916]/15 bg-white text-[#655c53]",
                      ].join(" ")
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            {(error || success) && (
              <div
                className={[
                  "mb-7 flex flex-wrap items-center justify-between gap-4 border px-4 py-4 text-sm",
                  error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                ].join(" ")}
              >
                <span>{error || success}</span>
                {error && <button type="button" onClick={() => setError("")} className="text-sm font-semibold underline">Dismiss</button>}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-7">
              <Section
                eyebrow="01 / Product imagery"
                title="Make the first impression count."
                body="Keep the gallery focused and image-led. The backend uploads selected files to Cloudinary automatically."
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {totalPreviewImages.map((image, index) => (
                    <article key={image.key} className="overflow-hidden border border-[#1d1916]/10 bg-[#f8f4ed]">
                      <div className="aspect-[4/5] overflow-hidden bg-[#ebe4da]">
                        {image.url ? (
                          <img src={image.url} alt={`Product preview ${index + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center px-5 text-center text-xs uppercase tracking-[0.12em] text-[#9a9085]">No preview</div>
                        )}
                      </div>
                      <div className="border-t border-[#1d1916]/10 p-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[#5f574f]">
                          <input
                            type="radio"
                            name="mainImage"
                            checked={mainImageIndex === index}
                            onChange={() => setMainImageIndex(index)}
                            className="accent-[#1d1916]"
                          />
                          Main image
                        </label>
                        <button type="button" onClick={() => handleRemovePreview(image)} className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700 underline">
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}

                  {totalPreviewImages.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-[4/5] flex-col items-center justify-center border border-dashed border-[#1d1916]/25 bg-white px-5 text-center transition hover:border-[#1d1916] hover:bg-[#fbf8f3]"
                    >
                      <span className="text-4xl font-light">＋</span>
                      <span className="mt-3 text-xs font-semibold uppercase tracking-[0.15em]">Select images</span>
                      <span className="mt-2 text-xs leading-5 text-[#90867b]">PNG / JPG / WEBP<br />up to 5 total</span>
                    </button>
                  )}

                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelection} className="hidden" />
                </div>

                {isEdit && (
                  <label className="mt-6 flex items-start gap-3 border border-[#1d1916]/10 bg-[#fcfaf6] p-4 text-sm text-[#61584f]">
                    <input
                      type="checkbox"
                      checked={keepExistingImages}
                      onChange={(event) => {
                        setKeepExistingImages(event.target.checked);
                        setMainImageIndex(0);
                      }}
                      className="mt-0.5 h-4 w-4 accent-[#1d1916]"
                    />
                    <span>
                      <span className="block font-semibold">Keep existing images</span>
                      <span className="mt-1 block text-xs leading-5 text-[#91877d]">Turn this off to replace the current gallery with newly uploaded images.</span>
                    </span>
                  </label>
                )}

                <p className="mt-4 text-xs text-[#8d8378]">
                  Gallery: {totalPreviewImages.length}/5 images · Main image: {totalPreviewImages.length ? mainImageIndex + 1 : 0}
                </p>
              </Section>

              <Section eyebrow="02 / Identity" title="Give the product a clear identity.">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Product name" required>
                    <input className={inputClass} value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Premium Oversized T-Shirt" />
                  </Field>
                  <Field label="Slug" required hint="Used in the product URL. Keep it lowercase and hyphenated.">
                    <div className="flex">
                      <input className={`${inputClass} min-w-0`} value={form.slug} onChange={(e) => setField("slug", toSlug(e.target.value))} placeholder="premium-oversized-t-shirt" />
                      <button type="button" onClick={() => setField("slug", toSlug(form.name))} className="ml-2 shrink-0 border border-[#1d1916]/15 bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.12em]">Auto</button>
                    </div>
                  </Field>
                  <Field label="Brand">
                    <input className={inputClass} value={form.brand} onChange={(e) => setField("brand", e.target.value)} placeholder="Styleverse" />
                  </Field>
                  <Field label="Category" required>
                    <select className={inputClass} value={form.categoryId} onChange={(e) => setField("categoryId", e.target.value)}>
                      <option value="">Select category</option>
                      {categories.map((category) => {
                        const categoryId = getId(category);
                        return <option key={categoryId} value={categoryId}>{category?.name || "Category"}</option>;
                      })}
                    </select>
                  </Field>
                  <Field label="Product type" required>
                    <select className={inputClass} value={form.type} onChange={(e) => setField("type", e.target.value)}>
                      {TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Gender">
                    <select className={inputClass} value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                      {GENDER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Material">
                    <input className={inputClass} value={form.material} onChange={(e) => setField("material", e.target.value)} placeholder="Cotton" />
                  </Field>
                  <Field label="Pattern">
                    <input className={inputClass} value={form.pattern} onChange={(e) => setField("pattern", e.target.value)} placeholder="Solid" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description" required>
                      <textarea className={`${inputClass} min-h-40 resize-y`} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Describe fabric, fit, styling and care details." />
                    </Field>
                  </div>
                </div>
              </Section>

              <Section eyebrow="03 / Commercials" title="Set price, value and availability.">
                <div className="grid gap-6 sm:grid-cols-4">
                  <Field label="Selling price" required>
                    <input type="number" min="0" step="0.01" className={inputClass} value={form.price} onChange={(e) => setField("price", e.target.value)} />
                  </Field>
                  <Field label="MRP" hint="Optional reference price shown to customers.">
                    <input type="number" min="0" step="0.01" className={inputClass} value={form.mrp} onChange={(e) => setField("mrp", e.target.value)} />
                  </Field>
                  <Field label="Discount %">
                    <input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.discountPercent} onChange={(e) => setField("discountPercent", e.target.value)} />
                  </Field>
                  <Field label="Total stock" required>
                    <input type="number" min="0" step="1" className={inputClass} value={form.stock} onChange={(e) => setField("stock", e.target.value)} />
                  </Field>
                </div>

                <div className="mt-7 grid gap-4 border-t border-[#1d1916]/10 pt-6 sm:grid-cols-3">
                  <div className="border border-[#1d1916]/10 bg-[#fbf8f3] p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a7655]">Selling price</p>
                    <p className="mt-2 text-2xl font-semibold">₹{Number(form.price || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="border border-[#1d1916]/10 bg-[#fbf8f3] p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a7655]">MRP</p>
                    <p className="mt-2 text-2xl font-semibold">₹{Number(form.mrp || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="border border-[#1d1916]/10 bg-[#fbf8f3] p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a7655]">Discount</p>
                    <p className="mt-2 text-2xl font-semibold">{Number(form.discountPercent || 0).toLocaleString("en-IN")}%</p>
                  </div>
                </div>
              </Section>

              <Section eyebrow="04 / Variants" title="Keep every choice inventory-ready." body="Size and color data is stored with the product and sent to the backend as JSON arrays.">
                <div className="grid gap-8 xl:grid-cols-2">
                  <div>
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">Sizes</h3>
                        <p className="mt-1 text-xs text-[#8f857a]">Optional size-level stock.</p>
                      </div>
                      <button type="button" onClick={addSize} className="border border-[#1d1916] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]">+ Add size</button>
                    </div>
                    <div className="space-y-3">
                      {sizes.map((item, index) => (
                        <div key={`${index}-${item.size}`} className="grid grid-cols-[1fr_130px_auto] gap-3">
                          <input className={inputClass} value={item.size} onChange={(e) => updateSize(index, "size", e.target.value)} placeholder="M" />
                          <input type="number" min="0" step="1" className={inputClass} value={item.stock} onChange={(e) => updateSize(index, "stock", e.target.value)} placeholder="0" />
                          <button type="button" onClick={() => removeSize(index)} className="border border-red-200 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">Colors</h3>
                        <p className="mt-1 text-xs text-[#8f857a]">Name plus optional HEX code.</p>
                      </div>
                      <button type="button" onClick={addColor} className="border border-[#1d1916] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]">+ Add color</button>
                    </div>
                    <div className="space-y-3">
                      {colors.map((item, index) => (
                        <div key={`${index}-${item.name}`} className="grid grid-cols-[1fr_170px_auto] gap-3">
                          <input className={inputClass} value={item.name} onChange={(e) => updateColor(index, "name", e.target.value)} placeholder="Black" />
                          <div className="flex gap-2">
                            <input type="color" value={isHexColor(item.code) ? item.code : "#000000"} onChange={(e) => updateColor(index, "code", e.target.value)} className="h-12 w-12 shrink-0 border border-[#1d1916]/15 bg-white p-1" aria-label={`Color ${index + 1}`} />
                            <input className={inputClass} value={item.code} onChange={(e) => updateColor(index, "code", e.target.value)} placeholder="#000000" />
                          </div>
                          <button type="button" onClick={() => removeColor(index)} className="border border-red-200 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-700">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              <Section eyebrow="05 / Merchandising" title="Decide where this piece belongs in the store." body="These flags control how the product can be surfaced across the Styleverse storefront and customization experiences.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["isFeatured", "Featured", "Show in featured merchandising."],
                    ["isNewArrival", "New arrival", "Use in new-season collections."],
                    ["isBestSeller", "Best seller", "Mark as a best-selling item."],
                    ["isOnSale", "On sale", "Use sale merchandising surfaces."],
                    ["isCustomizable", "Customizable", "Allow this product as a Studio base."],
                  ].map(([field, label, description]) => (
                    <label key={field} className="flex items-start gap-3 border border-[#1d1916]/10 bg-[#fcfaf6] p-4">
                      <input type="checkbox" checked={Boolean(form[field])} onChange={(e) => setField(field, e.target.checked)} className="mt-1 h-4 w-4 accent-[#1d1916]" />
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#8f857a]">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-6 max-w-sm">
                  <Field label="Catalogue status">
                    <select className={inputClass} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Field>
                </div>
              </Section>

              <div className="sticky bottom-4 z-10 border border-[#1d1916]/10 bg-[#f7f3ec]/95 p-4 backdrop-blur sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7655]">Ready to publish</p>
                    <p className="mt-1 text-sm text-[#756c63]">Review images, price and variants before saving.</p>
                  </div>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Link to="/admin/products" className="border border-[#1d1916]/20 bg-white px-6 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em]">Cancel</Link>
                    <button type="submit" disabled={saving} className="border border-[#1d1916] bg-[#1d1916] px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f7f3ec] disabled:cursor-not-allowed disabled:opacity-50">
                      {saving ? "Saving & uploading…" : isEdit ? "Update product" : "Create product"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}