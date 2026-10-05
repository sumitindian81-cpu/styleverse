import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { apiJson, apiRequest } from "../../utils/api";

const ADMIN_NAV = [
  { label: "Dashboard", to: "/admin", end: true },
  { label: "Products", to: "/admin/products", end: true },
  { label: "Orders", to: "/admin/orders", end: true },
  { label: "Coupons", to: "/admin/coupons", end: true },
  { label: "Users", to: "/admin/users", end: true },
  { label: "Reports", to: "/admin/reports", end: true },
];

const EMPTY_FORM = {
  code: "",
  discountType: "percent",
  value: "",
  minOrderAmount: "0",
  maxDiscount: "",
  startDate: "",
  endDate: "",
  active: true,
};

function getId(item) {
  return item?._id || item?.id || "";
}

function normalizeCoupons(response) {
  const root =
    response?.data ?? response ?? {};

  const candidates = [
    root.coupons,
    root.items,
    root.data,
    response?.coupons,
    response?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeCoupon(response) {
  const root =
    response?.data ?? response ?? {};

  return (
    root.coupon ||
    root.item ||
    (root && !Array.isArray(root)
      ? root
      : null)
  );
}

function couponValue(coupon) {
  return Number(
    coupon?.value ??
      coupon?.discountValue ??
      0
  );
}

function couponMinOrder(coupon) {
  return Number(
    coupon?.minOrderAmount ??
      coupon?.minCartAmount ??
      0
  );
}

function couponMaxDiscount(coupon) {
  const value =
    coupon?.maxDiscount ??
    coupon?.maxCap;

  return value === null ||
    value === undefined ||
    value === ""
    ? ""
    : Number(value);
}

function formatDiscount(coupon) {
  const type = String(
    coupon?.discountType || "percent"
  ).toLowerCase();

  const value =
    couponValue(coupon);

  return type === "flat"
    ? `₹${value}`
    : `${value}%`;
}

function formatDateTime(value) {
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

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
}

function isCurrentlyActive(coupon) {
  const active =
    coupon?.active ??
    coupon?.isActive;

  if (active === false) {
    return false;
  }

  const now = Date.now();
  const start = coupon?.startDate
    ? new Date(
        coupon.startDate
      ).getTime()
    : null;
  const end = coupon?.endDate
    ? new Date(
        coupon.endDate
      ).getTime()
    : null;

  if (
    start &&
    !Number.isNaN(start) &&
    now < start
  ) {
    return false;
  }

  if (
    end &&
    !Number.isNaN(end) &&
    now > end
  ) {
    return false;
  }

  return true;
}

function statusClass(coupon) {
  return isCurrentlyActive(
    coupon
  )
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-[#1d1916]/10 bg-[#f7f3ec] text-[#71685f]";
}

function CouponSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse border border-[#1d1916]/10 bg-white p-5"
          >
            <div className="h-4 w-40 bg-[#e3dcd1]" />
            <div className="mt-3 h-3 w-56 bg-[#e3dcd1]" />
            <div className="mt-5 h-3 w-full bg-[#e3dcd1]" />
          </div>
        )
      )}
    </div>
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
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-[#81776c]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none transition placeholder:text-[#a59a8e] focus:border-[#1d1916] focus:bg-white"
      />
    </label>
  );
}

