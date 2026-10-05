import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../utils/api";

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
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
      aria-hidden="true"
    >
      <path d="M5 12h13" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
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
      aria-hidden="true"
    >
      <path
        d="M12 3l7 3v5c0 4.6-3 7.8-7 10-4-2.2-7-5.4-7-10V6l7-3z"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = Boolean(cleanEmail) && isValidEmail(cleanEmail) && !loading;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!cleanEmail) {
      setError("Email is required.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiJson("/auth/forgot-password", {
        method: "POST",
        data: { email: cleanEmail },
      });

      const serverMessage =
        response?.message ||
        response?.data?.message ||
        "If this email is registered, password reset instructions have been sent.";

      setSubmittedEmail(cleanEmail);
      setMessage(serverMessage);
    } catch (err) {
      if (err?.status === 404) {
        setError(
          "Password recovery is not enabled on the Styleverse server yet. The frontend is ready for the reset API."
        );
      } else {
        setError(
          err?.message ||
            "We could not start the password reset process right now. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1ea] px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      <style>{`
        @keyframes svRecoverFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -10px, 0); }
        }
        @keyframes svRecoverReveal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sv-recover-float { animation: svRecoverFloat 7s ease-in-out infinite; }
        .sv-recover-reveal { animation: svRecoverReveal .7s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .sv-recover-float,
          .sv-recover-reveal { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden border border-[#ded5cc] bg-[#fffdf9] shadow-[0_30px_90px_rgba(57,45,35,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#2d2725] p-10 text-[#fffaf4] lg:flex lg:min-h-[700px] lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(216,185,144,0.24),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(139,95,114,0.32),transparent_32%),linear-gradient(135deg,#292321,#342a29)]" />
          <div className="pointer-events-none absolute right-[-80px] top-[18%] h-64 w-64 rounded-full border border-white/10 bg-white/[0.03] sv-recover-float" />
          <div className="pointer-events-none absolute bottom-[-120px] left-[-60px] h-72 w-72 rounded-full border border-white/10 bg-white/[0.02] blur-[2px]" />

          <div className="relative z-10">
            <Link
              to="/"
              className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[#f3e5d6] transition hover:text-white"
            >
              STYLEVERSE
            </Link>

            <div className="mt-12 max-w-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d8b990]">
                Account recovery
              </p>
              <h1 className="mt-6 font-serif text-6xl leading-[0.96] tracking-[-0.035em] xl:text-7xl">
                Back to
                <br />
                your wardrobe.
              </h1>
              <p className="mt-7 max-w-md text-[15px] leading-7 text-[#dfd7d0]">
                A quick reset keeps your account, wishlist, orders and future style creations exactly where you left them.
              </p>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/15 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c7bbb2]">
            Secure account recovery · Styleverse
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-14 xl:p-16">
          <div className="sv-recover-reveal mx-auto w-full max-w-md">
            <div className="flex items-center justify-between gap-4">
              <Link
                to="/"
                className="text-xl font-black tracking-[-0.07em] text-[#2d2725] lg:hidden"
              >
                STYLEVERSE
              </Link>
              <Link
                to="/shop"
                className="ml-auto text-xs font-semibold text-[#8f837a] transition hover:text-[#6d5360]"
              >
                Browse shop →
              </Link>
            </div>

            <div className="mt-10">
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-9 bg-gradient-to-r from-[#8b5f72] to-[#c79a63]" />
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8b8179]">
                  Account recovery
                </span>
              </div>

              <h2 className="mt-5 font-serif text-5xl leading-[0.98] tracking-[-0.035em] text-[#26211f]">
                Forgot
                <br />
                password?
              </h2>
              <p className="mt-5 text-[14px] leading-7 text-[#756c65]">
                Enter the email connected to your Styleverse account and we’ll start the reset flow.
              </p>
            </div>

            {(error || message) && (
              <div
                className={`mt-7 border px-4 py-3 text-[13px] leading-5 ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
                role="status"
                aria-live="polite"
              >
                {error || message}
              </div>
            )}

            {message && submittedEmail && (
              <div className="mt-3 border border-[#e4d7cb] bg-[#fbf7f2] px-4 py-3 text-[12px] leading-5 text-[#6f645c]">
                Reset instructions were requested for <strong>{submittedEmail}</strong>. Check that inbox and follow the instructions from the backend.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label htmlFor="forgot-email" className="block">
                <span className="text-[13px] font-semibold text-[#433b36]">Email address</span>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8f87]">
                    <MailIcon />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    inputMode="email"
                    className="w-full border border-[#d8cec5] bg-white px-4 py-3.5 pl-12 text-[14px] text-[#292321] outline-none transition placeholder:text-[#a59b93] focus:border-[#6f5763] focus:ring-2 focus:ring-[#6f5763]/10"
                    aria-invalid={Boolean(error)}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative flex w-full items-center justify-center overflow-hidden border border-[#292321] bg-[#292321] px-5 py-3.5 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#fffaf4] transition duration-300 hover:bg-[#413833] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-[140%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[340%]" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? "Sending…" : "Send reset instructions"}
                  {!loading && <ArrowIcon />}
                </span>
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9a8f87]">
              <ShieldIcon />
              Protected account recovery
            </div>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#e4ddd6]" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b4aaa2]">or</span>
              <div className="h-px flex-1 bg-[#e4ddd6]" />
            </div>

            <div className="border border-[#dfd5cc] bg-white px-5 py-5 text-center">
              <p className="text-[13px] text-[#8c8178]">Remember your password?</p>
              <Link
                to="/login"
                className="mt-1 inline-block text-[14px] font-black text-[#2d2725] transition hover:text-[#8b5f72]"
              >
                Return to login →
              </Link>
            </div>

            <Link
              to="/shop"
              className="mt-6 block text-center text-[12px] font-semibold text-[#968a82] transition hover:text-[#6d5360]"
            >
              Continue shopping as guest
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}