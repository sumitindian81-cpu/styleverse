import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  apiJson,
  apiRequest,
  getAuthToken,
} from "../utils/api";

const TABS = [
  { id: "personal", label: "Personal Info" },
  { id: "addresses", label: "Addresses" },
  { id: "wishlist", label: "Wishlist" },
  { id: "orders", label: "Orders" },
  { id: "designs", label: "Saved Designs" },
  { id: "outfits", label: "Saved Outfits" },
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  gender: "",
  DOB: "",
};

const EMPTY_ADDRESS = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

function getInitialTab() {
  try {
    const saved =
      sessionStorage.getItem(
        "styleverse_profile_tab"
      );

    if (
      saved &&
      TABS.some((tab) => tab.id === saved)
    ) {
      return saved;
    }
  } catch {
    // Ignore storage errors.
  }

  return "personal";
}

function getId(item) {
  return (
    item?._id ||
    item?.id ||
    ""
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

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getOrderStatus(order) {
  return String(
    order?.status ||
      order?.orderStatus ||
      "pending"
  ).toLowerCase();
}

function statusClass(status) {
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

function getStatusLabel(status) {
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

function normalizeUser(response) {
  return (
    response?.data?.user ||
    response?.user ||
    response?.data ||
    null
  );
}

function readStoredUser() {
  const keys = [
    "styleverse_user",
    "user",
    "styleverseUser",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Ignore malformed/local-storage values.
    }
  }

  return null;
}

function getDisplayName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.displayName ||
    user?.username ||
    (user?.email
      ? user.email.split("@")[0]
      : "") ||
    "Styleverse User"
  );
}

function getWelcomeTitle(user) {
  const name = getDisplayName(user);

  return `Welcome back, ${name}.`;
}

function normalizeAddresses(response) {
  const root =
    response?.data ?? response ?? {};

  const candidates = [
    root.addresses,
    root.items,
    root.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeOrders(response) {
  const root =
    response?.data ?? response ?? {};

  const candidates = [
    root.orders,
    root.items,
    root.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeList(response) {
  const root =
    response?.data ?? response ?? {};

  const candidates = [
    root.items,
    root.designs,
    root.outfits,
    root.products,
    root.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getDesignImage(design) {
  return (
    design?.previewImageUrl ||
    design?.previewUrl ||
    design?.imageUrl ||
    ""
  );
}

function getProductImage(product) {
  const images = Array.isArray(
    product?.images
  )
    ? product.images
    : [];

  const main =
    images.find(
      (image) =>
        image?.isMain === true
    ) || images[0];

  if (!main) return "";

  return typeof main === "string"
    ? main
    : main.url ||
        main.secure_url ||
        "";
}

function getOutfitImage(outfit) {
  return (
    outfit?.previewImageUrl ||
    outfit?.previewUrl ||
    getProductImage(
      outfit?.items?.find(
        (item) =>
          item?.productId &&
          typeof item.productId ===
            "object"
      )?.productId
    )
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.17em] text-[#8a8075]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-sm text-[#1d1916] outline-none transition placeholder:text-[#8f857a] focus:border-[#1d1916] focus:bg-white"
      />
    </label>
  );
}

function EmptyPanel({
  eyebrow,
  title,
  body,
  action,
  to,
  onAction,
}) {
  return (
    <div className="border border-[#1d1916]/10 bg-white px-6 py-14 text-center sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
        {eyebrow}
      </p>

      <h3
        className="mt-3 text-4xl leading-none tracking-[-0.03em]"
        style={{
          fontFamily:
            "Georgia, 'Times New Roman', serif",
        }}
      >
        {title}
      </h3>

      <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#746b62]">
        {body}
      </p>

      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-7 inline-flex border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.17em] text-[#f7f3ec]"
        >
          {action}
        </button>
      )}

      {action && !onAction && to && (
        <Link
          to={to}
          className="mt-7 inline-flex border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.17em] text-[#f7f3ec]"
        >
          {action}
        </Link>
      )}
    </div>
  );
}

export default function Profile() {
  const [activeTab, setActiveTab] =
    useState(getInitialTab);

  const [user, setUser] =
    useState(null);

  const [profileForm, setProfileForm] =
    useState(EMPTY_FORM);

  const [addresses, setAddresses] =
    useState([]);

  const [orders, setOrders] =
    useState([]);

  const [wishlist, setWishlist] =
    useState([]);

  const [designs, setDesigns] =
    useState([]);

  const [outfits, setOutfits] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [sectionLoading, setSectionLoading] =
    useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [addressForm, setAddressForm] =
    useState(EMPTY_ADDRESS);

  const [editingAddressId, setEditingAddressId] =
    useState("");

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const [addressBusyId, setAddressBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [creativeBusyId, setCreativeBusyId] =
    useState("");

  const isAdmin =
    String(
      user?.role || ""
    ).toLowerCase() === "admin";

  const loadUser = useCallback(
    async () => {
      const storedUser =
        readStoredUser();

      if (storedUser) {
        setUser(storedUser);

        setProfileForm({
          name:
            storedUser?.name ||
            storedUser?.fullName ||
            storedUser?.displayName ||
            "",
          phone:
            storedUser?.phone || "",
          gender:
            storedUser?.gender || "",
          DOB:
            storedUser?.DOB ||
            storedUser?.dob ||
            "",
        });
      }

      try {
        const response =
          await apiRequest("/user/me");

        const nextUser =
          normalizeUser(response);

        if (nextUser) {
          setUser(nextUser);

          setProfileForm({
            name:
              nextUser?.name ||
              nextUser?.fullName ||
              nextUser?.displayName ||
              "",
            phone:
              nextUser?.phone || "",
            gender:
              nextUser?.gender || "",
            DOB:
              nextUser?.DOB ||
              nextUser?.dob ||
              "",
          });
        }

        return;
      } catch (err) {
        // The current backend instance can render this page from the
        // authenticated user cached at login even before /user/me is added.
        if (!storedUser) {
          throw err;
        }
      }
    },
    []
  );

  const loadSectionData =
    useCallback(async () => {
      setSectionLoading(true);

      try {
        const [
          addressResponse,
          orderResponse,
          wishlistResponse,
          designResponse,
          outfitResponse,
        ] = await Promise.allSettled([
          apiRequest("/addresses"),
          apiRequest("/orders"),
          apiRequest("/wishlist"),
          apiRequest("/custom-designs"),
          apiRequest("/outfits"),
        ]);

        if (
          addressResponse.status ===
          "fulfilled"
        ) {
          setAddresses(
            normalizeAddresses(
              addressResponse.value
            )
          );
        }

        if (
          orderResponse.status ===
          "fulfilled"
        ) {
          setOrders(
            normalizeOrders(
              orderResponse.value
            )
          );
        }

        if (
          wishlistResponse.status ===
          "fulfilled"
        ) {
          setWishlist(
            normalizeList(
              wishlistResponse.value
            )
          );
        }

        if (
          designResponse.status ===
          "fulfilled"
        ) {
          setDesigns(
            normalizeList(
              designResponse.value
            )
          );
        }

        if (
          outfitResponse.status ===
          "fulfilled"
        ) {
          setOutfits(
            normalizeList(
              outfitResponse.value
            )
          );
        }
      } finally {
        setSectionLoading(false);
      }
    }, []);

  const loadAll = useCallback(
    async () => {
      setLoading(true);
      setError("");

      if (!getAuthToken()) {
        setLoading(false);
        return;
      }

      try {
        await Promise.all([
          loadUser(),
          loadSectionData(),
        ]);
      } catch (err) {
        setError(
          err?.message ||
            "Could not load your profile."
        );
      } finally {
        setLoading(false);
      }
    },
    [loadSectionData, loadUser]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "styleverse_profile_tab",
        activeTab
      );
    } catch {
      // Ignore storage errors.
    }
  }, [activeTab]);

  const stats = useMemo(
    () => ({
      orders: orders.length,
      wishlist: wishlist.length,
      addresses: addresses.length,
      savedDesigns: designs.length,
      savedOutfits: outfits.length,
    }),
    [
      addresses.length,
      designs.length,
      orders.length,
      outfits.length,
      wishlist.length,
    ]
  );

  function selectTab(tabId) {
    setActiveTab(tabId);
    setError("");
    setMessage("");
  }

  function updateProfileField(
    field,
    value
  ) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveProfile() {
    const name = String(profileForm.name || "").trim();
    const phone = String(profileForm.phone || "").replace(/\D/g, "");

    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (phone && phone.length !== 10) {
      setError("Phone must contain 10 digits.");
      return;
    }

    setSavingProfile(true);
    setError("");
    setMessage("");

    try {
      const response =
        await apiJson("/user/me", {
          method: "PATCH",
          data: {
            name,
            phone,
            gender:
              profileForm.gender.trim(),
            DOB:
              profileForm.DOB || "",
          },
        });

      const nextUser =
        normalizeUser(response);

      if (nextUser) {
        setUser(nextUser);

        setProfileForm((current) => ({
          ...current,
          name:
            nextUser?.name ??
            current.name,
          phone:
            nextUser?.phone ??
            current.phone,
          gender:
            nextUser?.gender ??
            current.gender,
          DOB:
            nextUser?.DOB ??
            nextUser?.dob ??
            current.DOB,
        }));
      } else {
        await loadUser();
      }

      setMessage(
        "Personal information updated."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function openNewAddress() {
    setEditingAddressId("");
    setAddressForm({
      ...EMPTY_ADDRESS,
    });
    setShowAddressForm(true);
    setError("");
    setMessage("");
  }

  function openEditAddress(address) {
    setEditingAddressId(
      getId(address)
    );

    setAddressForm({
      fullName:
        address?.fullName ||
        address?.name ||
        "",
      phone:
        address?.phone || "",
      addressLine1:
        address?.addressLine1 ||
        address?.street ||
        "",
      addressLine2:
        address?.addressLine2 ||
        "",
      city:
        address?.city || "",
      state:
        address?.state || "",
      postalCode:
        address?.postalCode ||
        address?.zip ||
        "",
      country:
        address?.country ||
        "India",
      isDefault:
        Boolean(
          address?.isDefault
        ),
    });

    setShowAddressForm(true);
    setError("");
    setMessage("");
  }

  function closeAddressForm() {
    setShowAddressForm(false);
    setEditingAddressId("");
    setAddressForm({
      ...EMPTY_ADDRESS,
    });
  }

  function updateAddressField(
    field,
    value
  ) {
    setAddressForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateAddress() {
    const required = [
      ["fullName", "Full name"],
      ["phone", "Phone"],
      [
        "addressLine1",
        "Address Line 1",
      ],
      ["city", "City"],
      ["state", "State"],
      ["postalCode", "Postal code"],
    ];

    for (const [
      key,
      label,
    ] of required) {
      if (
        !String(
          addressForm[key] || ""
        ).trim()
      ) {
        return `${label} is required.`;
      }
    }

    const phone = String(
      addressForm.phone || ""
    ).replace(/\D/g, "");

    if (phone.length !== 10) {
      return "Phone must contain 10 digits.";
    }

    const postalCode = String(
      addressForm.postalCode || ""
    ).replace(/\D/g, "");

    if (postalCode.length !== 6) {
      return "Postal code must contain 6 digits.";
    }

    return "";
  }

  async function saveAddress() {
    const validation =
      validateAddress();

    if (validation) {
      setError(validation);
      return;
    }

    setAddressBusyId(
      editingAddressId || "new"
    );
    setError("");
    setMessage("");

    try {
      if (editingAddressId) {
        const response =
          await apiJson(
            `/addresses/${editingAddressId}`,
            {
              method: "PATCH",
              data: addressForm,
            }
          );

        const updated =
          response?.data?.address ||
          response?.data?.item ||
          response?.data ||
          null;

        if (updated) {
          setAddresses((current) =>
            current.map((item) =>
              getId(item) ===
              editingAddressId
                ? updated
                : item
            )
          );
        } else {
          const refreshed =
            await apiRequest(
              "/addresses"
            );

          setAddresses(
            normalizeAddresses(
              refreshed
            )
          );
        }

        setMessage(
          "Address updated successfully."
        );
      } else {
        const response =
          await apiJson(
            "/addresses",
            {
              method: "POST",
              data: addressForm,
            }
          );

        const created =
          response?.data?.address ||
          response?.data?.item ||
          response?.data ||
          null;

        if (created) {
          setAddresses(
            (current) => [
              created,
              ...current,
            ]
          );
        } else {
          const refreshed =
            await apiRequest(
              "/addresses"
            );

          setAddresses(
            normalizeAddresses(
              refreshed
            )
          );
        }

        setMessage(
          "Address saved successfully."
        );
      }

      closeAddressForm();
    } catch (err) {
      setError(
        err?.message ||
          "Could not save this address."
      );
    } finally {
      setAddressBusyId("");
    }
  }

  async function deleteAddress(
    addressId
  ) {
    if (!addressId) return;

    setAddressBusyId(addressId);
    setError("");
    setMessage("");

    try {
      await apiJson(
        `/addresses/${addressId}`,
        {
          method: "DELETE",
        }
      );

      setAddresses((current) =>
        current.filter(
          (item) =>
            getId(item) !==
            addressId
        )
      );

      setMessage(
        "Address removed."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not remove this address."
      );
    } finally {
      setAddressBusyId("");
    }
  }

  async function addDesignToCart(design) {
    const designId = getId(design);

    if (!designId) {
      setError("This saved design has no valid ID.");
      return;
    }

    setCreativeBusyId(`design-cart-${designId}`);
    setError("");
    setMessage("");

    try {
      await apiJson("/cart", {
        method: "POST",
        data: {
          customDesignId: designId,
          quantity: 1,
        },
      });

      setMessage("Saved design added to your shopping bag.");
    } catch (err) {
      setError(
        err?.message ||
          "Could not add this saved design to your bag."
      );
    } finally {
      setCreativeBusyId("");
    }
  }

  async function shareSavedOutfit(outfit) {
    const outfitId = getId(outfit);

    if (!outfitId) {
      setError("This saved outfit has no valid ID.");
      return;
    }

    setCreativeBusyId(`outfit-share-${outfitId}`);
    setError("");
    setMessage("");

    try {
      const response = await apiJson(
        `/outfits/${outfitId}/share`,
        { method: "POST" }
      );

      const shareToken =
        response?.data?.shareToken ||
        response?.shareToken ||
        "";

      if (!shareToken) {
        throw new Error("Share link token was not returned.");
      }

      const shareUrl = `${window.location.origin}/shared-outfit/${shareToken}`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setMessage("Share link copied to clipboard.");
      } catch {
        setMessage(`Share link created: ${shareUrl}`);
      }
    } catch (err) {
      setError(
        err?.message ||
          "Could not create a share link for this outfit."
      );
    } finally {
      setCreativeBusyId("");
    }
  }

  async function addSavedOutfitToCart(outfit) {
    const outfitId = getId(outfit);

    if (!outfitId) {
      setError("This saved outfit has no valid ID.");
      return;
    }

    setCreativeBusyId(`outfit-cart-${outfitId}`);
    setError("");
    setMessage("");

    try {
      await apiJson("/cart/outfit", {
        method: "POST",
        data: { outfitId },
      });

      setMessage("Complete outfit added to your shopping bag.");
    } catch (err) {
      setError(
        err?.message ||
          "Could not add this saved outfit to your bag."
      );
    } finally {
      setCreativeBusyId("");
    }
  }

  if (!getAuthToken()) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse / Profile
          </p>

          <h1
            className="mt-4 text-5xl tracking-[-0.035em] sm:text-6xl"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Your style, saved.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#70685f]">
            Sign in to manage your personal information, addresses, orders and saved fashion content.
          </p>

          <Link
            to="/login"
            className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
          >
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1500px] animate-pulse">
          <div className="h-3 w-24 bg-[#e6dfd4]" />
          <div className="mt-4 h-14 w-64 bg-[#e6dfd4]" />

          <div className="mt-10 grid gap-6 lg:grid-cols-[300px_1fr]">
            <div className="h-72 bg-white" />
            <div className="h-[540px] bg-white" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-7 border-b border-[#1d1916]/10 pb-9 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
                {isAdmin
                  ? "Styleverse / Administrator"
                  : "Styleverse / Account"}
              </p>

              {isAdmin && (
                <span className="border border-[#cdb898]/40 bg-[#f2e8da] px-2.5 py-1 text-sm font-semibold uppercase tracking-[0.13em] text-[#765c41]">
                  Admin
                </span>
              )}
            </div>

            <h1
              className="mt-3 max-w-5xl text-5xl leading-[0.95] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              {getWelcomeTitle(user)}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[#70685f] sm:text-base">
              {isAdmin
                ? "Manage your Styleverse account, store operations and saved content from one place."
                : "Manage your personal details, shopping history and saved Styleverse content from one place."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8c8277]">
              <span>
                {getDisplayName(user)}
              </span>
              {user?.email && (
                <>
                  <span className="text-[#c4baad]">
                    /
                  </span>
                  <span>
                    {user.email}
                  </span>
                </>
              )}
              {isAdmin && (
                <>
                  <span className="text-[#c4baad]">
                    /
                  </span>
                  <span>
                    Administrator
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadAll}
              disabled={loading || sectionLoading}
              className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.17em] text-[#1d1916] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || sectionLoading ? "Refreshing…" : "Refresh account"}
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                className="border border-[#1d1916] bg-[#1d1916] px-5 py-3 text-xs font-semibold uppercase tracking-[0.17em] text-[#f7f3ec]"
              >
                Open admin
              </Link>
            )}

            <Link
              to="/shop"
              className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.17em] text-[#1d1916]"
            >
              Continue shopping
            </Link>
          </div>
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

        <div className="mt-10 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="h-fit border border-[#1d1916]/10 bg-white">
            <div className="border-b border-[#1d1916]/10 p-6">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#1d1916] text-lg font-semibold text-[#f7f3ec]">
                  {String(
                    user?.name ||
                      user?.email ||
                      "S"
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {user?.name ||
                      "Styleverse customer"}
                  </p>

                  <p className="mt-1 truncate text-sm text-[#8a8177]">
                    {user?.email ||
                      (isAdmin
                        ? "Administrator"
                        : "Account")}
                  </p>

                  {isAdmin && (
                    <span className="mt-2 inline-flex border border-[#cdb898]/40 bg-[#f2e8da] px-2 py-1 text-sm font-semibold uppercase tracking-[0.14em] text-[#765c41]">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            <nav className="p-2">
              {TABS.map((tab) => {
                const count =
                  tab.id === "orders"
                    ? stats.orders
                    : tab.id === "wishlist"
                    ? stats.wishlist
                    : tab.id ===
                      "addresses"
                    ? stats.addresses
                    : tab.id ===
                      "designs"
                    ? stats.savedDesigns
                    : tab.id ===
                      "outfits"
                    ? stats.savedOutfits
                    : null;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      selectTab(tab.id)
                    }
                    className={[
                      "flex w-full items-center justify-between border px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-[0.15em] transition",
                      activeTab ===
                      tab.id
                        ? "border-[#1d1916] bg-[#1d1916] text-[#f7f3ec]"
                        : "border-transparent text-[#625a52] hover:bg-[#f7f3ec]",
                    ].join(" ")}
                  >
                    <span>
                      {tab.label}
                    </span>

                    {count !==
                      null && (
                      <span
                        className={[
                          "ml-3 text-xs",
                          activeTab ===
                          tab.id
                            ? "text-[#ddd1c2]"
                            : "text-[#9c9286]",
                        ].join(" ")}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="grid grid-cols-2 border-t border-[#1d1916]/10">
              <div className="border-r border-[#1d1916]/10 px-4 py-5 text-center">
                <p className="text-2xl font-semibold">
                  {stats.orders}
                </p>
                <p className="mt-1 text-sm uppercase tracking-[0.14em] text-[#958b80]">
                  Orders
                </p>
              </div>

              <div className="px-4 py-5 text-center">
                <p className="text-2xl font-semibold">
                  {stats.wishlist}
                </p>
                <p className="mt-1 text-sm uppercase tracking-[0.14em] text-[#958b80]">
                  Wishlist
                </p>
              </div>
            </div>
          </aside>

          <main>
            {sectionLoading && (
              <div className="mb-5 border border-[#1d1916]/10 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#8d8378]">
                Refreshing saved account data…
              </div>
            )}

            {activeTab ===
              "personal" && (
              <div className="border border-[#1d1916]/10 bg-white p-6 sm:p-8">
                <div className="border-b border-[#1d1916]/10 pb-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                    Personal information
                  </p>

                  <h2
                    className="mt-2 text-4xl sm:text-5xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Know your account.
                  </h2>

                  <p className="mt-3 max-w-xl text-base leading-7 text-[#746b62]">
                    Keep the details used across your Styleverse account current.
                  </p>
                </div>

                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Full name"
                    value={
                      profileForm.name
                    }
                    onChange={(event) =>
                      updateProfileField(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Your name"
                  />

                  <Field
                    label="Phone"
                    value={
                      profileForm.phone
                    }
                    onChange={(event) =>
                      updateProfileField(
                        "phone",
                        event.target.value
                      )
                    }
                    placeholder="Phone number"
                  />

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.17em] text-[#8a8075]">
                      Gender
                    </span>

                    <select
                      value={
                        profileForm.gender
                      }
                      onChange={(
                        event
                      ) =>
                        updateProfileField(
                          "gender",
                          event.target.value
                        )
                      }
                      className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-sm text-[#1d1916] outline-none focus:border-[#1d1916] focus:bg-white"
                    >
                      <option value="">
                        Prefer not to say
                      </option>
                      <option value="men">
                        Men
                      </option>
                      <option value="women">
                        Women
                      </option>
                      <option value="kids">
                        Kids
                      </option>
                    </select>
                  </label>

                  <Field
                    label="Date of birth"
                    type="date"
                    value={
                      profileForm.DOB
                        ? String(
                            profileForm.DOB
                          ).slice(
                            0,
                            10
                          )
                        : ""
                    }
                    onChange={(event) =>
                      updateProfileField(
                        "DOB",
                        event.target.value
                      )
                    }
                  />

                  <Field
                    label="Email"
                    value={
                      user?.email ||
                      ""
                    }
                    onChange={() => {}}
                  />

                  <Field
                    label="Account role"
                    value={
                      user?.role ||
                      "customer"
                    }
                    onChange={() => {}}
                  />
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#1d1916]/10 pt-6">
                  <p className="text-sm text-[#8b8176]">
                    Account email and role are displayed from your authenticated profile.
                  </p>

                  <button
                    type="button"
                    disabled={
                      savingProfile
                    }
                    onClick={
                      saveProfile
                    }
                    className="border border-[#1d1916] bg-[#1d1916] px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingProfile
                      ? "Saving…"
                      : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            {activeTab ===
              "addresses" && (
              <div>
                <div className="mb-5 flex flex-col gap-4 border-b border-[#1d1916]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                      Saved addresses
                    </p>

                    <h2
                      className="mt-2 text-4xl sm:text-5xl"
                      style={{
                        fontFamily:
                          "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      Where we deliver.
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={
                      openNewAddress
                    }
                    className="border border-[#1d1916] bg-[#1d1916] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.17em] text-[#f7f3ec]"
                  >
                    + Add address
                  </button>
                </div>

                {showAddressForm && (
                  <div className="mb-6 border border-[#1d1916]/10 bg-white p-6 sm:p-8">
                    <div className="flex flex-col gap-2 border-b border-[#1d1916]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                          {editingAddressId
                            ? "Edit address"
                            : "New address"}
                        </p>

                        <h3
                          className="mt-1 text-3xl"
                          style={{
                            fontFamily:
                              "Georgia, 'Times New Roman', serif",
                          }}
                        >
                          Delivery details.
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={
                          closeAddressForm
                        }
                        className="text-sm font-semibold uppercase tracking-[0.15em] text-[#7d7369] underline"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Full name"
                        value={
                          addressForm.fullName
                        }
                        onChange={(
                          event
                        ) =>
                          updateAddressField(
                            "fullName",
                            event.target
                              .value
                          )
                        }
                      />

                      <Field
                        label="Phone"
                        value={
                          addressForm.phone
                        }
                        onChange={(
                          event
                        ) =>
                          updateAddressField(
                            "phone",
                            event.target
                              .value
                          )
                        }
                      />

                      <div className="sm:col-span-2">
                        <Field
                          label="Address line 1"
                          value={
                            addressForm.addressLine1
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "addressLine1",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Field
                          label="Address line 2"
                          value={
                            addressForm.addressLine2
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "addressLine2",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>

                      <Field
                        label="City"
                        value={
                          addressForm.city
                        }
                        onChange={(
                          event
                        ) =>
                          updateAddressField(
                            "city",
                            event.target
                              .value
                          )
                        }
                      />

                      <Field
                        label="State"
                        value={
                          addressForm.state
                        }
                        onChange={(
                          event
                        ) =>
                          updateAddressField(
                            "state",
                            event.target
                              .value
                          )
                        }
                      />

                      <Field
                        label="Postal code"
                        value={
                          addressForm.postalCode
                        }
                        onChange={(
                          event
                        ) =>
                          updateAddressField(
                            "postalCode",
                            event.target
                              .value
                          )
                        }
                      />

                      <Field
                        label="Country"
                        value={
                          addressForm.country
                        }
                        onChange={(
                          event
                        ) =>
                          updateAddressField(
                            "country",
                            event.target
                              .value
                          )
                        }
                      />

                      <label className="flex items-center gap-3 text-sm text-[#6f665d] sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={
                            addressForm.isDefault
                          }
                          onChange={(
                            event
                          ) =>
                            updateAddressField(
                              "isDefault",
                              event.target
                                .checked
                            )
                          }
                          className="h-4 w-4 accent-[#1d1916]"
                        />
                        Make this my default address
                      </label>
                    </div>

                    <div className="mt-7 flex justify-end border-t border-[#1d1916]/10 pt-5">
                      <button
                        type="button"
                        disabled={
                          Boolean(
                            addressBusyId
                          )
                        }
                        onClick={
                          saveAddress
                        }
                        className="border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.17em] text-[#f7f3ec] disabled:opacity-50"
                      >
                        {addressBusyId
                          ? "Saving…"
                          : editingAddressId
                          ? "Update address"
                          : "Save address"}
                      </button>
                    </div>
                  </div>
                )}

                {addresses.length ===
                0 ? (
                  <EmptyPanel
                    eyebrow="No saved addresses"
                    title="Add your first delivery address."
                    body="Your addresses will be available during checkout and inside your account."
                    action="Add address"
                    onAction={openNewAddress}
                  />
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {addresses.map(
                      (address) => {
                        const id =
                          getId(
                            address
                          );

                        return (
                          <article
                            key={id}
                            className="border border-[#1d1916]/10 bg-white p-6"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                                  Delivery address
                                </p>

                                <h3 className="mt-3 text-lg font-semibold">
                                  {address?.fullName ||
                                    address?.name ||
                                    "Recipient"}
                                </h3>
                              </div>

                              {address?.isDefault && (
                                <span className="border border-[#cdb898]/40 bg-[#f2e8da] px-2.5 py-1 text-sm font-semibold uppercase tracking-[0.12em] text-[#765c41]">
                                  Default
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-[#83796e]">
                              {address?.phone ||
                                "No phone"}
                            </p>

                            <p className="mt-4 text-sm leading-6 text-[#625a52]">
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
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ", "
                                )}
                            </p>

                            <div className="mt-6 flex gap-5 border-t border-[#1d1916]/10 pt-4">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditAddress(
                                    address
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.16em] underline"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  addressBusyId ===
                                  id
                                }
                                onClick={() =>
                                  deleteAddress(
                                    id
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700 underline disabled:opacity-50"
                              >
                                {addressBusyId ===
                                id
                                  ? "Removing…"
                                  : "Remove"}
                              </button>
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab ===
              "orders" && (
              <div>
                <div className="border-b border-[#1d1916]/10 pb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                    Purchase history
                  </p>

                  <h2
                    className="mt-2 text-4xl sm:text-5xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Your orders.
                  </h2>
                </div>

                {orders.length ===
                0 ? (
                  <div className="mt-5">
                    <EmptyPanel
                      eyebrow="No orders"
                      title="Your first Styleverse order is still ahead."
                      body="Once you place a purchase, order status and history will appear here."
                      action="Browse shop"
                      to="/shop"
                    />
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {orders
                      .slice(0, 6)
                      .map(
                        (order) => {
                          const id =
                            getId(
                              order
                            );

                          const status =
                            getOrderStatus(
                              order
                            );

                          const count =
                            Array.isArray(
                              order?.items
                            )
                              ? order.items
                                  .reduce(
                                    (
                                      total,
                                      item
                                    ) =>
                                      total +
                                      Number(
                                        item?.quantity ||
                                          1
                                      ),
                                    0
                                  )
                              : 0;

                          return (
                            <article
                              key={id}
                              className="border border-[#1d1916]/10 bg-white p-5 sm:p-6"
                            >
                              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-xs font-semibold uppercase tracking-[0.19em] text-[#9a7655]">
                                      Order
                                    </span>

                                    <span className="text-sm text-[#777067]">
                                      #
                                      {String(
                                        id
                                      ).slice(
                                        -8
                                      )}
                                    </span>

                                    <span
                                      className={[
                                        "border px-2.5 py-1 text-sm font-semibold uppercase tracking-[0.12em]",
                                        statusClass(
                                          status
                                        ),
                                      ].join(
                                        " "
                                      )}
                                    >
                                      {getStatusLabel(
                                        status
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
                                    <p className="text-2xl font-semibold">
                                      {money(
                                        order?.totalAmount
                                      )}
                                    </p>

                                    <p className="text-sm uppercase tracking-[0.13em] text-[#948a7e]">
                                      {formatDate(
                                        order?.placedAt ||
                                          order?.createdAt
                                      )}{" "}
                                      ·{" "}
                                      {count}{" "}
                                      {count ===
                                      1
                                        ? "item"
                                        : "items"}
                                    </p>
                                  </div>
                                </div>

                                <Link
                                  to={`/orders/${id}`}
                                  className="border border-[#1d1916] px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em]"
                                >
                                  View order
                                </Link>
                              </div>
                            </article>
                          );
                        }
                      )}
                  </div>
                )}

                {orders.length >
                  6 && (
                  <div className="mt-5 text-right">
                    <Link
                      to="/orders"
                      className="text-xs font-semibold uppercase tracking-[0.16em] underline"
                    >
                      View all orders →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab ===
              "wishlist" && (
              <div>
                <div className="flex flex-col gap-4 border-b border-[#1d1916]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                      Saved shopping
                    </p>

                    <h2
                      className="mt-2 text-4xl sm:text-5xl"
                      style={{
                        fontFamily:
                          "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      Wishlist.
                    </h2>
                  </div>

                  <Link
                    to="/wishlist"
                    className="text-xs font-semibold uppercase tracking-[0.16em] underline"
                  >
                    Open full wishlist →
                  </Link>
                </div>

                {wishlist.length ===
                0 ? (
                  <div className="mt-5">
                    <EmptyPanel
                      eyebrow="Nothing saved"
                      title="Keep the pieces you love close."
                      body="Your wishlist is where products you are considering can stay ready for later."
                      action="Explore pieces"
                      to="/shop"
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {wishlist
                      .slice(0, 8)
                      .map(
                        (raw) => {
                          const product =
                            raw?.productId &&
                            typeof raw.productId ===
                              "object"
                              ? raw.productId
                              : raw;

                          const id =
                            getId(
                              product
                            );

                          const image =
                            getProductImage(
                              product
                            );

                          return (
                            <article
                              key={id}
                              className="overflow-hidden border border-[#1d1916]/10 bg-white"
                            >
                              <div className="aspect-[4/5] bg-[#eee8df]">
                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt={
                                      product?.name ||
                                      "Wishlist item"
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full place-items-center text-center text-sm uppercase tracking-[0.14em] text-[#948a80]">
                                    No image
                                  </div>
                                )}
                              </div>

                              <div className="p-4">
                                <p className="line-clamp-2 text-sm font-semibold">
                                  {product?.name ||
                                    "Saved product"}
                                </p>

                                <p className="mt-2 text-sm text-[#7e756b]">
                                  {money(
                                    product?.price
                                  )}
                                </p>

                                {id && (
                                  <Link
                                    to={`/product/${id}`}
                                    className="mt-4 inline-flex text-sm font-semibold uppercase tracking-[0.16em] underline"
                                  >
                                    View piece
                                  </Link>
                                )}
                              </div>
                            </article>
                          );
                        }
                      )}
                  </div>
                )}
              </div>
            )}

            {activeTab ===
              "designs" && (
              <div>
                <div className="flex flex-col gap-4 border-b border-[#1d1916]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                      Personal creations
                    </p>

                    <h2
                      className="mt-2 text-4xl sm:text-5xl"
                      style={{
                        fontFamily:
                          "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      Saved designs.
                    </h2>
                  </div>

                  <Link
                    to="/studio"
                    className="text-xs font-semibold uppercase tracking-[0.16em] underline"
                  >
                    Open Studio →
                  </Link>
                </div>

                {designs.length ===
                0 ? (
                  <div className="mt-5">
                    <EmptyPanel
                      eyebrow="No saved designs"
                      title="Your custom pieces will live here."
                      body="Saved custom designs from Outfit Studio will appear here once that module is in active use."
                      action="Open Studio"
                      to="/studio"
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                    {designs
                      .slice(0, 9)
                      .map(
                        (design) => {
                          const id =
                            getId(
                              design
                            );

                          const image =
                            getDesignImage(
                              design
                            );

                          const attrs =
                            design?.attributes ||
                            {};

                          return (
                            <article
                              key={id}
                              className="border border-[#1d1916]/10 bg-white"
                            >
                              <div className="aspect-[4/5] overflow-hidden bg-[#eee8df]">
                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt={
                                      design?.title ||
                                      "Saved design"
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full place-items-center px-6 text-center text-sm uppercase tracking-[0.14em] text-[#948a80]">
                                    Preview will appear here
                                  </div>
                                )}
                              </div>

                              <div className="p-4">
                                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                                  Custom design
                                </p>

                                <h3 className="mt-2 line-clamp-2 text-sm font-semibold">
                                  {design?.title ||
                                    "Saved Styleverse design"}
                                </h3>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {[
                                    attrs?.color,
                                    attrs?.pattern,
                                    attrs?.sleeveStyle,
                                    attrs?.neckDesign,
                                    attrs?.length,
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .slice(
                                      0,
                                      3
                                    )
                                    .map(
                                      (
                                        value
                                      ) => (
                                        <span
                                          key={
                                            value
                                          }
                                          className="border border-[#1d1916]/10 bg-[#f8f4ed] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[#81776c]"
                                        >
                                          {
                                            value
                                          }
                                        </span>
                                      )
                                    )}
                                </div>

                                <p className="mt-4 text-sm font-semibold">
                                  {money(
                                    design?.price
                                  )}
                                </p>

                                <p className="mt-1 text-sm uppercase tracking-[0.1em] text-[#9a9084]">
                                  {formatDate(
                                    design?.createdAt
                                  )}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => addDesignToCart(design)}
                                  disabled={creativeBusyId === `design-cart-${id}`}
                                  className="mt-4 inline-flex w-full items-center justify-center border border-[#1d1916] bg-[#1d1916] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7f3ec] transition hover:bg-[#332c27] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {creativeBusyId === `design-cart-${id}`
                                    ? "Adding…"
                                    : "Add to Bag"}
                                </button>
                              </div>
                            </article>
                          );
                        }
                      )}
                  </div>
                )}
              </div>
            )}

            {activeTab ===
              "outfits" && (
              <div>
                <div className="flex flex-col gap-4 border-b border-[#1d1916]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                      Complete looks
                    </p>

                    <h2
                      className="mt-2 text-4xl sm:text-5xl"
                      style={{
                        fontFamily:
                          "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      Saved outfits.
                    </h2>
                  </div>

                  <Link
                    to="/builder"
                    className="text-xs font-semibold uppercase tracking-[0.16em] underline"
                  >
                    Open Outfit Builder →
                  </Link>
                </div>

                {outfits.length ===
                0 ? (
                  <div className="mt-5">
                    <EmptyPanel
                      eyebrow="No saved outfits"
                      title="Build a look worth saving."
                      body="Saved Mix & Match outfits will appear here once the Outfit Builder is active."
                      action="Open Builder"
                      to="/builder"
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                    {outfits
                      .slice(0, 9)
                      .map(
                        (outfit) => {
                          const id =
                            getId(
                              outfit
                            );

                          const image =
                            getOutfitImage(
                              outfit
                            );

                          const itemCount =
                            Array.isArray(
                              outfit?.items
                            )
                              ? outfit.items.length
                              : 0;

                          return (
                            <article
                              key={id}
                              className="border border-[#1d1916]/10 bg-white"
                            >
                              <div className="aspect-[4/5] overflow-hidden bg-[#eee8df]">
                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt={
                                      outfit?.name ||
                                      "Saved outfit"
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="grid h-full place-items-center px-6 text-center text-sm uppercase tracking-[0.14em] text-[#948a80]">
                                    Outfit preview will appear here
                                  </div>
                                )}
                              </div>

                              <div className="p-4">
                                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                                  Saved outfit
                                </p>

                                <h3 className="mt-2 line-clamp-2 text-sm font-semibold">
                                  {outfit?.name ||
                                    "Untitled outfit"}
                                </h3>

                                <p className="mt-2 text-sm text-[#7a7167]">
                                  {itemCount}{" "}
                                  {itemCount ===
                                  1
                                    ? "piece"
                                    : "pieces"}{" "}
                                  in this look
                                </p>

                                <p className="mt-3 text-sm uppercase tracking-[0.1em] text-[#9a9084]">
                                  {formatDate(
                                    outfit?.createdAt
                                  )}
                                </p>

                                <div className="mt-4 grid gap-2">
                                  <Link
                                    to={`/builder?outfitId=${id}`}
                                    className="inline-flex items-center justify-center border border-[#1d1916] bg-[#1d1916] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7f3ec] transition hover:bg-[#332c27]"
                                  >
                                    Open / Edit outfit
                                  </Link>

                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => shareSavedOutfit(outfit)}
                                      disabled={creativeBusyId === `outfit-share-${id}`}
                                      className="border border-[#1d1916]/15 bg-white px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1d1916] transition hover:bg-[#faf8f4] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {creativeBusyId === `outfit-share-${id}` ? "Sharing…" : "Share"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => addSavedOutfitToCart(outfit)}
                                      disabled={creativeBusyId === `outfit-cart-${id}`}
                                      className="border border-[#1d1916]/15 bg-[#f0e8dd] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1d1916] transition hover:bg-[#e7dccf] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {creativeBusyId === `outfit-cart-${id}` ? "Adding…" : "Add to Bag"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        }
                      )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}