export default function AdminCoupons() {
  const [coupons, setCoupons] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const [form, setForm] =
    useState({
      ...EMPTY_FORM,
    });

  const loadCoupons = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await apiRequest(
            "/admin/coupons"
          );

        setCoupons(
          normalizeCoupons(
            response
          )
        );
      } catch (err) {
        setCoupons([]);
        setError(
          err?.message ||
            "Unable to load coupons."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const filteredCoupons =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return coupons;
      }

      return coupons.filter(
        (coupon) => {
          const haystack = [
            coupon?.code,
            coupon?.discountType,
            coupon?.active
              ? "active"
              : "inactive",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            term
          );
        }
      );
    }, [coupons, search]);

  const summary = useMemo(() => {
    return {
      total: coupons.length,
      active: coupons.filter(
        (coupon) =>
          isCurrentlyActive(
            coupon
          )
      ).length,
      inactive: coupons.filter(
        (coupon) =>
          !isCurrentlyActive(
            coupon
          )
      ).length,
      percent: coupons.filter(
        (coupon) =>
          String(
            coupon?.discountType ||
              ""
          ).toLowerCase() ===
          "percent"
      ).length,
    };
  }, [coupons]);

  function setField(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreate() {
    setEditingId("");
    setForm({
      ...EMPTY_FORM,
    });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function openEdit(coupon) {
    setEditingId(
      getId(coupon)
    );

    setForm({
      code:
        coupon?.code || "",
      discountType:
        String(
          coupon?.discountType ||
            "percent"
        ).toLowerCase(),
      value:
        couponValue(coupon)
          ? String(
              couponValue(
                coupon
              )
            )
          : "",
      minOrderAmount:
        String(
          couponMinOrder(
            coupon
          )
        ),
      maxDiscount:
        couponMaxDiscount(
          coupon
        ) === ""
          ? ""
          : String(
              couponMaxDiscount(
                coupon
              )
            ),
      startDate:
        toDateInput(
          coupon?.startDate
        ),
      endDate:
        toDateInput(
          coupon?.endDate
        ),
      active:
        coupon?.active ??
        coupon?.isActive ??
        true,
    });

    setShowForm(true);
    setError("");
    setMessage("");
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId("");
    setForm({
      ...EMPTY_FORM,
    });
  }

  function validateForm() {
    const code =
      form.code.trim().toUpperCase();

    if (!code) {
      return "Coupon code is required.";
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return "Coupon code can contain letters, numbers, underscores and hyphens.";
    }

    const value =
      Number(form.value);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return "Discount value must be greater than 0.";
    }

    if (
      form.discountType ===
        "percent" &&
      value > 100
    ) {
      return "Percentage discount cannot exceed 100.";
    }

    const minOrder =
      Number(form.minOrderAmount);

    if (
      !Number.isFinite(
        minOrder
      ) ||
      minOrder < 0
    ) {
      return "Minimum order amount is invalid.";
    }

    if (form.maxDiscount !== "") {
      const maxDiscount =
        Number(
          form.maxDiscount
        );

      if (
        !Number.isFinite(
          maxDiscount
        ) ||
        maxDiscount <= 0
      ) {
        return "Maximum discount must be greater than 0.";
      }
    }

    if (
      form.startDate &&
      form.endDate
    ) {
      const start =
        new Date(
          `${form.startDate}T00:00:00`
        ).getTime();

      const end =
        new Date(
          `${form.endDate}T23:59:59`
        ).getTime();

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start > end
      ) {
        return "End date must be on or after the start date.";
      }
    }

    return "";
  }

  async function saveCoupon() {
    setError("");
    setMessage("");

    const validation =
      validateForm();

    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);

    const payload = {
      code:
        form.code
          .trim()
          .toUpperCase(),
      discountType:
        form.discountType,
      value: Number(
        form.value
      ),
      minOrderAmount:
        Number(
          form.minOrderAmount || 0
        ),
      maxDiscount:
        form.maxDiscount === ""
          ? null
          : Number(
              form.maxDiscount
            ),
      startDate:
        form.startDate || null,
      endDate:
        form.endDate || null,
      active:
        Boolean(form.active),
    };

    try {
      const response =
        editingId
          ? await apiJson(
              `/admin/coupons/${editingId}`,
              {
                method: "PATCH",
                data: payload,
              }
            )
          : await apiJson(
              "/admin/coupons",
              {
                method: "POST",
                data: payload,
              }
            );

      const saved =
        normalizeCoupon(
          response
        );

      if (saved) {
        setCoupons(
          (current) =>
            editingId
              ? current.map(
                  (coupon) =>
                    getId(
                      coupon
                    ) ===
                    editingId
                      ? saved
                      : coupon
                )
              : [
                  saved,
                  ...current,
                ]
        );
      } else {
        await loadCoupons();
      }

      setMessage(
        editingId
          ? "Coupon updated successfully."
          : "Coupon created successfully."
      );

      closeForm();
    } catch (err) {
      setError(
        err?.message ||
          "Unable to save coupon."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoupon(
    coupon
  ) {
    const id = getId(coupon);

    if (!id) return;

    const confirmed =
      window.confirm(
        `Delete coupon “${
          coupon?.code ||
          "this coupon"
        }”?`
      );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setMessage("");

    try {
      await apiJson(
        `/admin/coupons/${id}`,
        {
          method: "DELETE",
        }
      );

      setCoupons((current) =>
        current.filter(
          (item) =>
            getId(item) !== id
        )
      );

      setMessage(
        "Coupon deleted successfully."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to delete coupon."
      );
    } finally {
      setDeletingId("");
    }
  }

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
                Promotion control
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
                      "Coupons" && (
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
                    Styleverse / Administration / Coupons
                  </p>

                  <h1
                    className="mt-3 text-5xl leading-none tracking-[-0.045em] sm:text-6xl lg:text-7xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    The offers.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#70685f]">
                    Create and curate promotional codes used across the Styleverse checkout.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/admin"
                    className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                  >
                    Back to dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={
                      openCreate
                    }
                    className="border border-[#1d1916] bg-[#1d1916] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f7f3ec]"
                  >
                    + Create coupon
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
                  Total
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {summary.total}
                </p>

                <p className="mt-1 text-sm text-[#8a8177]">
                  Coupons in the admin result
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Active
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {summary.active}
                </p>

                <p className="mt-1 text-sm text-[#8a8177]">
                  Currently usable by date and active flag
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Inactive
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {summary.inactive}
                </p>

                <p className="mt-1 text-sm text-[#8a8177]">
                  Expired, upcoming or disabled
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Percentage
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {summary.percent}
                </p>

                <p className="mt-1 text-sm text-[#8a8177]">
                  Percentage-based offers
                </p>
              </div>
            </section>

            <section className="mt-7 border border-[#1d1916]/10 bg-white p-5 sm:p-6">
              <label
                htmlFor="coupon-search"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#81776c]"
              >
                Search coupons
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <input
                    id="coupon-search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search by coupon code, type or status…"
                    className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none transition placeholder:text-[#a59a8e] focus:border-[#1d1916] focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadCoupons}
                  disabled={loading}
                  className="border border-[#1d1916]/20 bg-white px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Refreshing…" : "Refresh coupons"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#81776c]">
                  Showing{" "}
                  {filteredCoupons.length}{" "}
                  of {coupons.length}{" "}
                  coupons
                </p>

                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs font-semibold uppercase tracking-[0.12em] underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </section>

            {showForm && (
              <section className="mt-7 border border-[#1d1916]/10 bg-white p-5 sm:p-7">
                <div className="flex flex-col gap-3 border-b border-[#1d1916]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                      {editingId
                        ? "Edit promotion"
                        : "New promotion"}
                    </p>

                    <h2
                      className="mt-2 text-4xl sm:text-5xl"
                      style={{
                        fontFamily:
                          "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      {editingId
                        ? "Refine the offer."
                        : "Create an offer."}
                    </h2>
                  </div>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      closeForm
                    }
                    className="text-xs font-semibold uppercase tracking-[0.14em] underline disabled:opacity-50"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Coupon code"
                    value={
                      form.code
                    }
                    onChange={(event) =>
                      setField(
                        "code",
                        event.target.value
                      )
                    }
                    placeholder="STYLE20"
                  />

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-[#81776c]">
                      Discount type
                    </span>

                    <select
                      value={
                        form.discountType
                      }
                      onChange={(
                        event
                      ) =>
                        setField(
                          "discountType",
                          event.target
                            .value
                        )
                      }
                      className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none focus:border-[#1d1916] focus:bg-white"
                    >
                      <option value="percent">
                        Percentage
                      </option>
                      <option value="flat">
                        Flat amount
                      </option>
                    </select>
                  </label>

                  <Field
                    label={
                      form.discountType ===
                      "flat"
                        ? "Discount amount (₹)"
                        : "Discount percentage (%)"
                    }
                    type="number"
                    value={
                      form.value
                    }
                    onChange={(event) =>
                      setField(
                        "value",
                        event.target.value
                      )
                    }
                    placeholder={
                      form.discountType ===
                      "flat"
                        ? "500"
                        : "20"
                    }
                  />

                  <Field
                    label="Minimum order amount (₹)"
                    type="number"
                    value={
                      form.minOrderAmount
                    }
                    onChange={(event) =>
                      setField(
                        "minOrderAmount",
                        event.target
                          .value
                      )
                    }
                    placeholder="1999"
                  />

                  <Field
                    label="Maximum discount (₹)"
                    type="number"
                    value={
                      form.maxDiscount
                    }
                    onChange={(event) =>
                      setField(
                        "maxDiscount",
                        event.target
                          .value
                      )
                    }
                    placeholder="1000"
                  />

                  <Field
                    label="Start date"
                    type="date"
                    value={
                      form.startDate
                    }
                    onChange={(event) =>
                      setField(
                        "startDate",
                        event.target
                          .value
                      )
                    }
                  />

                  <Field
                    label="End date"
                    type="date"
                    value={
                      form.endDate
                    }
                    onChange={(event) =>
                      setField(
                        "endDate",
                        event.target
                          .value
                      )
                    }
                  />

                  <label className="flex items-center gap-3 self-end pb-1 text-sm text-[#655c53]">
                    <input
                      type="checkbox"
                      checked={
                        form.active
                      }
                      onChange={(event) =>
                        setField(
                          "active",
                          event.target
                            .checked
                        )
                      }
                      className="h-4 w-4 accent-[#1d1916]"
                    />

                    Keep this coupon active
                  </label>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-[#1d1916]/10 pt-6">
                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      closeForm
                    }
                    className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      saveCoupon
                    }
                    className="border border-[#1d1916] bg-[#1d1916] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f7f3ec] disabled:opacity-50"
                  >
                    {saving
                      ? "Saving…"
                      : editingId
                      ? "Update coupon"
                      : "Create coupon"}
                  </button>
                </div>
              </section>
            )}

            {error && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={
                    loadCoupons
                  }
                  className="text-sm font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {message && (
              <div className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <section className="mt-7">
              {loading ? (
                <CouponSkeleton />
              ) : filteredCoupons.length ===
                0 ? (
                <div className="border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                    Promotions
                  </p>

                  <h2
                    className="mt-4 text-4xl sm:text-5xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    No coupons found.
                  </h2>

                  <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#71685f]">
                    Create your first promotion or clear the search to see the current coupon list.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      openCreate();
                    }}
                    className="mt-7 border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#f7f3ec]"
                  >
                    + Create coupon
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden border border-[#1d1916]/10 bg-white xl:block">
                    <div className="grid grid-cols-[1.2fr_0.8fr_0.75fr_0.9fr_0.95fr_1.15fr] border-b border-[#1d1916]/10 bg-[#eee7dc] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#766b60]">
                      <span>Code</span>
                      <span>Discount</span>
                      <span>Minimum</span>
                      <span>Validity</span>
                      <span>Status</span>
                      <span className="text-right">
                        Actions
                      </span>
                    </div>

                    {filteredCoupons.map(
                      (coupon) => {
                        const id =
                          getId(
                            coupon
                          );

                        const maxDiscount =
                          couponMaxDiscount(
                            coupon
                          );

                        return (
                          <div
                            key={id}
                            className="grid grid-cols-[1.2fr_0.8fr_0.75fr_0.9fr_0.95fr_1.15fr] items-center border-b border-[#1d1916]/10 px-5 py-5 last:border-b-0"
                          >
                            <div>
                              <p className="text-base font-semibold tracking-[0.05em]">
                                {coupon?.code ||
                                  "—"}
                              </p>

                              <p className="mt-1 text-xs text-[#897f74]">
                                #{String(
                                  id
                                ).slice(
                                  -8
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-lg font-semibold">
                                {formatDiscount(
                                  coupon
                                )}
                              </p>

                              {maxDiscount !==
                                "" && (
                                <p className="mt-1 text-xs text-[#8a8177]">
                                  Cap{" "}
                                  {money(
                                    maxDiscount
                                  )}
                                </p>
                              )}
                            </div>

                            <span className="text-sm">
                              {money(
                                couponMinOrder(
                                  coupon
                                )
                              )}
                            </span>

                            <div className="text-sm text-[#71685f]">
                              <p>
                                {formatDateTime(
                                  coupon?.startDate
                                )}
                              </p>

                              <p className="mt-1">
                                →{" "}
                                {formatDateTime(
                                  coupon?.endDate
                                )}
                              </p>
                            </div>

                            <span>
                              <span
                                className={[
                                  "inline-flex border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em]",
                                  statusClass(
                                    coupon
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                {isCurrentlyActive(
                                  coupon
                                )
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </span>

                            <div className="flex flex-wrap justify-end gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    coupon
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.11em] underline"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingId ===
                                  id
                                }
                                onClick={() =>
                                  deleteCoupon(
                                    coupon
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.11em] text-red-700 underline disabled:opacity-50"
                              >
                                {deletingId ===
                                id
                                  ? "Deleting…"
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <div className="space-y-3 xl:hidden">
                    {filteredCoupons.map(
                      (coupon) => {
                        const id =
                          getId(
                            coupon
                          );

                        const maxDiscount =
                          couponMaxDiscount(
                            coupon
                          );

                        return (
                          <article
                            key={id}
                            className="border border-[#1d1916]/10 bg-white p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-lg font-semibold tracking-[0.05em]">
                                  {coupon?.code ||
                                    "—"}
                                </p>

                                <p className="mt-1 text-xs text-[#897f74]">
                                  #{String(
                                    id
                                  ).slice(
                                    -8
                                  )}
                                </p>
                              </div>

                              <span
                                className={[
                                  "shrink-0 border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.09em]",
                                  statusClass(
                                    coupon
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                {isCurrentlyActive(
                                  coupon
                                )
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#1d1916]/10 py-4">
                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Discount
                                </p>

                                <p className="mt-1 text-lg font-semibold">
                                  {formatDiscount(
                                    coupon
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Minimum
                                </p>

                                <p className="mt-1 text-sm font-semibold">
                                  {money(
                                    couponMinOrder(
                                      coupon
                                    )
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Starts
                                </p>

                                <p className="mt-1 text-sm">
                                  {formatDateTime(
                                    coupon?.startDate
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Ends
                                </p>

                                <p className="mt-1 text-sm">
                                  {formatDateTime(
                                    coupon?.endDate
                                  )}
                                </p>
                              </div>

                              {maxDiscount !==
                                "" && (
                                <div className="col-span-2">
                                  <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                    Maximum discount
                                  </p>

                                  <p className="mt-1 text-sm font-semibold">
                                    {money(
                                      maxDiscount
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-5 border-t border-[#1d1916]/10 pt-4">
                              <button
                                type="button"
                                onClick={() =>
                                  openEdit(
                                    coupon
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.11em] underline"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingId ===
                                  id
                                }
                                onClick={() =>
                                  deleteCoupon(
                                    coupon
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.11em] text-red-700 underline disabled:opacity-50"
                              >
                                {deletingId ===
                                id
                                  ? "Deleting…"
                                  : "Delete"}
                              </button>
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

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}