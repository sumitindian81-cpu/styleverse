import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { apiJson, apiRequest } from "../utils/api";

// Compatibility adapter: the current shared API utility exposes named
// request helpers rather than a default axios-like export.
const api = {
  get: async (path) => ({ data: await apiRequest(path) }),
  post: async (path, data) => ({
    data: await apiJson(path, { method: "POST", data }),
  }),
  patch: async (path, data) => ({
    data: await apiJson(path, { method: "PATCH", data }),
  }),
};

function getSafeImageUrl(rawImage) {
  if (!rawImage) return "";
  if (typeof rawImage === "string") return rawImage;
  return rawImage?.url || rawImage?.secure_url || rawImage?.src || "";
}

// --------------------------------------------------
// Constants
// --------------------------------------------------

const TABS = [
  { key: "top", label: "Tops" },
  { key: "bottom", label: "Bottoms" },
  { key: "dress", label: "Dresses" },
  { key: "shoes", label: "Shoes" },
  { key: "bag", label: "Bags" },
  { key: "jewelry", label: "Jewelry" },
  { key: "accessory", label: "Accessories" },
  { key: "outerwear", label: "Outerwear" },
];

const ROLES = [
  "top",
  "bottom",
  "dress",
  "shoes",
  "bag",
  "jewelry",
  "accessory",
  "outerwear",
];

const EMPTY_SELECTED = {
  top: null,
  bottom: null,
  dress: null,
  shoes: null,
  bag: null,
  jewelry: null,
  accessory: null,
  outerwear: null,
};

const BODY_CATEGORIES = [
  { value: "male", label: "Men" },
  { value: "female", label: "Women" },
  { value: "kids", label: "Kids" },
];

const EMPTY_BODY_MEASUREMENTS = {
  height: "",
  neck: "",
  shoulderWidth: "",
  chest: "",
  bust: "",
  underbust: "",
  waist: "",
  belly: "",
  highHip: "",
  hip: "",
  seat: "",
  bicep: "",
  elbow: "",
  wrist: "",
  armLength: "",
  armhole: "",
  thigh: "",
  knee: "",
  calf: "",
  ankle: "",
  inseam: "",
  outseam: "",
  frontRise: "",
  backRise: "",
  legOpening: "",
  torsoLength: "",
  shoulderToWaist: "",
  waistToKnee: "",
};

const MEASUREMENT_FIELDS = [
  ["height", "Height"],
  ["neck", "Neck / Collar"],
  ["shoulderWidth", "Shoulder Width"],
  ["chest", "Chest"],
  ["bust", "Bust"],
  ["underbust", "Underbust"],
  ["waist", "Waist"],
  ["belly", "Belly"],
  ["hip", "Hip / Seat"],
  ["highHip", "High Hip"],
  ["bicep", "Bicep"],
  ["elbow", "Elbow"],
  ["wrist", "Wrist"],
  ["armLength", "Arm Length"],
  ["thigh", "Thigh"],
  ["knee", "Knee"],
  ["calf", "Calf"],
  ["ankle", "Ankle"],
  ["inseam", "Inseam"],
  ["outseam", "Outseam"],
  ["frontRise", "Front Rise"],
  ["backRise", "Back Rise"],
  ["legOpening", "Leg Opening"],
];

