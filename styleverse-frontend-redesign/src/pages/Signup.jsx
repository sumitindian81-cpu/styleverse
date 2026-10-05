import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   ICONS
========================================================= */

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-3.5 3-5.2 7-5.2s6.3 1.7 7 5.2" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.5 10.7a2 2 0 002.7 2.7" strokeLinecap="round" />
      <path d="M9.9 4.3A10.5 10.5 0 0112 4c5.2 0 8.7 4.7 9.8 7-.6 1.2-1.8 3-4 4.6" strokeLinecap="round" />
      <path d="M6.2 6.2C4.1 7.7 2.8 9.7 2.2 11c1.1 2.3 4.6 7 9.8 7 1.2 0 2.3-.2 3.3-.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="M2.2 12s3.5-6 9.8-6 9.8 6 9.8 6-3.5 6-9.8 6-9.8-6-9.8-6z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
      <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M5 12h13" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.6-3 7.8-7 10-4-2.2-7-5.4-7-10V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(location.state?.from || "/", { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  }

  const passwordChecks = useMemo(() => {
    const value = form.password;
    return {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
  }, [form.password]);

  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

  const passwordLabel = ["", "Very weak", "Weak", "Good", "Strong"][passwordScore];

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setNeedsVerification(false);

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    // ---------------------------------------------
    // Frontend validation
    // ---------------------------------------------
    if (!name) {
      return setError("Name is required.");
    }

    if (!email) {
      return setError("Email is required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Please enter a valid email address.");
    }

    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }

    if (!acceptedTerms) {
      return setError(
        "Please accept the Styleverse terms to create your account."
      );
    }

    setLoading(true);

    try {
      const result = await signup({
        name,
        email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      const rawMessage =
        result?.response?.message ||
        result?.response?.data?.message ||
        "";

      /*
        Future-compatible verification support.
        If the backend later returns a verification
        message, the existing verification UI is shown.
      */
      const hasVerificationHint =
        /verification|verify|otp/i.test(rawMessage);

      // ---------------------------------------------
      // Backend returned a token.
      // ---------------------------------------------
      if (result?.token) {
        setMessage(
          "Account created successfully. Redirecting…"
        );

        window.setTimeout(() => {
          navigate(
            location.state?.from || "/",
            { replace: true }
          );
        }, 500);

        return;
      }

      // ---------------------------------------------
      // Backend requires email / OTP verification.
      // ---------------------------------------------
      if (hasVerificationHint) {
        setMessage(
          rawMessage ||
            "Verification instructions have been sent to your email."
        );

        setNeedsVerification(true);

        return;
      }

      // ---------------------------------------------
      // Current Styleverse backend:
      // /auth/register creates the account but does
      // not return a JWT token.
      // ---------------------------------------------
      setMessage(
        rawMessage ||
          "Account created successfully. Please sign in to continue."
      );

      window.setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            signupSuccess: true,
            email,
          },
        });
      }, 900);
    } catch (err) {
      setError(
        err?.message ||
          "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes svSignupGlow {
          0%, 100% { transform: scale(1); opacity: .30; }
          50% { transform: scale(1.12); opacity: .50; }
        }
        @keyframes svSignupFloatA {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-4deg); }
          50% { transform: translate3d(0, -12px, 0) rotate(-1deg); }
        }
        @keyframes svSignupFloatB {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(3deg); }
          50% { transform: translate3d(0, 10px, 0) rotate(6deg); }
        }
        @keyframes svSignupReveal {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .sv-signup-glow { animation: svSignupGlow 6s ease-in-out infinite; }
        .sv-signup-float-a { animation: svSignupFloatA 6.5s ease-in-out infinite; }
        .sv-signup-float-b { animation: svSignupFloatB 7s ease-in-out infinite; }
        .sv-signup-reveal { animation: svSignupReveal .8s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .sv-signup-glow, .sv-signup-float-a, .sv-signup-float-b, .sv-signup-reveal { animation: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-[#f7f1ea] p-2.5 sm:p-4 lg:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-20px)] max-w-[1450px] overflow-hidden rounded-[2rem] border border-[#ddd3ca] bg-[#fffdf9] shadow-[0_40px_120px_rgba(56,43,34,0.12)] lg:min-h-[calc(100vh-48px)] lg:grid-cols-[1.03fr_0.97fr]">
          {/* =================================================
              LEFT — EDITORIAL FASHION WORLD
          ================================================== */}
          <section className="relative hidden min-w-0 overflow-hidden bg-[#30262b] text-[#fffaf4] lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(221,190,148,0.28),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(174,104,137,0.26),transparent_28%),radial-gradient(circle_at_55%_92%,rgba(95,72,83,0.36),transparent_28%),linear-gradient(135deg,#221b1f,#332a31,#1d171b)]" />
            <div className="sv-signup-glow absolute -left-24 -top-24 h-[360px] w-[360px] rounded-full bg-fuchsia-300/15 blur-[100px]" />
            <div className="sv-signup-glow absolute -bottom-40 right-[-70px] h-[460px] w-[460px] rounded-full bg-amber-200/10 blur-[115px]" />

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.045]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
                backgroundSize: "54px 54px",
              }}
            />

            <div className="relative z-10 flex h-full w-full flex-col p-8 xl:p-11">
              <div className="flex items-center justify-between">
                <Link to="/" className="text-xl font-black tracking-[-0.07em] text-white">
                  STYLEVERSE
                </Link>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">SS26</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
                    Fashion Universe
                  </span>
                </div>
              </div>

              <div className="relative flex flex-1 items-center justify-center py-10">
                <div className="pointer-events-none absolute left-[-3%] top-[7%] select-none text-[110px] font-black leading-none tracking-[-0.1em] text-white/[0.035] xl:text-[160px]">
                  STYLE
                </div>
                <div className="pointer-events-none absolute bottom-[8%] right-[0%] select-none text-[95px] font-black leading-none tracking-[-0.1em] text-white/[0.035]">
                  26
                </div>

                <div className="relative h-[510px] w-[370px] xl:h-[610px] xl:w-[430px]">
                  <div className="absolute bottom-[2%] left-1/2 h-20 w-[290px] -translate-x-1/2 rounded-full bg-black/60 blur-[40px]" />

                  <div className="absolute left-1/2 top-1/2 h-[475px] w-[310px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2.5rem] border border-white/15 bg-black shadow-[0_35px_90px_rgba(0,0,0,.42)] xl:h-[545px] xl:w-[360px]">
                    <img
                      src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=90"
                      alt="Styleverse fashion editorial"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-amber-200/10" />
                    <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/20 px-3 py-2 text-[8px] font-bold uppercase tracking-[0.2em] text-white/75 backdrop-blur-xl">
                      EDITORIAL / 02
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 rounded-[1.4rem] border border-white/15 bg-black/30 p-4 backdrop-blur-xl">
                      <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/45">THE STYLEVERSE EDIT</p>
                      <p className="mt-1.5 text-sm font-semibold text-white">Build the wardrobe you imagine.</p>
                    </div>
                  </div>

                  <div className="sv-signup-float-a absolute left-[-36px] top-[9%] w-[150px] rounded-[1.5rem] border border-white/15 bg-white/[0.09] p-3 shadow-2xl backdrop-blur-2xl">
                    <div className="h-[115px] overflow-hidden rounded-[1rem] bg-[#171216]">
                      <img
                        src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=700&q=88"
                        alt="Styleverse collection"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-3 text-[8px] font-bold uppercase tracking-[0.22em] text-white/40">NEW ARRIVAL</p>
                    <p className="mt-1 text-xs font-semibold text-white">The Evening Edit</p>
                  </div>

                  <div className="sv-signup-float-b absolute right-[-32px] top-[24%] rounded-[1.4rem] border border-white/15 bg-black/30 p-3.5 backdrop-blur-2xl">
                    <p className="mb-3 text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">STYLE NOTES</p>
                    <div className="flex gap-2">
                      <span className="h-7 w-7 rounded-full bg-[#eee1d4] ring-1 ring-white/20" />
                      <span className="h-7 w-7 rounded-full bg-[#4a3642] ring-1 ring-white/20" />
                      <span className="h-7 w-7 rounded-full bg-[#a37b68] ring-1 ring-white/20" />
                      <span className="h-7 w-7 rounded-full bg-[#cfb273] ring-1 ring-white/20" />
                    </div>
                  </div>

                  <div className="absolute bottom-[13%] right-[-48px] flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2.5 text-[10px] font-semibold text-white/80 backdrop-blur-xl">
                    <span className="text-amber-200"><SparkleIcon /></span>
                    Shop · Save · Create
                  </div>
                </div>
              </div>

              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-amber-200">YOUR STYLE. YOUR SPACE.</p>
                </div>
                <h1 className="mt-4 text-4xl font-black leading-[0.96] tracking-[-0.06em] xl:text-[60px]">
                  Create your
                  <span className="block bg-gradient-to-r from-[#f2ddbf] via-[#dab6c8] to-[#e7d7a9] bg-clip-text text-transparent">
                    fashion universe.
                  </span>
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-white/50">
                  Create an account to save your wishlist, addresses, orders and future style creations.
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {[
                    "Wishlist",
                    "Orders",
                    "Saved Styles",
                    "Outfit Builder",
                  ].map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              RIGHT — SIGNUP
          ================================================== */}
          <section className="relative flex items-center overflow-hidden bg-[#f7f5f1]">
            <div className="sv-signup-glow absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full bg-indigo-200/35 blur-[90px]" />
            <div className="sv-signup-glow absolute -bottom-28 -left-28 h-[330px] w-[330px] rounded-full bg-fuchsia-200/30 blur-[90px]" />
            <div className="absolute right-[12%] top-[46%] h-[140px] w-[140px] rounded-full bg-amber-100/50 blur-[65px]" />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-white/80" />

            <div className="relative z-10 mx-auto w-full max-w-[500px] px-6 py-10 sm:px-10 lg:px-12 xl:px-14">
              <div className="mb-8 flex items-center justify-between">
                <Link to="/" className="text-xl font-black tracking-[-0.07em] text-slate-950">
                  STYLEVERSE
                </Link>
                <Link to="/shop" className="text-xs font-semibold text-slate-400 transition hover:text-indigo-600">
                  Browse shop →
                </Link>
              </div>

              <div className="sv-signup-reveal">
                <div className="flex items-center gap-3">
                  <span className="h-[2px] w-9 bg-gradient-to-r from-fuchsia-500 to-indigo-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">CREATE YOUR ACCOUNT</span>
                </div>

                <h2 className="mt-5 text-[48px] font-black leading-[0.94] tracking-[-0.07em] text-slate-950 sm:text-[54px]">
                  Join
                  <span className="block bg-gradient-to-r from-slate-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                    Styleverse.
                  </span>
                </h2>

                <p className="mt-5 max-w-md text-sm leading-6 text-slate-500">
                  A few details and you’re ready to explore Styleverse.
                </p>
              </div>

              {(error || message) && (
                <div className={`sv-signup-reveal mt-7 rounded-2xl border px-4 py-3 text-sm font-medium ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {error || message}
                </div>
              )}

              {needsVerification && !error && (
                <div className="mt-3 border border-[#e3d5c8] bg-[#f9f3ec] px-4 py-3 text-[12px] leading-5 text-[#6f645c]">
                  Verification is handled by the backend flow. Check the inbox connected to this email address for the verification message or OTP.
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
                {/* Full name */}
                <div>
                  <label htmlFor="signup-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    Full name
                  </label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><UserIcon /></span>
                    <input
                      id="signup-name"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      autoComplete="name"
                      placeholder="Your name"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pl-12 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:-translate-y-0.5 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="signup-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    Email address
                  </label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><MailIcon /></span>
                    <input
                      id="signup-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pl-12 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:-translate-y-0.5 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="signup-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                      Password
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">8+ characters</span>
                  </div>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><LockIcon /></span>
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pl-12 pr-14 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:-translate-y-0.5 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <EyeIcon hidden={showPassword} />
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((part) => (
                        <span key={part} className={`h-1.5 flex-1 rounded-full ${part <= passwordScore ? "bg-slate-800" : "bg-slate-200"}`} />
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{passwordLabel || "Use a strong password"}</span>
                      {form.password && <span>{passwordScore}/4 checks</span>}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-slate-500">
                    {[
                      [passwordChecks.length, "8+ characters"],
                      [passwordChecks.upper, "One uppercase"],
                      [passwordChecks.number, "One number"],
                      [passwordChecks.special, "One special character"],
                    ].map(([ok, label]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-300"}`}>
                          <CheckIcon />
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="signup-confirm" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    Confirm password
                  </label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><LockIcon /></span>
                    <input
                      id="signup-confirm"
                      type={showPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pl-12 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:-translate-y-0.5 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)]"
                    />
                  </div>
                  {form.confirmPassword && (
                    <p className={`mt-2 text-[11px] font-medium ${form.password === form.confirmPassword ? "text-emerald-600" : "text-red-600"}`}>
                      {form.password === form.confirmPassword ? "Passwords match." : "Passwords do not match."}
                    </p>
                  )}
                </div>

                {/* Terms */}
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3.5 text-[11px] leading-5 text-slate-500">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  />
                  <span>
                    I agree to Styleverse’s terms and acknowledge the privacy policy.
                  </span>
                </label>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center overflow-hidden rounded-[1.2rem] bg-gradient-to-r from-[#11121a] via-[#292343] to-[#11121a] px-5 py-4 text-sm font-bold text-white shadow-[0_20px_45px_rgba(22,20,42,0.22)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_rgba(22,20,42,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative z-10">{loading ? "Creating account…" : "Create account"}</span>
                  {!loading && <span className="absolute right-4 transition duration-300 group-hover:translate-x-1"><ArrowIcon /></span>}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <ShieldIcon />
                Protected account authentication
              </div>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-[0_12px_35px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.07)]">
                <p className="text-xs text-slate-400">Already have an account?</p>
                <Link to="/login" className="mt-1 inline-block text-sm font-black text-slate-950 transition hover:text-fuchsia-600">
                  Sign in to Styleverse →
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">
                <Link to="/forgot-password" className="transition hover:text-indigo-600">Forgot password</Link>
                <span className="text-slate-200">•</span>
                <Link to="/shop" className="transition hover:text-indigo-600">Continue as guest</Link>
              </div>

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