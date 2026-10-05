import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiJson, apiRequest, getAuthToken } from "../utils/api";

const CATEGORY_ORDER = [
  "top",
  "bottom",
  "jacket",
  "outerwear",
  "dress",
  "shoes",
  "accessory",
];

const CATEGORY_LABELS = {
  top: "Tops",
  bottom: "Bottoms",
  jacket: "Jackets",
  outerwear: "Outerwear",
  dress: "Dresses",
  shoes: "Shoes",
  accessory: "Accessories",
};

const COLOR_OPTIONS = [
  { label: "Ivory", value: "#f5efe4" },
  { label: "Black", value: "#191716" },
  { label: "Charcoal", value: "#49433e" },
  { label: "Mocha", value: "#836b5b" },
  { label: "Rose", value: "#b27d87" },
  { label: "Plum", value: "#6d4c60" },
  { label: "Sage", value: "#8b987f" },
  { label: "Sky", value: "#89a8bd" },
  { label: "Cobalt", value: "#365f9c" },
];

const PATTERN_OPTIONS = [
  { label: "Solid", value: "solid" },
  { label: "Fine stripes", value: "stripes" },
  { label: "Checks", value: "checks" },
  { label: "Floral", value: "floral" },
  { label: "Micro dots", value: "dots" },
];

const SLEEVE_OPTIONS = [
  { label: "Short", value: "short" },
  { label: "Long", value: "long" },
  { label: "Sleeveless", value: "sleeveless" },
  { label: "Statement", value: "statement" },
];

const NECK_OPTIONS = [
  { label: "Round", value: "round" },
  { label: "V-neck", value: "v-neck" },
  { label: "Collar", value: "collar" },
  { label: "Square", value: "square" },
];

const LENGTH_OPTIONS = [
  { label: "Crop", value: "crop" },
  { label: "Regular", value: "regular" },
  { label: "Long", value: "long" },
  { label: "Extended", value: "extended" },
];

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

const EMPTY_MEASUREMENTS = {
  chest: "",
  waist: "",
  hip: "",
  shoulder: "",
  sleeve: "",
  length: "",
};

function unwrap(response) {
  return response?.data ?? response ?? {};
}

function asArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function getId(value) {
  return value?._id || value?.id || value?.baseProductId?._id || value?.baseProductId?.id || "";
}

function normalizeImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image?.url || image?.secure_url || image?.src || "";
}

function getImages(item) {
  const raw = asArray(item?.images, item?.imageUrls, item?.gallery);
  return raw.map(normalizeImage).filter(Boolean);
}

function getMainImage(item) {
  const main = asArray(item?.images).find((image) => image?.isMain);
  return normalizeImage(main) || getImages(item)[0] || normalizeImage(item?.image) || "";
}

function getBaseType(item) {
  const raw = String(
    item?.baseItemType ||
      item?.type ||
      item?.category?.type ||
      item?.category?.slug ||
      item?.category?.name ||
      "top"
  ).toLowerCase();

  if (raw.includes("outer")) return "outerwear";
  if (raw.includes("jacket") || raw.includes("blazer")) return "jacket";
  if (raw.includes("bottom") || raw.includes("pant") || raw.includes("jean") || raw.includes("skirt")) return "bottom";
  if (raw.includes("dress")) return "dress";
  if (raw.includes("shoe") || raw.includes("foot")) return "shoes";
  if (raw.includes("access")) return "accessory";
  if (raw.includes("top") || raw.includes("shirt") || raw.includes("tee") || raw.includes("tshirt") || raw.includes("hood")) return "top";

  return CATEGORY_ORDER.includes(raw) ? raw : "top";
}

function normalizeBaseItems(response) {
  const root = unwrap(response);
  const source = asArray(
    root?.baseItems,
    root?.items,
    root?.products,
    root?.data,
    root?.results,
    root
  );

  return source
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const product = item?.product || item;
      return {
        ...product,
        _studioType: getBaseType(item),
        _studioId: getId(item) || getId(product),
      };
    })
    .filter((item) => item._studioId);
}

