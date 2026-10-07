import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiJson } from "../utils/api";

function getToken(response) {
  return (
    response?.data?.token ||
    response?.token ||
    response?.data?.accessToken ||
    response?.accessToken ||
    ""
  );
}

function getUser(response) {
  return response?.data?.user || response?.user || null;
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path
        d="M4 7l8 6 8-6"
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
      className="h-5 w-5"
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
      strokeWidth="1.4"
      className="h-4 w-4"
    >
      <path
        d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(() => {
    return (
      location.state?.email ||
      localStorage.getItem(
        "styleverse_pending_verification_email"
      ) ||
      ""
    );
  });

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  // ============================================================
  // VERIFY OTP
  // POST /api/auth/verify-otp
  // ============================================================

  async function verify(value) {
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    const cleanValue = String(value || "").trim();

    if (!cleanEmail) {
      setError(
        "Enter the email address used for your Styleverse account."
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanValue)) {
      setError(
        "Enter the 6-digit OTP sent to your email."
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiJson(
        "/auth/verify-otp",
        {
          method: "POST",
          data: {
            email: cleanEmail,
            otp: cleanValue,
          },
        }
      );

      const nextToken = getToken(response);
      const user = getUser(response);

      // Save JWT
      if (nextToken) {
        localStorage.setItem(
          "token",
          nextToken
        );

        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "styleverse_token"
        );
      }

      // Save user
      if (user) {
        localStorage.setItem(
          "styleverse_user",
          JSON.stringify(user)
        );
      }

      // Remove pending verification email
      localStorage.removeItem(
        "styleverse_pending_verification_email"
      );

      setVerified(true);

      setMessage(
        response?.message ||
          response?.data?.message ||
          "Email verified successfully. Your Styleverse account is ready."
      );
    } catch (err) {
      setVerified(false);

      setError(
        err?.message ||
          "Email verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // LOAD EMAIL FROM SIGNUP STATE
  // ============================================================

  useEffect(() => {
    const stateEmail = location.state?.email;

    if (stateEmail) {
      const cleanEmail = String(stateEmail)
        .trim()
        .toLowerCase();

      setEmail(cleanEmail);

      localStorage.setItem(
        "styleverse_pending_verification_email",
        cleanEmail
      );
    }
  }, [location.state]);

  // ============================================================
  // RESEND OTP
  // POST /api/auth/send-otp
  // ============================================================

  async function resendOtp() {
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!cleanEmail) {
      setError(
        "Enter the email address used for your Styleverse account."
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await apiJson(
        "/auth/send-otp",
        {
          method: "POST",
          data: {
            email: cleanEmail,
          },
        }
      );

      setMessage(
        response?.message ||
          response?.data?.message ||
          "A new OTP has been sent to your email."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not resend OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // AFTER SUCCESS
  // ============================================================

  useEffect(() => {
    if (!verified) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      navigate("/", {
        replace: true,
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [verified, navigate]);

  return (
    <main className="min-h-screen bg-[#f3ede7] px-3 py-4 sm:px-6 sm:py-7 lg:px-8 lg:py-10">
      <style>{`
        @keyframes svVerifyFloatA {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -12px, 0);
          }
        }

        @keyframes svVerifyFloatB {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, 10px, 0);
          }
        }

        @keyframes svVerifyPulse {
          0%, 100% {
            opacity: .45;
            transform: scale(1);
          }

          50% {
            opacity: .9;
            transform: scale(1.08);
          }
        }

        @keyframes svVerifyReveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sv-verify-float-a {
          animation: svVerifyFloatA 7s ease-in-out infinite;
        }

        .sv-verify-float-b {
          animation: svVerifyFloatB 8s ease-in-out infinite;
        }

        .sv-verify-pulse {
          animation: svVerifyPulse 4.8s ease-in-out infinite;
        }

        .sv-verify-reveal {
          animation: svVerifyReveal .75s ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .sv-verify-float-a,
          .sv-verify-float-b,
          .sv-verify-pulse,
          .sv-verify-reveal {
            animation: none !important;
          }
        }
      `}</style>

      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1360px] overflow-hidden rounded-[2rem] border border-[#d9cec4] bg-[#fffdf9] shadow-[0_35px_100px_rgba(69,51,41,0.12)] lg:min-h-[calc(100vh-80px)] lg:grid-cols-[1fr_0.84fr]">
        
        {/* ======================================================
            LEFT PANEL
        ======================================================= */}

        <section className="relative hidden overflow-hidden bg-[#2d2725] p-9 text-[#fffaf4] lg:flex lg:min-h-full lg:flex-col lg:justify-between xl:p-12">
          
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(215,182,139,0.27),transparent_22%),radial-gradient(circle_at_83%_70%,rgba(141,92,115,0.34),transparent_30%),linear-gradient(140deg,#211d1b,#332827,#211b1a)]" />

          <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#d9b27e]/10 blur-3xl sv-verify-pulse" />

          <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[#8c6378]/10 blur-3xl sv-verify-pulse" />

          <div className="relative z-10">
            <Link
              to="/"
              className="text-xl font-black tracking-[-0.07em]"
            >
              STYLEVERSE
            </Link>

            <div className="mt-24 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#d8b990]">
                STYLEVERSE / ACCESS
              </p>

              <h1 className="mt-7 font-serif text-6xl leading-[0.93] tracking-[-0.04em] xl:text-7xl">
                Confirm your
                <span className="block text-[#d9b27e]">
                  place.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-[15px] leading-7 text-[#ddd4ce]">
                Verify your email to complete account access and
                keep your Styleverse experience connected.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4">

            <div className="sv-verify-float-a border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                01
              </p>

              <p className="mt-2 text-sm font-semibold">
                Secure access
              </p>

              <p className="mt-1 text-xs leading-5 text-white/50">
                One verified identity for your account.
              </p>
            </div>

            <div className="sv-verify-float-b border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                02
              </p>

              <p className="mt-2 text-sm font-semibold">
                Your style, saved
              </p>

              <p className="mt-1 text-xs leading-5 text-white/50">
                Wishlist, orders and future creations stay connected.
              </p>
            </div>

          </div>
        </section>

        {/* ======================================================
            RIGHT PANEL
        ======================================================= */}

        <section className="relative flex items-center overflow-hidden bg-[#f8f5f0] p-6 sm:p-10 lg:p-12 xl:p-16">

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#d9b27e]/20 blur-[90px]" />

          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#9a7285]/15 blur-[90px]" />

          <div className="relative z-10 mx-auto w-full max-w-md">

            {/* TOP NAV */}

            <div className="flex items-center justify-between">

              <Link
                to="/"
                className="text-xl font-black tracking-[-0.07em] text-[#26211f] lg:hidden"
              >
                STYLEVERSE
              </Link>

              <Link
                to="/shop"
                className="ml-auto text-xs font-semibold text-[#8b8179] transition hover:text-[#6f5763]"
              >
                Browse shop →
              </Link>

            </div>

            {/* HEADER */}

            <div className="sv-verify-reveal mt-12">

              <div className="flex items-center gap-3">
                <span className="h-[2px] w-9 bg-gradient-to-r from-[#8b5f72] to-[#c6a276]" />

                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9a8e84]">
                  Account verification
                </span>
              </div>

              <div className="mt-7 flex h-16 w-16 items-center justify-center rounded-full border border-[#d9cec4] bg-white text-[#6f5763] shadow-[0_12px_30px_rgba(57,45,35,0.06)]">
                {verified ? (
                  <ShieldIcon />
                ) : (
                  <MailIcon />
                )}
              </div>

              <h2 className="mt-7 font-serif text-5xl leading-[0.96] tracking-[-0.04em] text-[#26211f] sm:text-6xl">
                Verify your
                <span className="block text-[#8b5f72]">
                  email.
                </span>
              </h2>

              <p className="mt-5 text-[14px] leading-6 text-[#756c65] sm:text-[15px]">
                Enter the verification code sent to your
                email address.
              </p>

            </div>

            {/* MESSAGE */}

            {(error || message) && (
              <div
                className={`sv-verify-reveal mt-7 border px-4 py-3.5 text-[13px] leading-5 ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {error || message}
              </div>
            )}

            {/* FORM */}

            <div className="sv-verify-reveal mt-8">

              {/* EMAIL */}

              <label
                htmlFor="verify-email"
                className="text-[13px] font-semibold text-[#433b36]"
              >
                Email address
              </label>

              <div className="mt-2 flex items-center border border-[#d8cec5] bg-white transition focus-within:border-[#6f5763] focus-within:ring-2 focus-within:ring-[#6f5763]/10">

                <input
                  id="verify-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    const value = event.target.value;

                    setEmail(value);

                    localStorage.setItem(
                      "styleverse_pending_verification_email",
                      value.trim().toLowerCase()
                    );

                    if (error) {
                      setError("");
                    }

                    if (message) {
                      setMessage("");
                    }
                  }}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-transparent px-4 py-4 text-sm text-[#26211f] outline-none placeholder:text-[#b1a69e]"
                />

              </div>

              {/* OTP */}

              <label
                htmlFor="verify-code"
                className="mt-5 block text-[13px] font-semibold text-[#433b36]"
              >
                Verification code
              </label>

              <div className="mt-2 flex items-center border border-[#d8cec5] bg-white transition focus-within:border-[#6f5763] focus-within:ring-2 focus-within:ring-[#6f5763]/10">

                <input
                  id="verify-code"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value);

                    if (error) {
                      setError("");
                    }

                    if (message) {
                      setMessage("");
                    }

                    if (verified) {
                      setVerified(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      verify(otp);
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Enter code"
                  aria-describedby="verify-help"
                  className="min-w-0 flex-1 bg-transparent px-4 py-4 text-center text-[18px] tracking-[0.24em] text-[#26211f] outline-none placeholder:text-[#b1a69e]"
                />

                <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0e9e2] text-[#8b5f72]">
                  <SparkleIcon />
                </div>

              </div>

              <p
                id="verify-help"
                className="mt-2 text-[11px] leading-5 text-[#9a8e84]"
              >
                The OTP is valid for 10 minutes. You can
                request a new OTP after the resend cooldown.
              </p>

              {/* VERIFY BUTTON */}

              <button
                type="button"
                disabled={loading}
                onClick={() => verify(otp)}
                className="mt-5 w-full border border-[#292321] bg-[#292321] px-5 py-4 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#fffaf4] transition hover:bg-[#413833] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Verifying…"
                  : verified
                  ? "Verified"
                  : "Verify email"}
              </button>

              {/* RESEND BUTTON */}

              <button
                type="button"
                disabled={loading}
                onClick={resendOtp}
                className="mt-3 w-full border border-[#d8cec5] bg-white px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#433b36] transition hover:border-[#bcaea3] hover:bg-[#fbf8f4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resend OTP
              </button>

            </div>

            {/* SUCCESS */}

            {verified ? (
              <div className="mt-6 border border-[#e3d5c8] bg-[#fbf5ee] px-4 py-4 text-center text-[12px] leading-5 text-[#6f645c]">
                Your account is ready. Taking you to
                Styleverse…
              </div>
            ) : (
              <div className="mt-7 grid grid-cols-2 gap-3">

                <Link
                  to="/login"
                  className="border border-[#d8cec5] bg-white px-4 py-3 text-center text-[12px] font-semibold text-[#433b36] transition hover:border-[#bcaea3] hover:bg-[#fbf8f4]"
                >
                  Back to login
                </Link>

                <Link
                  to="/signup"
                  className="border border-[#d8cec5] bg-white px-4 py-3 text-center text-[12px] font-semibold text-[#433b36] transition hover:border-[#bcaea3] hover:bg-[#fbf8f4]"
                >
                  Create account
                </Link>

              </div>
            )}

            {/* FOOTER */}

            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#aaa097]">
              <ShieldIcon />
              Secure account verification
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}