const STORAGE_KEY =
  "styleverse_builder_input";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const formatLabel = (value) => {
  if (!value) return "-";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

const getRoleFromCustomDesign = (
  design
) => {
  const type = String(
    design?.baseItemType ||
      design?.baseProductId?.type ||
      "top"
  ).toLowerCase();

  if (
    [
      "bottom",
      "pants",
      "trousers",
      "jeans",
      "skirt",
      "shorts",
    ].includes(type)
  ) {
    return "bottom";
  }

  if (type === "dress") {
    return "dress";
  }

  return "top";
};

const getImage = (item) => {
  if (
    item?.previewImageUrl
  ) {
    return getSafeImageUrl(
      item.previewImageUrl
    );
  }

  const raw =
    item?.images?.[0];

  if (typeof raw === "string") {
    return getSafeImageUrl(raw);
  }

  return getSafeImageUrl(
    raw?.url
  );
};

const buildSelectionFromProduct = (
  product
) => ({
  productId:
    product?._id || "",
  customDesignId: null,
  name:
    product?.name || "Product",
  price:
    Number(product?.price || 0),
  imageUrl: getImage(product),
  sizes:
    product?.sizes || [],
  colors:
    product?.colors || [],
  selectedSize:
    product?.sizes?.[0] || "",
  selectedColor:
    product?.colors?.[0] || "",
  customization: null,
});

const buildSelectionFromCustomDesign = (
  design,
  role
) => ({
  productId: null,
  customDesignId:
    design?._id || "",
  name:
    design?.title ||
    `Custom ${role}`,
  price:
    Number(design?.price || 0),
  imageUrl:
    getImage(design),
  sizes: [],
  colors: [],
  selectedSize:
    design?.attributes?.size ||
    "",
  selectedColor:
    design?.attributes?.color ||
    "",
  customization: {
    attributes:
      design?.attributes || {},
    measurements:
      design?.measurements || {},
  },
});

const normalizeSelectedItems = (
  selected
) =>
  Object.entries(selected)
    .filter(([, value]) => value)
    .map(([role, value]) => ({
      role,
      ...value,
    }));

const cloneMeasurements = (
  measurements
) => {
  const next = {
    ...EMPTY_BODY_MEASUREMENTS,
  };

  Object.keys(
    EMPTY_BODY_MEASUREMENTS
  ).forEach((key) => {
    const value =
      measurements?.[key];

    next[key] =
      value !== undefined &&
      value !== null
        ? String(value)
        : "";
  });

  return next;
};

// --------------------------------------------------
// Component
// --------------------------------------------------

export default function Builder() {
  const navigate = useNavigate();
  const location = useLocation();

  // ------------------------------------------------
  // Product browser
  // ------------------------------------------------

  const [activeTab, setActiveTab] =
    useState("top");

  const [items, setItems] = useState(
    []);

  const [loading, setLoading] =
    useState(false);

  const [productError, setProductError] =
    useState("");

  // ------------------------------------------------
  // Selected outfit
  // ------------------------------------------------

  const [selected, setSelected] =
    useState(EMPTY_SELECTED);

  // ------------------------------------------------
  // Body profile
  // ------------------------------------------------

  const [bodyProfiles, setBodyProfiles] =
    useState([]);

  const [
    selectedBodyProfileId,
    setSelectedBodyProfileId,
  ] = useState("");

  const [
    bodyCategory,
    setBodyCategory,
  ] = useState("male");

  const [bodyUnit, setBodyUnit] =
    useState("cm");

  const [
    bodyMeasurements,
    setBodyMeasurements,
  ] = useState(
    EMPTY_BODY_MEASUREMENTS
  );

  const [
    loadingBodyProfiles,
    setLoadingBodyProfiles,
  ] = useState(false);

  const [
    bodyProfileMessage,
    setBodyProfileMessage,
  ] = useState("");

  // ------------------------------------------------
  // Outfit save/edit
  // ------------------------------------------------

  const [savedOutfitId, setSavedOutfitId] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [saveMsg, setSaveMsg] =
    useState("");

  const [saveErr, setSaveErr] =
    useState("");

  // ------------------------------------------------
  // Share
  // ------------------------------------------------

  const [shareLoading, setShareLoading] =
    useState(false);

  const [shareToken, setShareToken] =
    useState("");

  const [shareMsg, setShareMsg] =
    useState("");

  // ------------------------------------------------
  // Cart
  // ------------------------------------------------

  const [addingToCart, setAddingToCart] =
    useState(false);

  const [cartMsg, setCartMsg] =
    useState("");

  const [cartErr, setCartErr] =
    useState("");

  // ------------------------------------------------
  // Derived data
  // ------------------------------------------------

  const selectedList = useMemo(
    () =>
      normalizeSelectedItems(
        selected
      ),
    [selected]
  );

  const outfitTotal = useMemo(
    () =>
      selectedList.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0),
        0
      ),
    [selectedList]
  );

  // ------------------------------------------------
  // Load products
  // ------------------------------------------------

  const loadItems = async (type) => {
    try {
      setLoading(true);
      setProductError("");

      const res = await api.get(
        `/products?type=${encodeURIComponent(
          type
        )}&limit=24&page=1`
      );

      const list =
        res.data?.data?.items ||
        res.data?.data?.products ||
        res.data?.data?.result ||
        [];

      setItems(
        Array.isArray(list)
          ? list
          : []
      );
    } catch (err) {
      setItems([]);

      setProductError(
        err?.response?.data?.message ||
          "Failed to load builder products"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(activeTab);
  }, [activeTab]);

  // ------------------------------------------------
  // Load body profiles
  // ------------------------------------------------

  const loadBodyProfiles =
    async () => {
      try {
        setLoadingBodyProfiles(
          true
        );
        setBodyProfileMessage("");

        const res =
          await api.get(
            "/body-profiles"
          );

        const profiles =
          res.data?.data?.items ||
          [];

        setBodyProfiles(
          Array.isArray(profiles)
            ? profiles
            : []
        );

        const defaultProfile =
          profiles.find(
            (profile) =>
              profile.isDefault
          );

        if (defaultProfile) {
          applyBodyProfile(
            defaultProfile
          );
        }
      } catch (err) {
        setBodyProfileMessage(
          err?.response?.data
            ?.message ||
            "Failed to load body profiles"
        );
      } finally {
        setLoadingBodyProfiles(
          false
        );
      }
    };

  useEffect(() => {
    loadBodyProfiles();
  }, []);

  // ------------------------------------------------
  // Apply body profile
  // ------------------------------------------------

  const applyBodyProfile = (
    profile
  ) => {
    if (!profile) return;

    setSelectedBodyProfileId(
      profile._id || ""
    );

    setBodyCategory(
      profile.category || "male"
    );

    setBodyUnit(
      profile.unit || "cm"
    );

    setBodyMeasurements(
      cloneMeasurements(
        profile.measurements
      )
    );

    setBodyProfileMessage(
      `Using ${
        profile.name ||
        "Body Profile"
      }`
    );
  };

  // ------------------------------------------------
  // Incoming custom design from Studio
  // ------------------------------------------------

  const loadIncomingCustomDesign =
    async () => {
      try {
        const stateDesignId =
          location.state
            ?.customDesignId;

        let storedPayload = null;

        try {
          const raw =
            sessionStorage.getItem(
              STORAGE_KEY
            );

          if (raw) {
            storedPayload =
              JSON.parse(raw);
          }
        } catch {
          storedPayload = null;
        }

        const designId =
          stateDesignId ||
          storedPayload?.customDesignId;

        if (!designId) {
          return;
        }

        const role =
          location.state?.role ||
          storedPayload?.role ||
          "top";

        const res =
          await api.get(
            `/custom-designs/${designId}`
          );

        const design =
          res.data?.data?.design;

        if (!design?._id) {
          return;
        }

        const selection =
          buildSelectionFromCustomDesign(
            design,
            role
          );

        setSelected(
          (prev) => {
            const next = {
              ...prev,
            };

            if (role === "dress") {
              next.top = null;
              next.bottom = null;
            }

            if (
              (role === "top" ||
                role === "bottom") &&
              next.dress
            ) {
              next.dress = null;
            }

            next[role] =
              selection;

            return next;
          }
        );

        setActiveTab(role);

        setSaveMsg(
          "Custom garment from Studio added to Outfit Builder."
        );

        sessionStorage.removeItem(
          STORAGE_KEY
        );
      } catch (err) {
        setSaveErr(
          err?.response?.data
            ?.message ||
            "Failed to load the custom garment from Studio."
        );
      }
    };

  useEffect(() => {
    loadIncomingCustomDesign();
  }, [location.state]);

  // ------------------------------------------------
  // Load saved outfit for Edit / Open flow
  // ------------------------------------------------

  const loadSavedOutfit = async () => {
    const searchParams = new URLSearchParams(location.search || "");
    const requestedOutfitId =
      location.state?.outfitId || searchParams.get("outfitId") || "";

    if (!requestedOutfitId) return;

    try {
      const res = await api.get(`/outfits/${requestedOutfitId}`);
      const outfit = res.data?.data?.outfit || null;
      if (!outfit?._id) return;

      const nextSelected = { ...EMPTY_SELECTED };

      for (const item of Array.isArray(outfit.items) ? outfit.items : []) {
        const role = item?.role || "top";
        if (!nextSelected[role]) {
          if (item?.customDesignId) {
            const design =
              typeof item.customDesignId === "object"
                ? item.customDesignId
                : null;
            if (design) {
              nextSelected[role] = {
                ...buildSelectionFromCustomDesign(design, role),
                selectedSize: item.selectedSize || design?.attributes?.size || "",
                selectedColor: item.selectedColor || design?.attributes?.color || "",
              };
            }
          } else if (item?.productId) {
            const product =
              typeof item.productId === "object"
                ? item.productId
                : null;
            if (product) {
              nextSelected[role] = {
                ...buildSelectionFromProduct(product),
                selectedSize: item.selectedSize || product?.sizes?.[0] || "",
                selectedColor: item.selectedColor || product?.colors?.[0] || "",
              };
            }
          }
        }
      }

      setSelected(nextSelected);
      setSavedOutfitId(outfit._id);

      if (outfit?.bodyProfileId && typeof outfit.bodyProfileId === "object") {
        applyBodyProfile(outfit.bodyProfileId);
      }

      setSaveMsg(`Loaded ${outfit.name || "saved outfit"} for editing.`);
    } catch (err) {
      setSaveErr(
        err?.response?.data?.message ||
          "Could not open this saved outfit for editing."
      );
    }
  };

  useEffect(() => {
    loadSavedOutfit();
  }, [location.search, location.state]);

  // ------------------------------------------------
  // Reset messages
  // ------------------------------------------------

  const resetMessages = () => {
    setSaveMsg("");
    setSaveErr("");
    setCartMsg("");
    setCartErr("");
    setShareMsg("");
  };

  // ------------------------------------------------
  // Product selection
  // ------------------------------------------------

  const selectProduct = (
    role,
    product
  ) => {
    resetMessages();

    const selection =
      buildSelectionFromProduct(
        product
      );

    setSelected(
      (prev) => {
        const next = {
          ...prev,
        };

        if (role === "dress") {
          next.top = null;
          next.bottom = null;
        }

        if (
          (role === "top" ||
            role === "bottom") &&
          next.dress
        ) {
          next.dress = null;
        }

        next[role] =
          selection;

        return next;
      }
    );
  };

  // ------------------------------------------------
  // Remove selected item
  // ------------------------------------------------

  const removeSelected = (
    role
  ) => {
    resetMessages();

    setSelected(
      (prev) => ({
        ...prev,
        [role]: null,
      })
    );
  };

  // ------------------------------------------------
  // Change selected size/color
  // ------------------------------------------------

  const updateSelectedField = (
    role,
    field,
    value
  ) => {
    setSelected(
      (prev) => ({
        ...prev,
        [role]: prev[role]
          ? {
              ...prev[role],
              [field]: value,
            }
          : prev[role],
      })
    );
  };

  // ------------------------------------------------
  // Body measurement change
  // ------------------------------------------------

  const updateBodyMeasurement =
    (key, value) => {
      setBodyMeasurements(
        (prev) => ({
          ...prev,
          [key]: value,
        })
      );
    };

  // ------------------------------------------------
  // Save / Update Outfit
  // ------------------------------------------------

  const saveOutfit = async () => {
    try {
      resetMessages();

      if (
        selectedList.length === 0
      ) {
        setSaveErr(
          "Please select at least one item."
        );
        return;
      }

      setSaving(true);

      const payload = {
        name:
          savedOutfitId
            ? "My Outfit"
            : "My Outfit",

        bodyProfileId:
          selectedBodyProfileId ||
          null,

        items:
          selectedList.map(
            (item) => ({
              productId:
                item.productId ||
                null,

              customDesignId:
                item.customDesignId ||
                null,

              role:
                item.role,

              selectedSize:
                item.selectedSize ||
                "",

              selectedColor:
                item.selectedColor ||
                "",
            })
          ),

        // Frontend 2D preview currently.
        // Later replaced by rendered 3D preview.
        previewImageUrl:
          selectedList[0]
            ?.imageUrl || "",
      };

      let res;

      if (savedOutfitId) {
        res = await api.patch(
          `/outfits/${savedOutfitId}`,
          payload
        );
      } else {
        res = await api.post(
          "/outfits",
          payload
        );
      }

      const outfit =
        res.data?.data?.outfit;

      const id =
        outfit?._id ||
        savedOutfitId;

      if (!id) {
        throw new Error(
          "Outfit ID missing from server response"
        );
      }

      setSavedOutfitId(id);

      setSaveMsg(
        savedOutfitId
          ? "Outfit updated successfully."
          : "Outfit saved successfully."
      );
    } catch (err) {
      setSaveErr(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Failed to save outfit."
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------
  // Share Outfit
  // ------------------------------------------------

  const shareOutfit =
    async () => {
      try {
        setShareMsg("");
        setSaveErr("");

        if (!savedOutfitId) {
          setSaveErr(
            "Please save the outfit before sharing."
          );
          return;
        }

        setShareLoading(true);

        const res =
          await api.post(
            `/outfits/${savedOutfitId}/share`
          );

        const token =
          res.data?.data
            ?.shareToken;

        if (!token) {
          throw new Error(
            "Share token was not returned."
          );
        }

        setShareToken(token);

        const shareUrl =
          `${window.location.origin}/shared-outfit/${token}`;

        try {
          await navigator.clipboard.writeText(
            shareUrl
          );

          setShareMsg(
            "Share link copied to clipboard."
          );
        } catch {
          setShareMsg(
            `Share link created: ${shareUrl}`
          );
        }
      } catch (err) {
        setShareMsg(
          err?.response?.data
            ?.message ||
            "Failed to share outfit."
        );
      } finally {
        setShareLoading(
          false
        );
      }
    };

  // ------------------------------------------------
  // Add complete outfit to cart
  // ------------------------------------------------

  const addOutfitToCart =
    async () => {
      try {
        setCartMsg("");
        setCartErr("");

        if (
          selectedList.length === 0
        ) {
          setCartErr(
            "Select at least one item first."
          );
          return;
        }

        let outfitId =
          savedOutfitId;

        if (!outfitId) {
          setAddingToCart(true);

          const res =
            await api.post(
              "/outfits",
              {
                name: "My Outfit",

                bodyProfileId:
                  selectedBodyProfileId ||
                  null,

                items:
                  selectedList.map(
                    (item) => ({
                      productId:
                        item.productId ||
                        null,

                      customDesignId:
                        item.customDesignId ||
                        null,

                      role:
                        item.role,

                      selectedSize:
                        item.selectedSize ||
                        "",

                      selectedColor:
                        item.selectedColor ||
                        "",
                    })
                  ),

                previewImageUrl:
                  selectedList[0]
                    ?.imageUrl || "",
              }
            );

          outfitId =
            res.data?.data
              ?.outfit?._id ||
            "";

          if (!outfitId) {
            throw new Error(
              "Failed to create outfit before adding to cart."
            );
          }

          setSavedOutfitId(
            outfitId
          );
        }

        await api.post(
          "/cart/outfit",
          {
            outfitId,
          }
        );

        setCartMsg(
          "Complete outfit added to cart successfully."
        );
      } catch (err) {
        setCartErr(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Failed to add outfit to cart."
        );
      } finally {
        setAddingToCart(
          false
        );
      }
    };

  // ------------------------------------------------
  // Render
  // ------------------------------------------------

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-4 py-8 text-[#1d1916] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a7655]">
          Styleverse / Virtual Outfit Builder
        </p>
        <h1
          className="mt-3 text-5xl font-normal leading-[0.98] tracking-[-0.045em] text-[#1d1916] sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Build the whole look.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-7 text-[#6f665d] sm:text-lg">
          Mix and match multiple garments,
          use your body profile, add a custom
          garment from Studio, and create a
          complete outfit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ======================================== */}
        {/* LEFT: BODY + PRODUCTS */}
        {/* ======================================== */}

        <div className="xl:col-span-3 space-y-5">
          {/* Body profile */}
          <section className="border rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Body Scaling
              </h2>

              <div className="flex gap-1">
                {["cm", "in"].map(
                  (unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() =>
                        setBodyUnit(
                          unit
                        )
                      }
                      className={[
                        "px-3 py-1 rounded-lg border text-xs",
                        bodyUnit ===
                        unit
                          ? "bg-black text-white"
                          : "bg-white",
                      ].join(
                        " "
                      )}
                    >
                      {unit}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Category */}
            <div className="mt-4">
              <div className="text-sm font-medium">
                Body Category
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                {BODY_CATEGORIES.map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setBodyCategory(
                          option.value
                        )
                      }
                      className={[
                        "border rounded-lg px-2 py-2 text-xs",
                        bodyCategory ===
                        option.value
                          ? "bg-black text-white"
                          : "bg-white",
                      ].join(
                        " "
                      )}
                    >
                      {option.label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Existing profile */}
            <div className="mt-4">
              <label className="text-xs text-gray-600">
                Saved Body Profile
              </label>

              <select
                value={
                  selectedBodyProfileId
                }
                onChange={(e) => {
                  const profile =
                    bodyProfiles.find(
                      (item) =>
                        item._id ===
                        e.target.value
                    );

                  if (profile) {
                    applyBodyProfile(
                      profile
                    );
                  } else {
                    setSelectedBodyProfileId(
                      ""
                    );
                  }
                }}
                disabled={
                  loadingBodyProfiles
                }
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">
                  {loadingBodyProfiles
                    ? "Loading..."
                    : "Select profile"}
                </option>

                {bodyProfiles
                  .filter(
                    (profile) =>
                      profile.category ===
                      bodyCategory
                  )
                  .map(
                    (profile) => (
                      <option
                        key={profile._id}
                        value={profile._id}
                      >
                        {profile.name}
                        {profile.isDefault
                          ? " • Default"
                          : ""}
                      </option>
                    )
                  )}
              </select>
            </div>

            {bodyProfileMessage ? (
              <div className="mt-2 text-xs text-gray-500">
                {bodyProfileMessage}
              </div>
            ) : null}

            {/* Measurements */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">
                Body Measurements ({bodyUnit})
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-auto pr-1">
                {MEASUREMENT_FIELDS.map(
                  ([key, label]) => (
                    <div key={key}>
                      <label className="text-[11px] text-gray-500">
                        {label}
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={
                          bodyMeasurements[
                            key
                          ]
                        }
                        onChange={(e) =>
                          updateBodyMeasurement(
                            key,
                            e.target.value
                          )
                        }
                        className="mt-1 w-full border rounded-lg px-2 py-2 text-xs"
                        placeholder="0"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Product tabs */}
          <section className="border rounded-2xl bg-white p-3">
            <div className="flex flex-wrap gap-2 mb-3">
              {TABS.map(
                (tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.key
                      )
                    }
                    className={[
                      "px-3 py-1 rounded-lg border text-xs",
                      activeTab ===
                      tab.key
                        ? "bg-black text-white"
                        : "bg-white",
                    ].join(
                      " "
                    )}
                  >
                    {tab.label}
                  </button>
                )
              )}
            </div>

            {productError ? (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                {productError}
              </div>
            ) : null}

            {loading ? (
              <div className="text-sm text-gray-600">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-600">
                No items found.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[550px] overflow-auto pr-1">
                {items.map(
                  (product) => (
                    <button
                      key={
                        product._id
                      }
                      type="button"
                      onClick={() =>
                        selectProduct(
                          activeTab,
                          product
                        )
                      }
                      className="border rounded-xl p-2 text-left hover:border-black"
                    >
                      <img
                        src={getImage(
                          product
                        )}
                        alt={
                          product.name
                        }
                        className="w-full h-32 object-cover rounded-lg border mb-2"
                      />

                      <div className="text-xs font-medium line-clamp-2">
                        {
                          product.name
                        }
                      </div>

                      <div className="text-xs text-gray-600 mt-1">
                        ₹
                        {Number(
                          product.price ||
                            0
                        ).toFixed(
                          2
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        {/* ======================================== */}
        {/* CENTER: PREVIEW */}
        {/* ======================================== */}

        <section className="xl:col-span-5 border rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">
                Outfit Preview
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                {selectedList.length
                  ? `${selectedList.length} item(s) selected`
                  : "Select garments to build your outfit"}
              </p>
            </div>

            <div className="text-xs border rounded-lg px-3 py-2">
              3D Ready
            </div>
          </div>

          <div className="min-h-[650px] rounded-2xl border bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
            <div className="relative w-[340px] h-[570px]">
              {/* Avatar */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-[215px] h-[485px] rounded-[45%] bg-white/70 border border-gray-300 shadow-inner">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-white border border-gray-300" />
                </div>
              </div>

              {/* Dress OR Bottom */}
              {selected.dress ? (
                <div className="absolute inset-x-0 top-[145px] flex justify-center">
                  <div className="w-[235px] h-[340px]">
                    <img
                      src={
                        selected.dress
                          .imageUrl
                      }
                      alt="Dress"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {selected.bottom ? (
                    <div className="absolute inset-x-0 top-[280px] flex justify-center">
                      <div className="w-[195px] h-[210px]">
                        <img
                          src={
                            selected.bottom
                              .imageUrl
                          }
                          alt="Bottom"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : null}

                  {selected.top ? (
                    <div className="absolute inset-x-0 top-[125px] flex justify-center">
                      <div className="w-[240px] h-[235px]">
                        <img
                          src={
                            selected.top
                              .imageUrl
                          }
                          alt="Top"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {/* Outerwear */}
              {selected.outerwear ? (
                <div className="absolute inset-x-0 top-[120px] flex justify-center">
                  <div className="w-[255px] h-[330px]">
                    <img
                      src={
                        selected.outerwear
                          .imageUrl
                      }
                      alt="Outerwear"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : null}

              {/* Shoes */}
              {selected.shoes ? (
                <div className="absolute bottom-[25px] inset-x-0 flex justify-center">
                  <div className="w-[210px] h-[85px]">
                    <img
                      src={
                        selected.shoes
                          .imageUrl
                      }
                      alt="Shoes"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : null}

              {/* Bag */}
              {selected.bag ? (
                <div className="absolute right-[15px] top-[235px]">
                  <img
                    src={
                      selected.bag
                        .imageUrl
                    }
                    alt="Bag"
                    className="w-24 h-28 object-contain"
                  />
                </div>
              ) : null}

              {/* Jewelry */}
              {selected.jewelry ? (
                <div className="absolute left-1/2 -translate-x-1/2 top-[155px]">
                  <img
                    src={
                      selected.jewelry
                        .imageUrl
                    }
                    alt="Jewelry"
                    className="w-20 h-20 object-contain"
                  />
                </div>
              ) : null}

              {/* Accessory */}
              {selected.accessory ? (
                <div className="absolute left-[25px] top-[215px]">
                  <img
                    src={
                      selected.accessory
                        .imageUrl
                    }
                    alt="Accessory"
                    className="w-20 h-20 object-contain"
                  />
                </div>
              ) : null}

              {/* Live body summary */}
              <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur border rounded-xl p-3 text-xs">
                <div className="font-medium">
                  Body:{" "}
                  {formatLabel(
                    bodyCategory
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 mt-2 text-gray-600">
                  <span>
                    Height:{" "}
                    {bodyMeasurements.height ||
                      "-"}
                  </span>

                  <span>
                    Chest:{" "}
                    {bodyMeasurements.chest ||
                      bodyMeasurements.bust ||
                      "-"}
                  </span>

                  <span>
                    Waist:{" "}
                    {bodyMeasurements.waist ||
                      "-"}
                  </span>

                  <span>
                    Hip:{" "}
                    {bodyMeasurements.hip ||
                      "-"}
                  </span>

                  <span>
                    Thigh:{" "}
                    {bodyMeasurements.thigh ||
                      "-"}
                  </span>

                  <span>
                    Unit: {bodyUnit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Current preview uses layered product assets.
            The same outfit state is prepared for the
            production 3D avatar/garment renderer.
          </div>
        </section>

        {/* ======================================== */}
        {/* RIGHT: SELECTED + ACTIONS */}
        {/* ======================================== */}

        <section className="xl:col-span-4 space-y-5">
          {/* Selected items */}
          <div className="border rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Selected Outfit
              </h2>

              <div className="font-semibold">
                ₹
                {outfitTotal.toFixed(
                  2
                )}
              </div>
            </div>

            {selectedList.length === 0 ? (
              <div className="text-sm text-gray-500 mt-4">
                Select garments from the left
                panel.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {selectedList.map(
                  (item) => (
                    <div
                      key={
                        item.role
                      }
                      className="border rounded-xl p-3"
                    >
                      <div className="flex gap-3">
                        <img
                          src={
                            item.imageUrl
                          }
                          alt={
                            item.name
                          }
                          className="w-16 h-20 object-cover rounded-lg border"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold uppercase text-gray-500">
                            {
                              item.role
                            }
                          </div>

                          <div className="text-sm font-medium line-clamp-2">
                            {
                              item.name
                            }
                          </div>

                          <div className="text-sm mt-1">
                            ₹
                            {Number(
                              item.price ||
                                0
                            ).toFixed(
                              2
                            )}
                          </div>

                          {item.sizes?.length ? (
                            <select
                              value={
                                item.selectedSize ||
                                ""
                              }
                              onChange={(e) =>
                                updateSelectedField(
                                  item.role,
                                  "selectedSize",
                                  e.target.value
                                )
                              }
                              className="mt-2 border rounded-lg px-2 py-1 text-xs w-full"
                            >
                              <option value="">
                                Select size
                              </option>

                              {item.sizes.map(
                                (size) => (
                                  <option
                                    key={
                                      size
                                    }
                                    value={
                                      size
                                    }
                                  >
                                    Size{" "}
                                    {
                                      size
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          ) : null}

                          {item.colors?.length ? (
                            <select
                              value={
                                item.selectedColor ||
                                ""
                              }
                              onChange={(e) =>
                                updateSelectedField(
                                  item.role,
                                  "selectedColor",
                                  e.target.value
                                )
                              }
                              className="mt-2 border rounded-lg px-2 py-1 text-xs w-full"
                            >
                              <option value="">
                                Select color
                              </option>

                              {item.colors.map(
                                (color) => (
                                  <option
                                    key={
                                      color
                                    }
                                    value={
                                      color
                                    }
                                  >
                                    {
                                      color
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          ) : null}

                          {item.customDesignId ? (
                            <div className="mt-2 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                              Customized in Studio
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeSelected(
                            item.role
                          )
                        }
                        className="mt-3 text-xs underline text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Action area */}
          <div className="border rounded-2xl bg-white p-4">
            {saveErr ? (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                {saveErr}
              </div>
            ) : null}

            {saveMsg ? (
              <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                {saveMsg}
              </div>
            ) : null}

            {cartErr ? (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                {cartErr}
              </div>
            ) : null}

            {cartMsg ? (
              <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                {cartMsg}
              </div>
            ) : null}

            {shareMsg ? (
              <div className="mb-3 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl p-3 break-all">
                {shareMsg}
              </div>
            ) : null}

            {/* Save / update */}
            <button
              type="button"
              onClick={saveOutfit}
              disabled={
                saving ||
                selectedList.length === 0
              }
              className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : savedOutfitId
                ? "Update Outfit"
                : "Save Outfit"}
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={shareOutfit}
              disabled={
                shareLoading ||
                !savedOutfitId
              }
              className="mt-3 w-full rounded-xl border border-indigo-600 text-indigo-700 py-3 font-medium disabled:opacity-60"
            >
              {shareLoading
                ? "Creating Share Link..."
                : "Share Outfit"}
            </button>

            {/* Cart */}
            <button
              type="button"
              onClick={
                addOutfitToCart
              }
              disabled={
                addingToCart ||
                selectedList.length === 0
              }
              className="mt-3 w-full rounded-xl bg-teal-700 text-white py-3 font-medium disabled:opacity-60"
            >
              {addingToCart
                ? "Adding..."
                : "Add Complete Outfit to Cart"}
            </button>

            {shareToken ? (
              <div className="mt-3 text-[11px] text-gray-500 break-all">
                Share Token:{" "}
                {shareToken}
              </div>
            ) : null}
          </div>

          {/* Studio connection */}
          <div className="border rounded-2xl bg-indigo-50 border-indigo-200 p-4">
            <div className="font-semibold text-indigo-900">
              Studio + Builder
            </div>

            <p className="text-xs text-indigo-800 mt-2">
              A customized upper or lower created
              in Custom Outfit Studio can be brought
              into this Builder and combined with
              additional garments.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/studio"
                )
              }
              className="mt-3 border border-indigo-600 text-indigo-700 rounded-lg px-3 py-2 text-sm font-medium"
            >
              Customize Another Garment
            </button>
          </div>
        </section>
      </div>
      </div>
    </main>
  );
}