function normalizeDesignId(response) {
  const root = unwrap(response);
  const design = root?.design || root?.customDesign || root;
  return design?._id || design?.id || root?._id || root?.id || "";
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function patternMarkup(pattern, color) {
  if (pattern === "stripes") {
    return `<pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><rect width="12" height="24" fill="${escapeXml(color)}" opacity="0.18"/><rect x="12" width="12" height="24" fill="#fff" opacity="0.18"/></pattern>`;
  }

  if (pattern === "checks") {
    return `<pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${escapeXml(color)}" opacity="0.15"/><rect x="14" y="14" width="14" height="14" fill="${escapeXml(color)}" opacity="0.15"/></pattern>`;
  }

  if (pattern === "floral") {
    return `<pattern id="p" width="54" height="54" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="5" fill="#fff" opacity="0.24"/><circle cx="20" cy="8" r="5" fill="#fff" opacity="0.16"/><circle cx="8" cy="8" r="5" fill="#fff" opacity="0.16"/><path d="M13 17c4 6 7 9 11 10" stroke="#fff" stroke-opacity="0.18" stroke-width="2" fill="none"/></pattern>`;
  }

  if (pattern === "dots") {
    return `<pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill="#fff" opacity="0.24"/><circle cx="14" cy="14" r="2" fill="#fff" opacity="0.24"/></pattern>`;
  }

  return `<pattern id="p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="transparent"/></pattern>`;
}

function buildPreviewDataUrl({ image, color, pattern }) {
  const safeImage = escapeXml(image);
  const safeColor = escapeXml(color);
  const patternId = "p";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="720" height="900" viewBox="0 0 720 900">
      <rect width="720" height="900" fill="#f3eee6"/>
      <defs>${patternMarkup(pattern, color)}</defs>
      <image x="75" y="35" width="570" height="830" preserveAspectRatio="xMidYMid meet" href="${safeImage}" xlink:href="${safeImage}"/>
      <rect x="75" y="35" width="570" height="830" fill="${safeColor}" opacity="0.16" style="mix-blend-mode:multiply"/>
      <rect x="75" y="35" width="570" height="830" fill="url(#${patternId})"/>
      <rect x="20" y="20" width="680" height="860" rx="10" fill="none" stroke="#1d1916" stroke-opacity="0.08"/>
      <text x="42" y="845" fill="#5e574f" font-family="Georgia, Times New Roman, serif" font-size="16">STYLEVERSE / CUSTOM STUDIO</text>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function displayValue(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function InlineStatus({ type = "message", children }) {
  if (!children) return null;

  const className =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div role="status" className={`border px-4 py-3 text-sm leading-6 ${className}`}>
      {children}
    </div>
  );
}

function StudioSkeleton() {
  return (
    <section className="min-h-screen bg-[#f7f3ec] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="h-6 w-32 bg-[#e5ddd3]" />
        <div className="mt-5 h-14 max-w-xl bg-[#e5ddd3]" />
        <div className="mt-12 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
          <div className="h-[680px] bg-white" />
          <div className="h-[680px] bg-white" />
          <div className="h-[680px] bg-white" />
        </div>
      </div>
    </section>
  );
}

export default function Studio() {
  const navigate = useNavigate();
  const token = getAuthToken();

  const [baseItems, setBaseItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("top");
  const [selectedBaseItem, setSelectedBaseItem] = useState(null);
  const [angleIndex, setAngleIndex] = useState(0);
  const [attributes, setAttributes] = useState({
    color: COLOR_OPTIONS[0].value,
    colorName: COLOR_OPTIONS[0].label,
    pattern: "solid",
    sleeveStyle: "short",
    neckDesign: "round",
    length: "regular",
    size: "M",
    measurements: { ...EMPTY_MEASUREMENTS },
  });
  const [quantity, setQuantity] = useState(1);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBaseItems = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/studio/base-items");
      const normalized = normalizeBaseItems(response);
      setBaseItems(normalized);

      if (!normalized.length) {
        setSelectedBaseItem(null);
        return;
      }

      const preferred =
        normalized.find((item) => item._studioType === "top") || normalized[0];

      setSelectedBaseItem(preferred);
      setActiveCategory(preferred._studioType);
    } catch (err) {
      setBaseItems([]);
      setSelectedBaseItem(null);
      setError(err?.message || "Could not load customizable base items.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBaseItems();
  }, [loadBaseItems]);

  useEffect(() => {
    setAngleIndex(0);
    setSavedDesignId("");
    setMessage("");
  }, [selectedBaseItem]);

  const categories = useMemo(() => {
    const available = new Set(baseItems.map((item) => item._studioType));
    return CATEGORY_ORDER.filter((item) => available.has(item));
  }, [baseItems]);

  const filteredBaseItems = useMemo(
    () => baseItems.filter((item) => item._studioType === activeCategory),
    [activeCategory, baseItems]
  );

  useEffect(() => {
    if (!filteredBaseItems.length) return;
    if (!selectedBaseItem || selectedBaseItem._studioType !== activeCategory) {
      setSelectedBaseItem(filteredBaseItems[0]);
    }
  }, [activeCategory, filteredBaseItems, selectedBaseItem]);

  const images = useMemo(
    () => getImages(selectedBaseItem).length
      ? getImages(selectedBaseItem)
      : [getMainImage(selectedBaseItem)].filter(Boolean),
    [selectedBaseItem]
  );

  const activeImage = images[angleIndex] || images[0] || "";

  const previewUrl = useMemo(
    () => buildPreviewDataUrl({
      image: activeImage,
      color: attributes.color,
      pattern: attributes.pattern,
    }),
    [activeImage, attributes.color, attributes.pattern]
  );

  const displayedPrice = Number(
    selectedBaseItem?.price ?? selectedBaseItem?.basePrice ?? 0
  ) || 0;

  const mrp = Number(selectedBaseItem?.mrp || selectedBaseItem?.originalPrice || 0) || 0;
  const stock = Number(selectedBaseItem?.stock ?? 0) || 0;

  const updateAttribute = (key, value) => {
    setSavedDesignId("");
    setMessage("");
    setAttributes((current) => ({ ...current, [key]: value }));
  };

  const updateMeasurements = (key, value) => {
    setSavedDesignId("");
    setAttributes((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        [key]: value.replace(/[^0-9.]/g, "").slice(0, 6),
      },
    }));
  };

  const selectColor = (color) => {
    setSavedDesignId("");
    setMessage("");
    setAttributes((current) => ({
      ...current,
      color: color.value,
      colorName: color.label,
    }));
  };

  const saveDesign = async ({ addToCart = false } = {}) => {
    if (!getAuthToken()) {
      navigate("/login", { state: { from: "/studio" } });
      return "";
    }

    if (!selectedBaseItem?._studioId) {
      setError("Please select a base item first.");
      return "";
    }

    setBusyAction(addToCart ? "cart" : "save");
    setError("");
    setMessage("");

    try {
      const payload = {
        baseProductId: selectedBaseItem._studioId,
        baseItemType: selectedBaseItem._studioType,
        title: `${displayValue(selectedBaseItem?.name || "Custom garment")} / ${attributes.colorName}`,
        attributes: {
          color: attributes.color,
          colorName: attributes.colorName,
          pattern: attributes.pattern,
          sleeveStyle: attributes.sleeveStyle,
          neckDesign: attributes.neckDesign,
          length: attributes.length,
          size: attributes.size,
          measurements: attributes.measurements,
        },
        previewImageUrl: previewUrl,
        price: displayedPrice,
      };

      const response = await apiJson("/custom-designs", {
        method: "POST",
        data: payload,
      });

      const designId = normalizeDesignId(response);
      if (!designId) {
        throw new Error("Design was saved but no design ID was returned.");
      }

      setSavedDesignId(designId);

      if (addToCart) {
        await apiJson("/cart", {
          method: "POST",
          data: {
            customDesignId: designId,
            quantity,
          },
        });

        setMessage("Your custom design was saved and added to the bag.");
      } else {
        setMessage("Design saved to your Styleverse account.");
      }

      return designId;
    } catch (err) {
      setError(err?.message || "Could not save this custom design.");
      return "";
    } finally {
      setBusyAction("");
    }
  };

  const addToCart = async () => {
    if (!getAuthToken()) {
      navigate("/login", { state: { from: "/studio" } });
      return;
    }

    if (savedDesignId) {
      setBusyAction("cart");
      setError("");
      setMessage("");

      try {
        await apiJson("/cart", {
          method: "POST",
          data: {
            customDesignId: savedDesignId,
            quantity,
          },
        });
        setMessage("Your saved custom design was added to the bag.");
      } catch (err) {
        setError(err?.message || "Could not add this design to your bag.");
      } finally {
        setBusyAction("");
      }
      return;
    }

    await saveDesign({ addToCart: true });
  };

  if (loading) {
    return <StudioSkeleton />;
  }

  if (!token) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#9a7655]">
            Styleverse / Custom Outfit Studio
          </p>
          <h1
            className="mt-5 text-5xl leading-[0.98] tracking-[-0.04em] sm:text-6xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Your garment.<br />Your edit.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#6f665d]">
            Sign in to customize a garment, save your design and carry it into your Styleverse bag.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              state={{ from: "/studio" }}
              className="border border-[#1d1916] bg-[#1d1916] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#332c27]"
            >
              Sign in to Studio
            </Link>
            <Link
              to="/shop"
              className="border border-[#1d1916]/15 bg-white px-7 py-3.5 text-sm font-semibold text-[#1d1916] hover:bg-[#faf8f4]"
            >
              Browse collection
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <section className="border-b border-[#1d1916]/10 bg-[#efe8dd]">
        <div className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 lg:px-12 xl:px-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a7655]">
                Styleverse / Custom Outfit Studio
              </p>
              <h1
                className="mt-3 max-w-3xl text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Design one garment,<br className="hidden sm:block" /> make it yours.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#6f665d] sm:text-lg">
                Start with a customizable base item, refine its colour and pattern, then shape the style details before saving the finished design.
              </p>
            </div>

            <div className="max-w-sm border-l border-[#1d1916]/10 pl-5 text-sm leading-6 text-[#6f665d]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">Creative brief</p>
              <p className="mt-2">
                Choose a base first. Every edit on this page belongs to that single garment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
        {error ? <InlineStatus type="error">{error}</InlineStatus> : null}
        {message ? <div className="mt-3"><InlineStatus type="success">{message}</InlineStatus></div> : null}

        {!baseItems.length ? (
          <div className="mt-8 border border-dashed border-[#1d1916]/15 bg-white px-6 py-16 text-center">
            <p
              className="text-3xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              No customizable base items yet.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#6f665d]">
              The Studio is connected to the customizable base-item API, but it did not return a template yet.
            </p>
            <button
              type="button"
              onClick={loadBaseItems}
              className="mt-7 border border-[#1d1916] bg-[#1d1916] px-6 py-3 text-sm font-semibold text-white hover:bg-[#332c27]"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)_370px]">
            {/* BASE ITEMS */}
            <aside className="border border-[#1d1916]/10 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">01 / Base</p>
                  <h2
                    className="mt-2 text-3xl"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    Start here
                  </h2>
                </div>
                <span className="text-xs text-[#8b8177]">{baseItems.length}</span>
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 lg:overflow-visible">
                {categories.map((category) => {
                  const active = category === activeCategory;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`shrink-0 border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.11em] transition ${
                        active
                          ? "border-[#1d1916] bg-[#1d1916] text-white"
                          : "border-[#1d1916]/10 bg-[#faf8f4] text-[#554d47] hover:border-[#1d1916]/25"
                      }`}
                    >
                      {CATEGORY_LABELS[category] || displayValue(category)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3 lg:max-h-[655px] lg:overflow-y-auto lg:pr-1">
                {filteredBaseItems.map((item) => {
                  const active = item._studioId === selectedBaseItem?._studioId;
                  const image = getMainImage(item);
                  return (
                    <button
                      key={item._studioId}
                      type="button"
                      onClick={() => setSelectedBaseItem(item)}
                      className={`group w-full border p-2 text-left transition ${
                        active
                          ? "border-[#1d1916] bg-[#f8f4ee]"
                          : "border-[#1d1916]/10 bg-white hover:border-[#1d1916]/25"
                      }`}
                      aria-pressed={active}
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-[#eee8df]">
                        {image ? (
                          <img
                            src={image}
                            alt={item?.name || "Customizable base item"}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-4 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-[#90877c]">
                            Image unavailable
                          </div>
                        )}
                      </div>
                      <div className="px-1 pb-1 pt-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                          {CATEGORY_LABELS[item._studioType] || "Base item"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#28231f]">
                          {item?.name || "Untitled template"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* PREVIEW */}
            <section className="border border-[#1d1916]/10 bg-[#eee7dc] p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">02 / Preview</p>
                  <h2
                    className="mt-2 text-3xl sm:text-4xl"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    See the edit
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="self-start border border-[#1d1916]/15 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] hover:border-[#1d1916]/30 sm:self-auto"
                >
                  Open full preview
                </button>
              </div>

              <div className="mx-auto mt-7 max-w-[720px] bg-[#f7f3ec] p-3 shadow-[0_28px_80px_rgba(29,25,22,0.10)] sm:p-5">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#e9e1d6]">
                  {activeImage ? (
                    <>
                      <img
                        src={activeImage}
                        alt={selectedBaseItem?.name || "Selected customizable garment"}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div
                        className="absolute inset-0 opacity-[0.24] mix-blend-multiply transition-all duration-300"
                        style={{ backgroundColor: attributes.color }}
                      />
                      {attributes.pattern !== "solid" ? (
                        <div
                          className="absolute inset-0 opacity-[0.30]"
                          style={{
                            backgroundImage:
                              attributes.pattern === "stripes"
                                ? `repeating-linear-gradient(35deg, transparent 0, transparent 20px, rgba(255,255,255,.32) 21px, rgba(255,255,255,.32) 30px)`
                                : attributes.pattern === "checks"
                                ? `linear-gradient(90deg, rgba(255,255,255,.16) 50%, transparent 50%), linear-gradient(rgba(255,255,255,.16) 50%, transparent 50%)`
                                : attributes.pattern === "dots"
                                ? `radial-gradient(circle at 6px 6px, rgba(255,255,255,.34) 0 2px, transparent 2.5px)`
                                : attributes.pattern === "floral"
                                ? `radial-gradient(circle at 20% 25%, rgba(255,255,255,.45) 0 5px, transparent 6px), radial-gradient(circle at 28% 18%, rgba(255,255,255,.32) 0 5px, transparent 6px), radial-gradient(circle at 66% 48%, rgba(255,255,255,.38) 0 5px, transparent 6px), radial-gradient(circle at 74% 42%, rgba(255,255,255,.3) 0 5px, transparent 6px)`
                                : "none",
                              backgroundSize:
                                attributes.pattern === "stripes"
                                  ? "auto"
                                  : attributes.pattern === "checks"
                                  ? "28px 28px"
                                  : attributes.pattern === "dots"
                                  ? "20px 20px"
                                  : "54px 54px",
                            backgroundColor:
                              attributes.pattern === "floral"
                                ? "rgba(255,255,255,.08)"
                                : "transparent",
                          }}
                        >
                          {attributes.pattern === "floral" ? (
                            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 20% 25%, rgba(255,255,255,.45) 0 5px, transparent 6px), radial-gradient(circle at 28% 18%, rgba(255,255,255,.32) 0 5px, transparent 6px), radial-gradient(circle at 66% 48%, rgba(255,255,255,.38) 0 5px, transparent 6px), radial-gradient(circle at 74% 42%, rgba(255,255,255,.3) 0 5px, transparent 6px)", backgroundSize: "92px 92px" }} />
                          ) : null}
                        </div>
                      ) : null}
                      <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4e463f] sm:inset-x-5">
                        <span className="border border-[#1d1916]/10 bg-[#f7f3ec]/90 px-3 py-2 backdrop-blur">
                          {displayValue(attributes.length)} cut
                        </span>
                        <span className="border border-[#1d1916]/10 bg-[#f7f3ec]/90 px-3 py-2 backdrop-blur">
                          {displayValue(attributes.neckDesign)} neck
                        </span>
                      </div>
                      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 sm:inset-x-5">
                        <div className="border border-[#1d1916]/10 bg-[#f7f3ec]/90 px-3 py-2.5 backdrop-blur">
                          <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b8177]">Colour</p>
                          <p className="mt-1 text-[11px] font-semibold">{attributes.colorName}</p>
                        </div>
                        <div className="border border-[#1d1916]/10 bg-[#f7f3ec]/90 px-3 py-2.5 backdrop-blur">
                          <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b8177]">Pattern</p>
                          <p className="mt-1 text-[11px] font-semibold">{displayValue(attributes.pattern)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid h-full place-items-center px-8 text-center">
                      <div>
                        <p
                          className="text-2xl"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                        >
                          Choose a base item
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#746a61]">
                          Your selected garment preview will appear here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {images.length > 1 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                      {images.slice(0, 4).map((image, index) => (
                        <button
                          type="button"
                          key={`${image}-${index}`}
                          onClick={() => setAngleIndex(index)}
                          className={`h-14 w-12 overflow-hidden border ${
                            angleIndex === index ? "border-[#1d1916]" : "border-[#1d1916]/10"
                          }`}
                          aria-label={`Preview angle ${index + 1}`}
                        >
                          <img src={image} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#81776e]">
                      Angle {angleIndex + 1} / {images.length}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Colour", attributes.colorName],
                  ["Pattern", displayValue(attributes.pattern)],
                  ["Sleeve", displayValue(attributes.sleeveStyle)],
                  ["Neck", displayValue(attributes.neckDesign)],
                ].map(([label, value]) => (
                  <div key={label} className="border border-[#1d1916]/10 bg-white/60 p-4">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-[#8b8177]">{label}</p>
                    <p className="mt-2 text-sm font-semibold capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CONTROLS */}
            <aside className="border border-[#1d1916]/10 bg-white p-5 sm:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">03 / Customize</p>
                <h2
                  className="mt-2 text-3xl sm:text-4xl"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Shape your piece
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#6f665d]">
                  Every selection updates the live Studio preview and the saved design summary.
                </p>
              </div>

              <div className="mt-7 space-y-7">
                {/* COLOR */}
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Colour</label>
                      <p className="mt-1 text-sm font-semibold">{attributes.colorName}</p>
                    </div>
                    <span className="h-7 w-7 border border-[#1d1916]/10" style={{ backgroundColor: attributes.color }} aria-hidden="true" />
                  </div>
                  <div className="mt-3 grid grid-cols-9 gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        title={color.label}
                        aria-label={color.label}
                        aria-pressed={attributes.color === color.value}
                        onClick={() => selectColor(color)}
                        className={`h-8 w-8 rounded-full border transition ${
                          attributes.color === color.value
                            ? "border-[#1d1916] ring-2 ring-[#1d1916]/10"
                            : "border-[#1d1916]/10"
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>

                {/* PATTERN */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Pattern</label>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {PATTERN_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateAttribute("pattern", option.value)}
                        className={`border px-3 py-3 text-left text-xs font-semibold transition ${
                          attributes.pattern === option.value
                            ? "border-[#1d1916] bg-[#1d1916] text-white"
                            : "border-[#1d1916]/10 bg-[#faf8f4] text-[#514a44] hover:border-[#1d1916]/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SLEEVE */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Sleeve style</label>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {SLEEVE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateAttribute("sleeveStyle", option.value)}
                        className={`border px-3 py-3 text-left text-xs font-semibold transition ${
                          attributes.sleeveStyle === option.value
                            ? "border-[#1d1916] bg-[#f0e8dd] text-[#1d1916]"
                            : "border-[#1d1916]/10 bg-white text-[#514a44] hover:border-[#1d1916]/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NECK */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Neck design</label>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {NECK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateAttribute("neckDesign", option.value)}
                        className={`border px-3 py-3 text-left text-xs font-semibold transition ${
                          attributes.neckDesign === option.value
                            ? "border-[#1d1916] bg-[#f0e8dd] text-[#1d1916]"
                            : "border-[#1d1916]/10 bg-white text-[#514a44] hover:border-[#1d1916]/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LENGTH */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Length</label>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {LENGTH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateAttribute("length", option.value)}
                        className={`border px-3 py-3 text-left text-xs font-semibold transition ${
                          attributes.length === option.value
                            ? "border-[#1d1916] bg-[#f0e8dd] text-[#1d1916]"
                            : "border-[#1d1916]/10 bg-white text-[#514a44] hover:border-[#1d1916]/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SIZE */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Size</label>
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {SIZE_OPTIONS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => updateAttribute("size", size)}
                        className={`border py-2.5 text-xs font-semibold transition ${
                          attributes.size === size
                            ? "border-[#1d1916] bg-[#1d1916] text-white"
                            : "border-[#1d1916]/10 bg-white text-[#514a44] hover:border-[#1d1916]/25"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MEASUREMENTS */}
                <div className="border-t border-[#1d1916]/10 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowMeasurements((current) => !current)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                    aria-expanded={showMeasurements}
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Custom measurements</p>
                      <p className="mt-1 text-sm font-semibold">Fine-tune the fit</p>
                    </div>
                    <span className="text-lg text-[#6f655c]">{showMeasurements ? "−" : "+"}</span>
                  </button>

                  {showMeasurements ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {Object.keys(EMPTY_MEASUREMENTS).map((key) => (
                        <label key={key} className="block">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8b8177]">
                            {key} (cm)
                          </span>
                          <input
                            inputMode="decimal"
                            value={attributes.measurements[key]}
                            onChange={(event) => updateMeasurements(key, event.target.value)}
                            placeholder="—"
                            className="mt-1.5 h-10 w-full border border-[#1d1916]/10 bg-[#faf8f4] px-3 text-sm outline-none focus:border-[#1d1916]/30"
                          />
                        </label>
                      ))}
                      <p className="col-span-2 text-[10px] leading-5 text-[#8b8177]">
                        Measurements are attached to the design request so the saved design can retain the fit intent when the backend schema supports the extra attributes.
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* QUANTITY */}
                <div className="flex items-end justify-between gap-4 border-t border-[#1d1916]/10 pt-6">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7d7369]">Quantity</label>
                    <div className="mt-2 inline-flex border border-[#1d1916]/15 bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        className="grid h-10 w-10 place-items-center text-lg disabled:opacity-30"
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="grid h-10 w-10 place-items-center text-xs font-semibold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const maxQuantity = stock > 0 ? stock : 10;
                          setQuantity((current) => Math.min(maxQuantity, current + 1));
                        }}
                        className="grid h-10 w-10 place-items-center text-lg"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-[#8b8177]">Base price</p>
                    <p
                      className="mt-1 text-2xl"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      ₹{displayedPrice.toLocaleString("en-IN")}
                    </p>
                    {mrp > displayedPrice ? (
                      <p className="mt-1 text-xs text-[#92887e] line-through">₹{mrp.toLocaleString("en-IN")}</p>
                    ) : null}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="border-t border-[#1d1916]/10 pt-6">
                  <button
                    type="button"
                    onClick={() => saveDesign()}
                    disabled={busyAction !== "" || !selectedBaseItem}
                    className="group relative w-full overflow-hidden bg-[#1d1916] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#332c27] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === "save" ? "Saving design…" : savedDesignId ? "Save changes as design" : "Save Design"}
                  </button>

                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={busyAction !== "" || !selectedBaseItem}
                    className="mt-3 w-full border border-[#1d1916] bg-white px-5 py-4 text-sm font-semibold text-[#1d1916] transition hover:bg-[#faf7f1] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === "cart" ? "Adding to bag…" : "Add Customized Outfit to Cart"}
                  </button>

                  {savedDesignId ? (
                    <Link
                      to="/cart"
                      className="mt-3 block text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#7e6a58] hover:text-[#1d1916]"
                    >
                      View bag →
                    </Link>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["01", "Single garment", "This Studio customizes one base item rather than mixing multiple products."],
            ["02", "Saved to account", "Save the exact selected attributes and preview into your custom design."],
            ["03", "Commerce ready", "Move a saved custom design into the same cart and checkout flow as the store."],
          ].map(([number, title, text]) => (
            <article key={number} className="border border-[#1d1916]/10 bg-white p-5 sm:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">{number}</p>
              <h3 className="mt-2 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6f665d]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {showPreviewModal ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#171513]/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Studio full preview"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowPreviewModal(false);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto bg-[#f7f3ec] p-5 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">Styleverse Studio</p>
                <h2
                  className="mt-2 text-3xl sm:text-4xl"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {selectedBaseItem?.name || "Custom preview"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="h-10 w-10 border border-[#1d1916]/10 bg-white text-xl text-[#1d1916]"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="bg-[#eee7dc] p-4 sm:p-6">
                {activeImage ? (
                  <img src={previewUrl} alt="Styleverse custom design preview" className="mx-auto w-full max-w-2xl border border-[#1d1916]/10 object-contain" />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center text-sm text-[#7b7067]">No preview image available.</div>
                )}
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">Design summary</p>
                <div className="mt-5 space-y-4">
                  {[
                    ["Base", selectedBaseItem?.name || "—"],
                    ["Colour", attributes.colorName],
                    ["Pattern", displayValue(attributes.pattern)],
                    ["Sleeve", displayValue(attributes.sleeveStyle)],
                    ["Neck", displayValue(attributes.neckDesign)],
                    ["Length", displayValue(attributes.length)],
                    ["Size", attributes.size],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-[#1d1916]/10 pb-3">
                      <p className="text-[8px] uppercase tracking-[0.15em] text-[#8b8177]">{label}</p>
                      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}