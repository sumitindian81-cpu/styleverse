import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiJson, apiRequest, getAuthToken } from "../utils/api";

function imageUrl(product) {
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

const blankAddress = {
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

function normalizeAddressList(response) {
  const list =
    response?.data?.addresses ||
    response?.data?.items ||
    response?.addresses ||
    response?.items ||
    [];

  return Array.isArray(list) ? list : [];
}

function getAddressId(address) {
  return address?._id || address?.id || "";
}

function formatAddress(address) {
  return [
    address?.addressLine1,
    address?.addressLine2,
    address?.city,
    address?.state,
    address?.postalCode,
    address?.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getItemName(item) {
  return (
    item?.productId?.name ||
    item?.customDesignId?.title ||
    "Styleverse item"
  );
}

function getItemPrice(item) {
  return Number(
    item?.productId?.price ??
      item?.customDesignId?.price ??
      0
  );
}

function getItemImage(item) {
  const product = item?.productId;
  const design = item?.customDesignId;

  if (product) {
    return imageUrl(product);
  }

  return (
    design?.previewImageUrl ||
    imageUrl(design?.baseProductId)
  );
}

function CheckoutSkeleton() {
  return (
    <section className="min-h-screen bg-[#f7f3ec] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="h-3 w-24 bg-[#e6dfd4]" />
        <div className="mt-4 h-12 w-60 bg-[#e6dfd4]" />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <div className="h-20 bg-[#e6dfd4]" />
            <div className="h-[520px] bg-[#e6dfd4]" />
          </div>

          <div className="h-[520px] bg-white" />
        </div>
      </div>
    </section>
  );
}

function Stepper({ step, setStep }) {
  const steps = [
    { id: 1, label: "Address" },
    { id: 2, label: "Delivery" },
    { id: 3, label: "Payment" },
    { id: 4, label: "Review" },
  ];

  return (
    <div className="grid grid-cols-4 border-y border-[#1d1916]/10">
      {steps.map((item, index) => {
        const current = step === item.id;
        const completed = item.id < step;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (completed) {
                setStep(item.id);
              }
            }}
            disabled={!completed && !current}
            className={[
              "relative px-2 py-4 text-left transition sm:px-4",
              index > 0
                ? "border-l border-[#1d1916]/10"
                : "",
              current
                ? "bg-[#1d1916] text-[#f7f3ec]"
                : "bg-transparent text-[#8b8278]",
              completed
                ? "cursor-pointer text-[#433b34] hover:bg-white"
                : "cursor-default",
            ].join(" ")}
          >
            <div className="text-[8px] font-semibold uppercase tracking-[0.2em] sm:text-[9px]">
              0{item.id}
            </div>

            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-[11px]">
              {item.label}
            </div>

            {current && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#c9a875]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [idempotencyKey] = useState(() =>
    `styleverse-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const [cart, setCart] = useState({ items: [] });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] =
    useState("");

  const [addressForm, setAddressForm] =
    useState(blankAddress);
  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const [delivery, setDelivery] =
    useState("standard");

  const [paymentMethod, setPaymentMethod] =
    useState("cod");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [serverSummary, setServerSummary] =
    useState(null);
  const [summaryLoading, setSummaryLoading] =
    useState(false);

  const items = Array.isArray(cart?.items)
    ? cart.items
    : [];

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

  const deliveryFee =
    delivery === "express" ? 149 : 0;

  const subtotal = Number(
    serverSummary?.subtotal ??
      fallbackSubtotal
  );

  const serverShipping = Number(
    serverSummary?.shippingFee ??
      deliveryFee
  );

  const total = Number(
    serverSummary?.totalAmount ??
      subtotal + serverShipping
  );

  const selectedAddress = addresses.find(
    (address) =>
      String(getAddressId(address)) ===
      String(selectedAddressId)
  );

  const totalItems = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item?.quantity || 0),
        0
      ),
    [items]
  );

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!getAuthToken()) {
      setLoading(false);
      return;
    }

    try {
      const [cartResponse, addressResponse] =
        await Promise.all([
          apiRequest("/cart"),
          apiRequest("/addresses"),
        ]);

      const nextCart =
        cartResponse?.data?.cart || {
          items: [],
        };

      const nextAddresses =
        normalizeAddressList(
          addressResponse
        );

      setCart(nextCart);
      setAddresses(nextAddresses);

      const defaultAddress =
        nextAddresses.find(
          (address) =>
            address?.isDefault === true
        ) || nextAddresses[0];

      if (defaultAddress) {
        setSelectedAddressId(
          getAddressId(defaultAddress)
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Could not load checkout information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServerSummary =
    useCallback(async () => {
      if (!getAuthToken()) return;

      setSummaryLoading(true);

      try {
        const response = await apiRequest(
          "/cart/checkout"
        );

        setServerSummary(
          response?.data || null
        );
      } catch {
        setServerSummary(null);
      } finally {
        setSummaryLoading(false);
      }
    }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!loading && items.length > 0) {
      loadServerSummary();
    }
  }, [
    loading,
    items.length,
    loadServerSummary,
  ]);

  async function saveAddress() {
    setError("");
    setMessage("");

    if (!addressForm.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!addressForm.phone.trim()) {
      setError("Phone is required.");
      return;
    }

    if (!addressForm.addressLine1.trim()) {
      setError("Address Line 1 is required.");
      return;
    }

    if (!addressForm.city.trim()) {
      setError("City is required.");
      return;
    }

    if (!addressForm.state.trim()) {
      setError("State is required.");
      return;
    }

    const normalizedPhone = addressForm.phone.replace(/\D/g, "");
    const normalizedPostalCode =
      addressForm.postalCode.replace(/\D/g, "");

    if (!normalizedPhone) {
      setError("Phone is required.");
      return;
    }

    if (normalizedPhone.length !== 10) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    if (!normalizedPostalCode) {
      setError("Postal code is required.");
      return;
    }

    if (normalizedPostalCode.length !== 6) {
      setError("Enter a valid 6-digit postal code.");
      return;
    }

    setSavingAddress(true);

    try {
      const response = await apiJson(
        "/addresses",
        {
          method: "POST",
          data: {
            ...addressForm,
            phone: normalizedPhone,
            postalCode: normalizedPostalCode,
            country:
              addressForm.country?.trim() || "India",
          },
        }
      );

      const newAddress =
        response?.data?.address ||
        response?.data?.item ||
        response?.data ||
        null;

      const newId = getAddressId(newAddress);

      if (newAddress && newId) {
        setAddresses((current) => [
          newAddress,
          ...current,
        ]);
        setSelectedAddressId(newId);
      } else {
        const refreshed =
          await apiRequest("/addresses");

        const refreshedList =
          normalizeAddressList(refreshed);

        setAddresses(refreshedList);

        const refreshedDefault =
          refreshedList.find(
            (address) =>
              address?.isDefault === true
          ) || refreshedList[0];

        if (refreshedDefault) {
          setSelectedAddressId(
            getAddressId(refreshedDefault)
          );
        }
      }

      setAddressForm({
        ...blankAddress,
      });
      setShowAddressForm(false);
      setMessage("Address saved successfully.");
    } catch (err) {
      setError(
        err?.message ||
          "Could not save this address."
      );
    } finally {
      setSavingAddress(false);
    }
  }

  function goNext() {
    setError("");
    setMessage("");

    if (step === 1 && !selectedAddressId) {
      setError(
        "Please select or add a delivery address."
      );
      return;
    }

    if (step < 4) {
      setStep((current) => current + 1);
    }
  }

  function goBack() {
    setError("");
    setMessage("");

    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  async function placeCodOrder() {
    setError("");
    setMessage("");

    if (!selectedAddressId) {
      setError(
        "Please select a delivery address."
      );
      setStep(1);
      return;
    }

    setPlacing(true);

    try {
      const response = await apiJson(
        "/orders/cod",
        {
          method: "POST",
          data: {
            addressId: selectedAddressId,
            idempotencyKey,
          },
        }
      );

      const orderId =
        response?.data?.order?._id ||
        response?.data?.order?.id ||
        response?.data?._id ||
        response?.data?.id ||
        "";

      localStorage.removeItem(
        "styleverse_applied_coupon"
      );

      navigate(
        orderId
          ? `/orders/${orderId}`
          : "/orders"
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not place your COD order."
      );
    } finally {
      setPlacing(false);
    }
  }

  async function loadRazorpayScript() {
    if (window.Razorpay) {
      return true;
    }

    return new Promise((resolve) => {
      const existing =
        document.querySelector(
          'script[data-styleverse-razorpay="true"]'
        );

      if (existing) {
        existing.addEventListener(
          "load",
          () =>
            resolve(
              Boolean(window.Razorpay)
            )
        );

        existing.addEventListener(
          "error",
          () => resolve(false)
        );

        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;
      script.dataset.styleverseRazorpay =
        "true";

      script.onload = () =>
        resolve(
          Boolean(window.Razorpay)
        );

      script.onerror = () =>
        resolve(false);

      document.body.appendChild(script);
    });
  }

  async function startRazorpayPayment() {
    setError("");
    setMessage("");

    if (!selectedAddressId) {
      setError(
        "Please select a delivery address."
      );
      setStep(1);
      return;
    }

    setPlacing(true);

    try {
      const loaded =
        await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Razorpay could not be loaded. Check your internet connection."
        );
      }

      const response = await apiJson(
        "/payments/razorpay/create-order",
        {
          method: "POST",
          data: {
            addressId: selectedAddressId,
            idempotencyKey,
          },
        }
      );

      const data = response?.data || {};

      if (
        !data.razorpayKeyId ||
        !data.razorpayOrderId
      ) {
        throw new Error(
          "Invalid Razorpay create-order response."
        );
      }

      const razorpay =
        new window.Razorpay({
          key: data.razorpayKeyId,
          order_id:
            data.razorpayOrderId,
          amount:
            data.amountInPaise,
          currency:
            data.currency || "INR",
          name: "Styleverse",
          description:
            "Styleverse Order",
          handler: async (
            paymentResponse
          ) => {
            try {
              await apiJson(
                "/payments/razorpay/verify",
                {
                  method: "POST",
                  data: {
                    razorpay_order_id:
                      paymentResponse.razorpay_order_id,
                    razorpay_payment_id:
                      paymentResponse.razorpay_payment_id,
                    razorpay_signature:
                      paymentResponse.razorpay_signature,
                    addressId:
                      selectedAddressId,
                    idempotencyKey,
                  },
                }
              );

              localStorage.removeItem(
                "styleverse_applied_coupon"
              );

              const verifiedOrderId =
                response?.data?.order?._id ||
                response?.data?.order?.id ||
                response?.data?._id ||
                response?.data?.id ||
                "";

              navigate(
                verifiedOrderId
                  ? `/orders/${verifiedOrderId}`
                  : "/orders"
              );
            } catch (err) {
              setError(
                err?.message ||
                  "Payment verification failed."
              );
              setPlacing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setPlacing(false);
              setMessage(
                "Payment window closed."
              );
            },
          },
          theme: {
            color: "#1d1916",
          },
        });

      razorpay.open();
    } catch (err) {
      setError(
        err?.message ||
          "Could not start online payment."
      );
      setPlacing(false);
    }
  }

  async function placeOrder() {
    if (paymentMethod === "cod") {
      await placeCodOrder();
      return;
    }

    await startRazorpayPayment();
  }

  if (loading) {
    return <CheckoutSkeleton />;
  }

  if (!getAuthToken()) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse / Checkout
          </p>

          <h1
            className="mt-4 text-5xl tracking-[-0.035em] text-[#1d1916] sm:text-6xl"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Sign in to continue.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
            Your selection is waiting. Sign in to choose a delivery address and place your order.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/shop"
              className="border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
            >
              Return to collection
            </Link>

            <Link
              to="/login"
              className="border border-[#1d1916]/20 bg-white px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d1916]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="min-h-screen bg-[#f7f3ec] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse / Checkout
          </p>

          <h1
            className="mt-4 text-5xl tracking-[-0.035em]"
            style={{
              fontFamily:
                "Georgia, 'Times New Roman', serif",
            }}
          >
            Your bag is empty.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#70685f]">
            Add something from the collection before continuing to checkout.
          </p>

          <Link
            to="/shop"
            className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec]"
          >
            Explore the collection
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <div className="mx-auto max-w-[1500px] px-4 py-9 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-[#1d1916]/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
              Styleverse / Secure checkout
            </p>

            <h1
              className="mt-3 text-5xl leading-none tracking-[-0.04em] sm:text-6xl"
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
              }}
            >
              Complete your order.
            </h1>
          </div>

          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="text-2xl font-semibold">
                {totalItems}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#92887d]">
                Items
              </p>
            </div>

            <Link
              to="/cart"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6e665d] transition hover:text-[#1d1916]"
            >
              Edit bag →
            </Link>
          </div>
        </div>

        <div className="mt-7">
          <Stepper
            step={step}
            setStep={(nextStep) => {
              setError("");
              setMessage("");
              setStep(nextStep);
            }}
          />
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

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_410px]">
          {/* Main checkout panel */}
          <main className="min-w-0 border border-[#1d1916]/10 bg-white">
            {step === 1 && (
              <div className="p-6 sm:p-8 lg:p-9">
                <div className="flex flex-col gap-5 border-b border-[#1d1916]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                      Step 01
                    </p>

                    <h2
                      className="mt-2 text-4xl tracking-[-0.025em]"
                      style={{
                        fontFamily:
                          "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      Delivery address
                    </h2>

                    <p className="mt-2 text-sm text-[#70685f]">
                      Choose where you would like your order delivered.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAddressForm(
                        (current) => !current
                      )
                    }
                    className="w-fit border border-[#1d1916] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.17em] transition hover:bg-[#f7f3ec]"
                  >
                    {showAddressForm
                      ? "Close form"
                      : "Add new address"}
                  </button>
                </div>

                {showAddressForm && (
                  <div className="mt-7 border border-[#1d1916]/10 bg-[#fbf8f3] p-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["fullName", "Full name"],
                        ["phone", "Phone"],
                        ["addressLine1", "Address line 1"],
                        ["addressLine2", "Address line 2 (optional)"],
                        ["city", "City"],
                        ["state", "State"],
                        ["postalCode", "Postal code"],
                      ].map(([key, label]) => (
                        <label
                          key={key}
                          className={
                            key === "addressLine1" ||
                            key === "addressLine2"
                              ? "sm:col-span-2"
                              : ""
                          }
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5e564e]">
                            {label}
                          </span>

                          <input
                            value={addressForm[key]}
                            onChange={(event) =>
                              setAddressForm(
                                (current) => ({
                                  ...current,
                                  [key]:
                                    event.target.value,
                                })
                              )
                            }
                            autoComplete={
                              key === "fullName"
                                ? "name"
                                : key === "phone"
                                ? "tel"
                                : key === "addressLine1"
                                ? "street-address"
                                : key === "city"
                                ? "address-level2"
                                : key === "state"
                                ? "address-level1"
                                : key === "postalCode"
                                ? "postal-code"
                                : "address-line2"
                            }
                            className="mt-2 h-12 w-full border border-[#1d1916]/15 bg-white px-3 text-sm outline-none focus:border-[#1d1916]"
                          />
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={savingAddress}
                      onClick={saveAddress}
                      className="mt-5 bg-[#1d1916] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] disabled:opacity-45"
                    >
                      {savingAddress
                        ? "Saving..."
                        : "Save address"}
                    </button>
                  </div>
                )}

                <div className="mt-7 space-y-3">
                  {addresses.length === 0 ? (
                    <div className="border border-dashed border-[#1d1916]/20 bg-[#fbf8f3] p-7 text-sm text-[#736b62]">
                      No saved addresses yet. Add your first delivery address above.
                    </div>
                  ) : (
                    addresses.map((address) => {
                      const addressId =
                        getAddressId(address);

                      const selected =
                        String(addressId) ===
                        String(selectedAddressId);

                      return (
                        <button
                          key={addressId}
                          type="button"
                          onClick={() =>
                            setSelectedAddressId(
                              addressId
                            )
                          }
                          className={[
                            "w-full border p-5 text-left transition",
                            selected
                              ? "border-[#1d1916] bg-[#fbf8f3]"
                              : "border-[#1d1916]/10 bg-white hover:border-[#1d1916]/30",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-5">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold">
                                  {address.fullName}
                                </span>

                                {address.isDefault && (
                                  <span className="border border-[#cbb38e]/40 bg-[#efe4d6] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#755b40]">
                                    Default
                                  </span>
                                )}
                              </div>

                              <p className="mt-2 text-sm text-[#6f675e]">
                                {address.phone}
                              </p>

                              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f675e]">
                                {formatAddress(
                                  address
                                )}
                              </p>
                            </div>

                            <span
                              className={[
                                "mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                                selected
                                  ? "border-[#1d1916] bg-[#1d1916]"
                                  : "border-[#bbb2a7]",
                              ].join(" ")}
                              aria-hidden="true"
                            >
                              {selected && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[#f7f3ec]" />
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="p-6 sm:p-8 lg:p-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                  Step 02
                </p>

                <h2
                  className="mt-2 text-4xl tracking-[-0.025em]"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  Choose delivery.
                </h2>

                <p className="mt-2 text-sm text-[#70685f]">
                  Select the delivery pace that suits you.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      id: "standard",
                      name: "Standard delivery",
                      description:
                        "Regular delivery service.",
                      price: null,
                    },
                    {
                      id: "express",
                      name: "Express delivery",
                      description:
                        "Faster delivery preference.",
                      price: null,
                    },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setDelivery(option.id)
                      }
                      className={[
                        "w-full border p-6 text-left transition",
                        delivery === option.id
                          ? "border-[#1d1916] bg-[#fbf8f3]"
                          : "border-[#1d1916]/10 hover:border-[#1d1916]/30",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-5">
                        <div>
                          <div className="text-sm font-semibold">
                            {option.name}
                          </div>

                          <div className="mt-1 text-sm text-[#70685f]">
                            {option.description}
                          </div>
                        </div>

                        <div className="text-right text-sm font-semibold whitespace-nowrap">
                          {option.price === null
                            ? "Server calculated"
                            : option.price === 0
                            ? "Free"
                            : money(option.price)}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <span
                          className={[
                            "h-4 w-4 rounded-full border",
                            delivery === option.id
                              ? "border-[#1d1916] bg-[#1d1916]"
                              : "border-[#bab2a8]",
                          ].join(" ")}
                        />
                        <span className="text-[9px] uppercase tracking-[0.14em] text-[#8c8378]">
                          {delivery === option.id
                            ? "Selected"
                            : "Choose"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-6 sm:p-8 lg:p-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                  Step 03
                </p>

                <h2
                  className="mt-2 text-4xl tracking-[-0.025em]"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  Select payment.
                </h2>

                <p className="mt-2 text-sm text-[#70685f]">
                  Choose how you would like to pay for this order.
                </p>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentMethod("cod")
                    }
                    className={[
                      "w-full border p-6 text-left transition",
                      paymentMethod === "cod"
                        ? "border-[#1d1916] bg-[#fbf8f3]"
                        : "border-[#1d1916]/10 hover:border-[#1d1916]/30",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <div className="text-sm font-semibold">
                          Cash on Delivery
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[#70685f]">
                          Pay when your order arrives.
                        </p>
                      </div>

                      <span
                        className={[
                          "h-5 w-5 shrink-0 rounded-full border",
                          paymentMethod === "cod"
                            ? "border-[#1d1916] bg-[#1d1916]"
                            : "border-[#bab2a8]",
                        ].join(" ")}
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        "razorpay"
                      )
                    }
                    className={[
                      "w-full border p-6 text-left transition",
                      paymentMethod === "razorpay"
                        ? "border-[#1d1916] bg-[#fbf8f3]"
                        : "border-[#1d1916]/10 hover:border-[#1d1916]/30",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <div className="text-sm font-semibold">
                          Online Payment
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[#70685f]">
                          Card, UPI and other Razorpay payment options.
                        </p>
                      </div>

                      <span
                        className={[
                          "h-5 w-5 shrink-0 rounded-full border",
                          paymentMethod === "razorpay"
                            ? "border-[#1d1916] bg-[#1d1916]"
                            : "border-[#bab2a8]",
                        ].join(" ")}
                      />
                    </div>
                  </button>
                </div>

                <div className="mt-6 border border-[#1d1916]/10 bg-[#fbf8f3] p-5 text-[10px] leading-5 text-[#777067]">
                  Online payment opens the Razorpay checkout and verifies the payment on the Styleverse backend before the order is completed.
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="p-6 sm:p-8 lg:p-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                  Step 04
                </p>

                <h2
                  className="mt-2 text-4xl tracking-[-0.025em]"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  Review your order.
                </h2>

                <p className="mt-2 text-sm text-[#70685f]">
                  Everything looks good? Place your order below.
                </p>

                <div className="mt-4 border border-[#1d1916]/10 bg-[#f8f2e8] px-4 py-3 text-[10px] leading-5 text-[#756b60]">
                  Final stock, coupon validity, shipping and total are checked again by the Styleverse server when you place the order.
                </div>

                <div className="mt-8 space-y-4">
                  <div className="border border-[#1d1916]/10 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#91877c]">
                        Delivery address
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setStep(1)
                        }
                        className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#71685e] hover:text-[#1d1916]"
                      >
                        Edit
                      </button>
                    </div>

                    {selectedAddress ? (
                      <div className="mt-4 text-sm leading-6 text-[#5f574f]">
                        <p className="font-semibold text-[#1d1916]">
                          {selectedAddress.fullName}
                        </p>
                        <p>
                          {selectedAddress.phone}
                        </p>
                        <p>
                          {formatAddress(
                            selectedAddress
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-red-600">
                        No delivery address selected.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="border border-[#1d1916]/10 p-5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#91877c]">
                        Delivery
                      </p>

                      <p className="mt-3 text-sm font-semibold">
                        {delivery ===
                        "express"
                          ? "Express delivery"
                          : "Standard delivery"}
                      </p>

                      <p className="mt-1 text-xs text-[#81786e]">
                        {serverShipping === 0
                          ? "Free"
                          : `${money(serverShipping)} · server calculated`}
                      </p>
                    </div>

                    <div className="border border-[#1d1916]/10 p-5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#91877c]">
                        Payment
                      </p>

                      <p className="mt-3 text-sm font-semibold">
                        {paymentMethod ===
                        "razorpay"
                          ? "Online payment"
                          : "Cash on Delivery"}
                      </p>

                      <p className="mt-1 text-xs text-[#81786e]">
                        Secure checkout
                      </p>
                    </div>
                  </div>

                  <div className="border border-[#1d1916]/10 bg-[#fbf8f3] p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#91877c]">
                      Items
                    </p>

                    <div className="mt-4 divide-y divide-[#1d1916]/10">
                      {items.map((item) => {
                        const image =
                          getItemImage(item);

                        const name =
                          getItemName(item);

                        const qty =
                          Number(
                            item?.quantity ||
                              0
                          );

                        const lineTotal =
                          getItemPrice(item) *
                          qty;

                        return (
                          <div
                            key={
                              item?._id ||
                              `${name}-${lineTotal}`
                            }
                            className="flex items-center gap-4 py-4"
                          >
                            <div className="h-16 w-14 shrink-0 overflow-hidden bg-[#e9e1d5]">
                              {image ? (
                                <img
                                  src={image}
                                  alt={name}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {name}
                              </p>

                              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#8e857b]">
                                Qty {qty}
                              </p>
                            </div>

                            <p className="text-sm font-semibold">
                              {money(
                                lineTotal
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation controls */}
            <div className="flex items-center justify-between gap-4 border-t border-[#1d1916]/10 bg-[#fbf8f3] px-6 py-5 sm:px-8 lg:px-9">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="border border-[#1d1916]/20 bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] transition hover:border-[#1d1916]"
                >
                  ← Back
                </button>
              ) : (
                <Link
                  to="/cart"
                  className="border border-[#1d1916]/20 bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] transition hover:border-[#1d1916]"
                >
                  ← Cart
                </Link>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="bg-[#1d1916] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] transition hover:bg-[#302b27]"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={placing}
                  onClick={placeOrder}
                  className="bg-[#1d1916] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f7f3ec] transition hover:bg-[#302b27] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {placing
                    ? "Processing..."
                    : paymentMethod ===
                      "razorpay"
                    ? "Pay & place order"
                    : "Place COD order"}
                </button>
              )}
            </div>
          </main>

          {/* Summary */}
          <aside className="h-fit lg:sticky lg:top-28">
            <div className="border border-[#1d1916]/10 bg-white p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">
                Order summary
              </p>

              <h2
                className="mt-3 text-4xl leading-tight"
                style={{
                  fontFamily:
                    "Georgia, 'Times New Roman', serif",
                }}
              >
                Your selection.
              </h2>

              <div className="mt-7 divide-y divide-[#1d1916]/10 border-y border-[#1d1916]/10">
                {items.map((item) => (
                  <div
                    key={item?._id}
                    className="flex items-center justify-between gap-4 py-4 text-sm"
                  >
                    <span className="min-w-0 truncate text-[#6d655c]">
                      {getItemName(item)} ×{" "}
                      {Number(
                        item?.quantity || 0
                      )}
                    </span>

                    <span className="shrink-0 font-semibold">
                      {money(
                        getItemPrice(item) *
                          Number(
                            item?.quantity || 0
                          )
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#70685f]">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    {money(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-[#70685f]">
                    Shipping
                  </span>

                  <span className="font-semibold text-emerald-700">
                    {summaryLoading
                      ? "…"
                      : serverShipping === 0
                      ? "Free"
                      : money(
                          serverShipping
                        )}
                  </span>
                </div>

                {Number(
                  serverSummary?.discount ||
                    0
                ) > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#70685f]">
                      Discount
                    </span>

                    <span className="font-semibold text-emerald-700">
                      −
                      {money(
                        serverSummary.discount
                      )}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4 border-t border-[#1d1916]/10 pt-5">
                  <span className="font-semibold">
                    Total
                  </span>

                  <span className="text-2xl font-semibold">
                    {summaryLoading
                      ? "…"
                      : money(total)}
                  </span>
                </div>
              </div>

              <div className="mt-6 bg-[#f1eadd] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#715d47]">
                  Secure checkout
                </p>

                <p className="mt-2 text-[10px] leading-5 text-[#756b60]">
                  Final stock and order totals are validated by the backend before the order is created.
                </p>
              </div>
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
                  Returns
                </p>
              </div>

              <div className="px-2 py-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.14em]">
                  Fast
                </p>
                <p className="mt-1 text-[8px] text-[#91887d]">
                  Delivery
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}