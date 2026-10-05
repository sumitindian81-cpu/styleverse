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

function getId(user) {
  return user?._id || user?.id || "";
}

function getName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.displayName ||
    user?.username ||
    (user?.email
      ? user.email.split("@")[0]
      : "User")
  );
}

function getRole(user) {
  return String(
    user?.role || "customer"
  ).toLowerCase();
}

function getStatus(user) {
  if (user?.isRemoved) {
    return "removed";
  }

  if (user?.isBlocked) {
    return "blocked";
  }

  return "active";
}

function statusLabel(status) {
  const labels = {
    active: "Active",
    blocked: "Blocked",
    removed: "Removed",
  };

  return (
    labels[status] ||
    status
  );
}

function statusClass(status) {
  if (status === "removed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "blocked") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function roleClass(role) {
  if (role === "admin") {
    return "border-[#cdb898]/40 bg-[#f2e8da] text-[#765c41]";
  }

  return "border-[#1d1916]/10 bg-[#f8f4ed] text-[#6e655c]";
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

function normalizeUsers(response) {
  const root =
    response?.data ?? response ?? {};

  const candidates = [
    root.users,
    root.items,
    root.data,
    response?.users,
    response?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getInitials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function UserSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse border border-[#1d1916]/10 bg-white p-5"
          >
            <div className="flex gap-4">
              <div className="h-11 w-11 rounded-full bg-[#e4ddd2]" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-44 bg-[#e4ddd2]" />
                <div className="h-3 w-64 bg-[#e4ddd2]" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [busyId, setBusyId] =
    useState("");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const loadUsers = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await apiRequest(
            "/admin/users"
          );

        setUsers(
          normalizeUsers(
            response
          )
        );
      } catch (err) {
        setError(
          err?.message ||
            "Unable to load users."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return users.filter(
        (user) => {
          const status =
            getStatus(user);

          if (
            statusFilter !==
              "all" &&
            status !==
              statusFilter
          ) {
            return false;
          }

          if (!term) {
            return true;
          }

          const searchable = [
            getName(user),
            user?.email,
            getRole(user),
            getId(user),
            status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            term
          );
        }
      );
    }, [
      search,
      statusFilter,
      users,
    ]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(
        (user) =>
          getStatus(user) ===
          "active"
      ).length,
      blocked: users.filter(
        (user) =>
          getStatus(user) ===
          "blocked"
      ).length,
      admins: users.filter(
        (user) =>
          getRole(user) ===
          "admin"
      ).length,
    };
  }, [users]);

  async function moderateUser(
    user,
    action
  ) {
    const id = getId(user);
    const role = getRole(user);

    if (!id) return;

    if (role === "admin") {
      setError(
        "Admin accounts are not managed through user moderation."
      );
      return;
    }

    setError("");
    setMessage("");

    let reason = "";

    if (
      action === "block" ||
      action === "remove"
    ) {
      reason =
        window.prompt(
          action === "block"
            ? "Enter a reason for blocking this user:"
            : "Enter a reason for removing this user:",
          ""
        )?.trim() || "";

      if (!reason) {
        setError(
          "A moderation reason is required."
        );
        return;
      }
    }

    const confirmed =
      window.confirm(
        action === "block"
          ? `Block ${getName(
              user
            )}?`
          : action === "unblock"
          ? `Unblock ${getName(
              user
            )}?`
          : `Remove ${getName(
              user
            )}?`
      );

    if (!confirmed) return;

    setBusyId(id);

    try {
      let response;

      if (action === "block") {
        response =
          await apiJson(
            `/admin/users/${encodeURIComponent(
              id
            )}/block`,
            {
              method: "PUT",
              data: {
                reason,
              },
            }
          );
      } else if (
        action === "unblock"
      ) {
        response =
          await apiJson(
            `/admin/users/${encodeURIComponent(
              id
            )}/unblock`,
            {
              method: "PUT",
            }
          );
      } else {
        response =
          await apiJson(
            `/admin/users/${encodeURIComponent(
              id
            )}`,
            {
              method: "DELETE",
              data: {
                reason,
              },
            }
          );
      }

      const updatedUser =
        response?.data?.user ||
        response?.data?.item ||
        (response?.data &&
        !Array.isArray(
          response.data
        )
          ? response.data
          : null) ||
        null;

      if (updatedUser) {
        setUsers((current) =>
          current.map((item) =>
            getId(item) === id
              ? updatedUser
              : item
          )
        );

        setSelectedUser(
          (current) =>
            current &&
            getId(current) ===
              id
              ? updatedUser
              : current
        );
      } else if (
        action === "remove"
      ) {
        setUsers((current) =>
          current.map((item) =>
            getId(item) === id
              ? {
                  ...item,
                  isRemoved:
                    true,
                  isBlocked:
                    true,
                }
              : item
          )
        );
      } else {
        await loadUsers();
      }

      setMessage(
        response?.message ||
          `User ${action} successful.`
      );
    } catch (err) {
      setError(
        err?.message ||
          `Unable to ${action} user.`
      );
    } finally {
      setBusyId("");
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
                User control
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
                      "Users" && (
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
                    Styleverse / Administration / Users
                  </p>

                  <h1
                    className="mt-3 text-5xl leading-none tracking-[-0.045em] sm:text-6xl lg:text-7xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    The customers.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#70685f]">
                    Review customer accounts, search the user base and manage account access.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={loadUsers}
                    disabled={loading}
                    className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Refreshing…" : "Refresh users"}
                  </button>

                  <Link
                    to="/admin"
                    className="border border-[#1d1916]/20 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em]"
                  >
                    Back to dashboard
                  </Link>
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
                  Total users
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.total}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Accounts returned by API
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
                  Accounts currently active
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Blocked
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.blocked}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Accounts under access restriction
                </p>
              </div>

              <div className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a7655]">
                  Admins
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.admins}
                </p>
                <p className="mt-1 text-sm text-[#8a8177]">
                  Admin accounts in the result
                </p>
              </div>
            </section>

            <section className="mt-7 border border-[#1d1916]/10 bg-white p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div>
                  <label
                    htmlFor="admin-user-search"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#81776c]"
                  >
                    Search users
                  </label>

                  <input
                    id="admin-user-search"
                    type="search"
                    autoComplete="off"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search name, email, role or ID…"
                    className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none transition placeholder:text-[#a59a8e] focus:border-[#1d1916] focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-user-status"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#81776c]"
                  >
                    Account status
                  </label>

                  <select
                    id="admin-user-status"
                    value={
                      statusFilter
                    }
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value
                      )
                    }
                    className="w-full border border-[#1d1916]/15 bg-[#fcfaf6] px-4 py-3.5 text-base outline-none focus:border-[#1d1916] focus:bg-white"
                  >
                    <option value="all">
                      All statuses
                    </option>
                    <option value="active">
                      Active
                    </option>
                    <option value="blocked">
                      Blocked
                    </option>
                    <option value="removed">
                      Removed
                    </option>
                  </select>
                </div>
              </div>

              <p className="mt-4 text-sm text-[#81776c]">
                Showing{" "}
                {filteredUsers.length}{" "}
                of {users.length}{" "}
                accounts
              </p>
            </section>

            {error && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={
                    loadUsers
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
                <UserSkeleton />
              ) : filteredUsers.length ===
                0 ? (
                <div className="border border-[#1d1916]/10 bg-white px-6 py-16 text-center sm:px-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                    Accounts
                  </p>

                  <h2
                    className="mt-4 text-4xl sm:text-5xl"
                    style={{
                      fontFamily:
                        "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    No matching users.
                  </h2>

                  <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#71685f]">
                    Clear the search or reset the status filter to see the current user list.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter(
                        "all"
                      );
                    }}
                    className="mt-7 border border-[#1d1916] bg-[#1d1916] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#f7f3ec]"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden border border-[#1d1916]/10 bg-white xl:block">
                    <div className="grid grid-cols-[1.6fr_1.55fr_0.7fr_0.8fr_0.75fr_1.2fr] border-b border-[#1d1916]/10 bg-[#eee7dc] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#766b60]">
                      <span>User</span>
                      <span>Email</span>
                      <span>Role</span>
                      <span>Status</span>
                      <span>Joined</span>
                      <span className="text-right">
                        Actions
                      </span>
                    </div>

                    {filteredUsers.map(
                      (user) => {
                        const id =
                          getId(
                            user
                          );

                        const role =
                          getRole(
                            user
                          );

                        const status =
                          getStatus(
                            user
                          );

                        const isAdmin =
                          role ===
                          "admin";

                        const busy =
                          busyId ===
                          id;

                        return (
                          <div
                            key={id}
                            className="grid grid-cols-[1.6fr_1.55fr_0.7fr_0.8fr_0.75fr_1.2fr] items-center border-b border-[#1d1916]/10 px-5 py-5 last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedUser(
                                  user
                                )
                              }
                              className="flex min-w-0 items-center gap-3 text-left"
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1d1916] text-xs font-semibold text-[#f7f3ec]">
                                {getInitials(
                                  getName(
                                    user
                                  )
                                )}
                              </span>

                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {getName(
                                    user
                                  )}
                                </span>

                                <span className="mt-1 block truncate text-xs text-[#8b8177]">
                                  #{String(
                                    id
                                  ).slice(
                                    -10
                                  )}
                                </span>
                              </span>
                            </button>

                            <span className="truncate pr-5 text-sm text-[#615950]">
                              {user?.email ||
                                "—"}
                            </span>

                            <span>
                              <span
                                className={[
                                  "inline-flex border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                  roleClass(
                                    role
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                {role}
                              </span>
                            </span>

                            <span>
                              <span
                                className={[
                                  "inline-flex border px-2.5 py-1 text-[10px] font-semibold",
                                  statusClass(
                                    status
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                {statusLabel(
                                  status
                                )}
                              </span>
                            </span>

                            <span className="text-sm text-[#81776c]">
                              {formatDate(
                                user?.createdAt
                              )}
                            </span>

                            <div className="flex flex-wrap justify-end gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedUser(
                                    user
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.1em] underline"
                              >
                                View
                              </button>

                              {!isAdmin &&
                                !user?.isRemoved && (
                                  <>
                                    {user?.isBlocked ? (
                                      <button
                                        type="button"
                                        disabled={
                                          busy
                                        }
                                        onClick={() =>
                                          moderateUser(
                                            user,
                                            "unblock"
                                          )
                                        }
                                        className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700 underline disabled:opacity-50"
                                      >
                                        {busy
                                          ? "Working…"
                                          : "Unblock"}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={
                                          busy
                                        }
                                        onClick={() =>
                                          moderateUser(
                                            user,
                                            "block"
                                          )
                                        }
                                        className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700 underline disabled:opacity-50"
                                      >
                                        {busy
                                          ? "Working…"
                                          : "Block"}
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        moderateUser(
                                          user,
                                          "remove"
                                        )
                                      }
                                      className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700 underline disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>

                  <div className="space-y-3 xl:hidden">
                    {filteredUsers.map(
                      (user) => {
                        const id =
                          getId(
                            user
                          );

                        const role =
                          getRole(
                            user
                          );

                        const status =
                          getStatus(
                            user
                          );

                        const isAdmin =
                          role ===
                          "admin";

                        const busy =
                          busyId ===
                          id;

                        return (
                          <article
                            key={id}
                            className="border border-[#1d1916]/10 bg-white p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1d1916] text-xs font-semibold text-[#f7f3ec]">
                                  {getInitials(
                                    getName(
                                      user
                                    )
                                  )}
                                </span>

                                <div className="min-w-0">
                                  <p className="truncate text-base font-semibold">
                                    {getName(
                                      user
                                    )}
                                  </p>

                                  <p className="mt-1 truncate text-sm text-[#81776c]">
                                    {user?.email ||
                                      "—"}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={[
                                  "shrink-0 border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                  statusClass(
                                    status
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                {statusLabel(
                                  status
                                )}
                              </span>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#1d1916]/10 py-4">
                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Role
                                </p>

                                <span
                                  className={[
                                    "mt-2 inline-flex border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                    roleClass(
                                      role
                                    ),
                                  ].join(
                                    " "
                                  )}
                                >
                                  {role}
                                </span>
                              </div>

                              <div>
                                <p className="text-xs uppercase tracking-[0.12em] text-[#8e8479]">
                                  Joined
                                </p>

                                <p className="mt-2 text-sm">
                                  {formatDate(
                                    user?.createdAt
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedUser(
                                    user
                                  )
                                }
                                className="text-xs font-semibold uppercase tracking-[0.11em] underline"
                              >
                                View details
                              </button>

                              {!isAdmin &&
                                !user?.isRemoved && (
                                  <>
                                    {user?.isBlocked ? (
                                      <button
                                        type="button"
                                        disabled={
                                          busy
                                        }
                                        onClick={() =>
                                          moderateUser(
                                            user,
                                            "unblock"
                                          )
                                        }
                                        className="text-xs font-semibold uppercase tracking-[0.11em] text-emerald-700 underline disabled:opacity-50"
                                      >
                                        {busy
                                          ? "Working…"
                                          : "Unblock"}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={
                                          busy
                                        }
                                        onClick={() =>
                                          moderateUser(
                                            user,
                                            "block"
                                          )
                                        }
                                        className="text-xs font-semibold uppercase tracking-[0.11em] text-amber-700 underline disabled:opacity-50"
                                      >
                                        {busy
                                          ? "Working…"
                                          : "Block"}
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      disabled={
                                        busy
                                      }
                                      onClick={() =>
                                        moderateUser(
                                          user,
                                          "remove"
                                        )
                                      }
                                      className="text-xs font-semibold uppercase tracking-[0.11em] text-red-700 underline disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
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

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1d1916]/45 p-0 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedUser(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full overflow-y-auto border border-[#1d1916]/10 bg-[#f7f3ec] sm:max-w-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#1d1916]/10 bg-[#f7f3ec] px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a7655]">
                  User profile
                </p>

                <h2
                  className="mt-2 text-4xl"
                  style={{
                    fontFamily:
                      "Georgia, 'Times New Roman', serif",
                  }}
                >
                  {getName(
                    selectedUser
                  )}
                </h2>

                <p className="mt-2 text-sm text-[#81776c]">
                  {selectedUser?.email ||
                    "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUser(
                    null
                  )
                }
                className="border border-[#1d1916]/15 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border border-[#1d1916]/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8d8378]">
                    Role
                  </p>
                  <p className="mt-2 text-sm font-semibold uppercase">
                    {getRole(
                      selectedUser
                    )}
                  </p>
                </div>

                <div className="border border-[#1d1916]/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8d8378]">
                    Status
                  </p>
                  <span
                    className={[
                      "mt-2 inline-flex border px-2.5 py-1 text-[10px] font-semibold",
                      statusClass(
                        getStatus(
                          selectedUser
                        )
                      ),
                    ].join(
                      " "
                    )}
                  >
                    {statusLabel(
                      getStatus(
                        selectedUser
                      )
                    )}
                  </span>
                </div>

                <div className="border border-[#1d1916]/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8d8378]">
                    Joined
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {formatDate(
                      selectedUser?.createdAt
                    )}
                  </p>
                </div>
              </div>

              {selectedUser
                ?.moderationReason && (
                <section className="border border-[#1d1916]/10 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                    Moderation
                  </p>

                  <p className="mt-3 text-sm leading-7 text-[#655c53]">
                    {selectedUser.moderationReason}
                  </p>
                </section>
              )}

              <section className="border border-[#1d1916]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                  Account
                </p>

                <div className="mt-4 space-y-3 border-t border-[#1d1916]/10 pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#7c7268]">
                      User ID
                    </span>
                    <span className="max-w-[65%] break-all text-right font-medium">
                      {getId(
                        selectedUser
                      ) || "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#7c7268]">
                      Email verified
                    </span>
                    <span className="font-medium">
                      {(selectedUser?.isEmailVerified ??
                        selectedUser?.isVerified) === true
                        ? "Yes"
                        : (selectedUser?.isEmailVerified ??
                            selectedUser?.isVerified) === false
                        ? "No"
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#7c7268]">
                      Blocked
                    </span>
                    <span className="font-medium">
                      {selectedUser?.isBlocked
                        ? "Yes"
                        : "No"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#7c7268]">
                      Removed
                    </span>
                    <span className="font-medium">
                      {selectedUser?.isRemoved
                        ? "Yes"
                        : "No"}
                    </span>
                  </div>
                </div>
              </section>

              {getRole(
                selectedUser
              ) !== "admin" &&
                !selectedUser?.isRemoved && (
                  <div className="flex flex-wrap gap-3 border-t border-[#1d1916]/10 pt-5">
                    {selectedUser?.isBlocked ? (
                      <button
                        type="button"
                        disabled={
                          busyId ===
                          getId(
                            selectedUser
                          )
                        }
                        onClick={() =>
                          moderateUser(
                            selectedUser,
                            "unblock"
                          )
                        }
                        className="border border-emerald-700 bg-emerald-700 px-5 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-white disabled:opacity-50"
                      >
                        Unblock user
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          busyId ===
                          getId(
                            selectedUser
                          )
                        }
                        onClick={() =>
                          moderateUser(
                            selectedUser,
                            "block"
                          )
                        }
                        className="border border-[#b57b16] bg-[#b57b16] px-5 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-white disabled:opacity-50"
                      >
                        Block user
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={
                        busyId ===
                        getId(
                          selectedUser
                        )
                      }
                      onClick={() =>
                        moderateUser(
                          selectedUser,
                          "remove"
                        )
                      }
                      className="border border-red-700 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-red-700 disabled:opacity-50"
                    >
                      Remove user
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}