import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   ICONS
========================================================= */

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path
        d="M4 7l8 6 8-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2"
      />
      <path
        d="M8 10V7a4 4 0 018 0v3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path
        d="M3 3l18 18"
        strokeLinecap="round"
      />
      <path
        d="M10.5 10.7a2 2 0 002.7 2.7"
        strokeLinecap="round"
      />
      <path
        d="M9.9 4.3A10.5 10.5 0 0112 4c5.2 0 8.7 4.7 9.8 7-.6 1.2-1.8 3-4 4.6"
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.2C4.1 7.7 2.8 9.7 2.2 11c1.1 2.3 4.6 7 9.8 7 1.2 0 2.3-.2 3.3-.6"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path
        d="M2.2 12s3.5-6 9.8-6 9.8 6 9.8 6-3.5 6-9.8 6-9.8-6-9.8-6z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path
        d="M5 12h13"
        strokeLinecap="round"
      />
      <path
        d="M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
    >
      <path
        d="M12 3l7 3v5c0 4.6-3 7.8-7 10-4-2.2-7-5.4-7-10V6l7-3z"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      <path
        d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(
        location.state?.from || "/",
        { replace: true }
      );
    }
  }, [
    isAuthenticated,
    navigate,
    location.state,
  ]);

  useEffect(() => {
    if (location.state?.signupSuccess) {
      setMessage(
        location.state?.email
          ? `Account created successfully for ${location.state.email}. Please sign in to continue.`
          : "Account created successfully. Please sign in to continue."
      );

      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [navigate, location.pathname, location.state]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await login({
        email: cleanEmail,
        password,
      });

      const loggedInUser =
        result?.user;

      const displayName =
        loggedInUser?.name ||
        cleanEmail.split("@")[0];

      setMessage(
        `Welcome back, ${displayName}. Redirecting...`
      );

      const redirectTo =
        location.state?.from || "/";

      window.setTimeout(() => {
        navigate(redirectTo, {
          replace: true,
        });
      }, 500);
    } catch (err) {
      setError(
        err?.message ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* =====================================================
          PREMIUM ANIMATIONS
      ====================================================== */}

      <style>{`
        @keyframes svFloatA {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(-5deg);
          }
          50% {
            transform: translate3d(0, -14px, 0) rotate(-1deg);
          }
        }

        @keyframes svFloatB {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(4deg);
          }
          50% {
            transform: translate3d(0, 12px, 0) rotate(7deg);
          }
        }

        @keyframes svSlowZoom {
          0%, 100% {
            transform: scale(1.02);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes svGradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes svGlow {
          0%, 100% {
            opacity: .25;
            transform: scale(1);
          }
          50% {
            opacity: .48;
            transform: scale(1.12);
          }
        }

        @keyframes svShine {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(130%);
          }
        }

        @keyframes svPulse {
          0%, 100% {
            opacity: .55;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes svReveal {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sv-float-a {
          animation: svFloatA 6s ease-in-out infinite;
        }

        .sv-float-b {
          animation: svFloatB 7s ease-in-out infinite;
        }

        .sv-image {
          animation: svSlowZoom 12s ease-in-out infinite;
        }

        .sv-gradient {
          background-size: 220% 220%;
          animation: svGradient 10s ease infinite;
        }

        .sv-glow {
          animation: svGlow 6s ease-in-out infinite;
        }

        .sv-pulse {
          animation: svPulse 2.2s ease-in-out infinite;
        }

        .sv-reveal {
          animation: svReveal .8s ease-out both;
        }

        .sv-delay-1 {
          animation-delay: .08s;
        }

        .sv-delay-2 {
          animation-delay: .16s;
        }

        .sv-delay-3 {
          animation-delay: .24s;
        }

        .sv-delay-4 {
          animation-delay: .32s;
        }

        .sv-button-shine {
          transform: translateX(-120%);
        }

        .group:hover .sv-button-shine {
          animation: svShine 1s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .sv-float-a,
          .sv-float-b,
          .sv-image,
          .sv-gradient,
          .sv-glow,
          .sv-pulse,
          .sv-reveal {
            animation: none !important;
          }

          .sv-button-shine {
            display: none !important;
          }
        }
      `}</style>

      {/* =====================================================
          PAGE BACKGROUND
      ====================================================== */}

      <main className="min-h-screen bg-[#06070a] p-2.5 sm:p-4 lg:p-6">

        <div className="mx-auto flex min-h-[calc(100vh-20px)] max-w-[1540px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#101117] shadow-[0_40px_140px_rgba(0,0,0,0.6)] lg:min-h-[calc(100vh-48px)]">

          {/* =================================================
              LEFT — EDITORIAL FASHION WORLD
          ================================================== */}

          <section className="relative hidden min-w-0 flex-1 overflow-hidden lg:flex">

            {/* Animated background */}
            <div className="sv-gradient absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(236,72,153,0.30),transparent_25%),radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.34),transparent_28%),radial-gradient(circle_at_55%_90%,rgba(245,158,11,0.14),transparent_25%),linear-gradient(135deg,#090a10,#141626,#080a0f)]" />

            {/* Glow blobs */}
            <div className="sv-glow absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-[110px]" />

            <div className="sv-glow absolute -bottom-48 right-[-100px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[130px]" />

            <div className="absolute left-[46%] top-[30%] h-[250px] w-[250px] rounded-full bg-amber-300/10 blur-[100px]" />

            {/* Grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.045]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
                backgroundSize: "52px 52px",
              }}
            />

            {/* Main content */}
            <div className="relative z-10 flex h-full w-full flex-col p-8 xl:p-11">

              {/* HEADER */}
              <div className="flex items-center justify-between">

                <Link
                  to="/"
                  className="text-xl font-black tracking-[-0.07em] text-white"
                >
                  STYLEVERSE
                </Link>

                <div className="flex items-center gap-5">

                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">
                    SS26
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
                    Fashion Universe
                  </span>

                </div>
              </div>

              {/* CENTER VISUAL */}
              <div className="relative flex flex-1 items-center justify-center">

                {/* giant text */}
                <div className="pointer-events-none absolute left-[-3%] top-[8%] select-none text-[130px] font-black leading-none tracking-[-0.1em] text-white/[0.035] xl:text-[175px]">
                  STYLE
                </div>

                <div className="pointer-events-none absolute bottom-[8%] right-[0%] select-none text-[100px] font-black leading-none tracking-[-0.1em] text-white/[0.035]">
                  26
                </div>

                {/* MAIN IMAGE */}
                <div className="relative h-[500px] w-[370px] xl:h-[600px] xl:w-[445px]">

                  {/* image shadow */}
                  <div className="absolute bottom-[2%] left-1/2 h-20 w-[300px] -translate-x-1/2 rounded-full bg-black/70 blur-[45px]" />

                  {/* image frame */}
                  <div className="absolute left-1/2 top-1/2 h-[460px] w-[325px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2.7rem] border border-white/20 bg-black shadow-[0_35px_90px_rgba(0,0,0,.55)] xl:h-[530px] xl:w-[370px]">

                    <img
                      src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1100&q=92"
                      alt="Styleverse fashion editorial"
                      className="sv-image h-full w-full object-cover"
                    />

                    {/* rich image treatment */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-fuchsia-500/10" />

                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-amber-300/10" />

                    {/* upper mini label */}
                    <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/20 px-3 py-2 text-[8px] font-bold uppercase tracking-[0.2em] text-white/75 backdrop-blur-xl">
                      Editorial / 01
                    </div>

                    {/* bottom information */}
                    <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/15 bg-black/30 p-4 backdrop-blur-xl">

                      <div className="flex items-center justify-between">

                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/45">
                            STYLEVERSE EDIT
                          </p>

                          <p className="mt-1.5 text-sm font-semibold text-white">
                            Dress your identity.
                          </p>
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white">
                          ↗
                        </div>

                      </div>

                    </div>
                  </div>

                  {/* FLOATING PRODUCT */}
                  <div className="sv-float-a absolute left-[-50px] top-[12%] w-[160px] rounded-[1.6rem] border border-white/15 bg-white/[0.10] p-3 shadow-2xl backdrop-blur-2xl">

                    <div className="h-[125px] overflow-hidden rounded-[1.1rem] bg-slate-900">

                      <img
                        src="https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=700&q=88"
                        alt="Fashion collection"
                        className="h-full w-full object-cover"
                      />

                    </div>

                    <div className="mt-3">

                      <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/40">
                        NEW ARRIVAL
                      </p>

                      <p className="mt-1 text-xs font-semibold text-white">
                        Night Edit
                      </p>

                      <div className="mt-2 flex items-center justify-between">

                        <span className="text-[10px] text-white/45">
                          New season
                        </span>

                        <span className="text-[10px] font-bold text-fuchsia-300">
                          → 
                        </span>

                      </div>

                    </div>
                  </div>

                  {/* COLOR CARD */}
                  <div className="sv-float-b absolute right-[-45px] top-[23%] rounded-[1.5rem] border border-white/15 bg-black/30 p-3.5 backdrop-blur-2xl">

                    <p className="mb-3 text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">
                      Colour Story
                    </p>

                    <div className="flex gap-2">

                      <span className="h-7 w-7 rounded-full bg-[#ede2dc] ring-1 ring-white/20" />

                      <span className="h-7 w-7 rounded-full bg-[#25283c] ring-1 ring-white/20" />

                      <span className="h-7 w-7 rounded-full bg-[#b67e69] ring-1 ring-white/20" />

                      <span className="h-7 w-7 rounded-full bg-[#d5b55a] ring-1 ring-white/20" />

                    </div>
                  </div>

                  {/* FLOATING TAG */}
                  <div className="absolute bottom-[14%] right-[-60px] flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2.5 text-[10px] font-semibold text-white/80 backdrop-blur-xl">

                    <span className="text-fuchsia-300">
                      <SparkleIcon />
                    </span>

                    Mix · Match · Create

                  </div>

                </div>
              </div>

              {/* BOTTOM COPY */}
              <div className="max-w-xl">

                <div className="flex items-center gap-2">

                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 sv-pulse" />

                  <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-fuchsia-300">
                    YOUR STYLE. YOUR SPACE.
                  </p>

                </div>

                <h1 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.06em] text-white xl:text-[62px]">

                  Enter your

                  <span className="block bg-gradient-to-r from-fuchsia-200 via-violet-200 to-amber-100 bg-clip-text text-transparent">
                    fashion universe.
                  </span>

                </h1>

                <p className="mt-5 max-w-lg text-sm leading-6 text-white/50">
                  Discover fashion, save your favourites,
                  build complete looks and make every
                  outfit feel like you.
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">

                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Shop
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Wishlist
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Outfit Builder
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Custom Studio
                  </span>

                </div>

              </div>

            </div>
          </section>

          {/* =================================================
              RIGHT — LOGIN
          ================================================== */}

          <section className="relative flex w-full items-center overflow-hidden bg-[#f7f5f1] lg:w-[43%]">

            {/* Background glow */}
            <div className="absolute -right-32 -top-32 h-[360px] w-[360px] rounded-full bg-indigo-200/40 blur-[90px]" />

            <div className="absolute -bottom-32 -left-32 h-[340px] w-[340px] rounded-full bg-fuchsia-200/35 blur-[90px]" />

            <div className="absolute right-[10%] top-[45%] h-[150px] w-[150px] rounded-full bg-amber-100/50 blur-[70px]" />

            {/* Decorative lines */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-white/80" />

            <div className="relative z-10 mx-auto w-full max-w-[450px] px-6 py-10 sm:px-10 lg:px-10 xl:px-14">

              {/* top */}
              <div className="mb-10 flex items-center justify-between">

                <Link
                  to="/"
                  className="text-xl font-black tracking-[-0.07em] text-slate-950"
                >
                  STYLEVERSE
                </Link>

                <Link
                  to="/shop"
                  className="text-xs font-semibold text-slate-400 transition hover:text-indigo-600"
                >
                  Browse shop →
                </Link>

              </div>

              {/* heading */}
              <div className="sv-reveal">

                <div className="flex items-center gap-3">

                  <span className="h-[2px] w-9 bg-gradient-to-r from-fuchsia-500 to-indigo-500" />

                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    MEMBER ACCESS
                  </span>

                </div>

                <h2 className="mt-5 text-[48px] font-black leading-[0.94] tracking-[-0.07em] text-slate-950 sm:text-[54px]">

                  Welcome

                  <span className="block bg-gradient-to-r from-slate-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                    back.
                  </span>

                </h2>

                <p className="mt-5 max-w-md text-sm leading-6 text-slate-500">
                  Sign in to continue your Styleverse
                  journey and keep your shopping
                  experience beautifully connected.
                </p>

              </div>

              {/* messages */}
              {(error || message) && (
                <div
                  className={[
                    "sv-reveal mt-7 rounded-2xl border px-4 py-3 text-sm font-medium",
                    error
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  {error || message}
                </div>
              )}

              {/* form */}
              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >

                {/* Email */}
                <div className="sv-reveal sv-delay-1">

                  <label
                    htmlFor="login-email"
                    className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600"
                  >
                    Email address
                  </label>

                  <div className="relative mt-2">

                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <MailIcon />
                    </span>

                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="you@example.com"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pl-12 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:-translate-y-0.5 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)]"
                    />

                  </div>

                </div>

                {/* Password */}
                <div className="sv-reveal sv-delay-2">

                  <div className="flex items-center justify-between">

                    <label
                      htmlFor="login-password"
                      className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600"
                    >
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-slate-400 transition hover:text-fuchsia-600"
                    >
                      Forgot password?
                    </Link>

                  </div>

                  <div className="relative mt-2">

                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <LockIcon />
                    </span>

                    <input
                      id="login-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter your password"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pl-12 pr-14 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:-translate-y-0.5 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      <EyeIcon
                        hidden={showPassword}
                      />
                    </button>

                  </div>

                </div>

                {/* Remember */}
                <div className="sv-reveal sv-delay-3 flex items-center justify-between pt-1">

                  <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-500">

                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                    />

                    Remember me

                  </label>

                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">

                    <ShieldIcon />

                    Secure

                  </div>

                </div>

                {/* CTA */}
                <div className="sv-reveal sv-delay-4">

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center overflow-hidden rounded-[1.2rem] bg-gradient-to-r from-[#11121a] via-[#292343] to-[#11121a] px-5 py-4 text-sm font-bold text-white shadow-[0_20px_45px_rgba(22,20,42,0.22)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_rgba(22,20,42,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    <span className="sv-button-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <span className="relative z-10">
                      {loading
                        ? "Signing in..."
                        : "Sign in to Styleverse"}
                    </span>

                    {!loading && (
                      <span className="absolute right-4 transition duration-300 group-hover:translate-x-1">
                        <ArrowIcon />
                      </span>
                    )}

                  </button>

                </div>

              </form>

              {/* security */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">

                <ShieldIcon />

                Protected account authentication

              </div>

              {/* divider */}
              <div className="my-7 flex items-center gap-4">

                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
                  or
                </span>

                <div className="h-px flex-1 bg-slate-200" />

              </div>

              {/* signup */}
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-[0_12px_35px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.07)]">

                <p className="text-xs text-slate-400">
                  New to Styleverse?
                </p>

                <Link
                  to="/signup"
                  className="mt-1 inline-block text-sm font-black text-slate-950 transition hover:text-fuchsia-600"
                >
                  Create your account →
                </Link>

              </div>

              {/* Guest */}
              <Link
                to="/shop"
                className="mt-6 block text-center text-xs font-semibold text-slate-400 transition hover:text-indigo-600"
              >
                Continue shopping as guest
              </Link>

              {/* footer */}
              <div className="mt-7 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300">
                STYLEVERSE · FASHION FOR EVERYONE
              </div>

            </div>
          </section>

        </div>
      </main>
    </>
  );
}