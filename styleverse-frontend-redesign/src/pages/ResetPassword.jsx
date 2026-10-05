import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../utils/api";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M12 3l7 3v5c0 4.6-3 7.8-7 10-4-2.2-7-5.4-7-10V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.5 10.7a2 2 0 002.7 2.7" strokeLinecap="round" />
      <path d="M9.9 4.3A10.5 10.5 0 0112 4c5.2 0 8.7 4.7 9.8 7-.6 1.2-1.8 3-4 4.6" strokeLinecap="round" />
      <path d="M6.2 6.2C4.1 7.7 2.8 9.7 2.2 11c1.1 2.3 4.6 7 9.8 7 1.2 0 2.3-.2 3.3-.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path d="M2.2 12s3.5-6 9.8-6 9.8 6 9.8 6-3.5 6-9.8 6-9.8-6-9.8-6z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M5 12h13" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PasswordRule({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${ok ? "text-emerald-700" : "text-slate-400"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`} />
      {children}
    </span>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[A-Za-z]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    setError("");
    setMessage("");
    setSuccess(false);
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSuccess(false);

    if (!token) {
      setError("This password reset link is missing its token or may be invalid.");
      return;
    }

    if (!hasMinLength) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!hasLetter || !hasNumber) {
      setError("Use at least one letter and one number in your password.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiJson("/auth/reset-password", {
        method: "POST",
        data: {
          token,
          password,
          confirmPassword,
        },
      });

      const nextMessage =
        response?.message ||
        response?.data?.message ||
        "Your password has been updated successfully.";

      setMessage(nextMessage);
      setSuccess(true);
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    } catch (err) {
      if (err?.status === 404) {
        setError(
          "Password reset is not enabled on the current backend yet. Please request a new reset flow once the backend endpoint is available."
        );
      } else {
        setError(
          err?.message ||
            "Unable to reset the password. Please request a new reset link."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="min-h-screen bg-[#07080b] p-2.5 sm:p-4 lg:p-6">
        <div className="mx-auto flex min-h-[calc(100vh-20px)] max-w-[1450px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#111218] shadow-[0_40px_140px_rgba(0,0,0,0.62)] lg:min-h-[calc(100vh-48px)]">
          <section className="relative hidden min-w-0 flex-1 overflow-hidden lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(236,72,153,0.24),transparent_27%),radial-gradient(circle_at_82%_22%,rgba(99,102,241,0.30),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,0.12),transparent_28%),linear-gradient(135deg,#090a10,#171828,#08090e)]" />
            <div className="absolute -left-24 -top-24 h-[400px] w-[400px] rounded-full bg-fuchsia-500/15 blur-[110px]" />
            <div className="absolute -bottom-40 -right-28 h-[500px] w-[500px] rounded-full bg-indigo-500/15 blur-[120px]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />

            <div className="relative z-10 flex h-full w-full flex-col justify-between p-9 xl:p-12">
              <div className="flex items-center justify-between">
                <Link to="/" className="text-xl font-black tracking-[-0.07em] text-white">STYLEVERSE</Link>
                <span className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/65 backdrop-blur-xl">Secure recovery</span>
              </div>

              <div className="max-w-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-fuchsia-300">ACCOUNT SECURITY</p>
                <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.065em] text-white xl:text-[68px]">
                  A fresh password.
                  <span className="block bg-gradient-to-r from-fuchsia-200 via-violet-200 to-amber-100 bg-clip-text text-transparent">Nothing else changes.</span>
                </h1>
                <p className="mt-6 max-w-lg text-sm leading-6 text-white/50">Create a new password and return to your Styleverse account with your saved shopping journey intact.</p>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">Encrypted access</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">Private account</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">Styleverse</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                <ShieldIcon /> Protected account authentication
              </div>
            </div>
          </section>

          <section className="relative flex w-full items-center overflow-hidden bg-[#f7f5f1] lg:w-[43%]">
            <div className="absolute -right-32 -top-32 h-[360px] w-[360px] rounded-full bg-indigo-200/35 blur-[90px]" />
            <div className="absolute -bottom-32 -left-32 h-[340px] w-[340px] rounded-full bg-fuchsia-200/30 blur-[90px]" />

            <div className="relative z-10 mx-auto w-full max-w-[470px] px-6 py-10 sm:px-10 lg:px-12 xl:px-14">
              <div className="mb-10 flex items-center justify-between">
                <Link to="/" className="text-xl font-black tracking-[-0.07em] text-slate-950">STYLEVERSE</Link>
                <Link to="/shop" className="text-xs font-semibold text-slate-400 transition hover:text-indigo-600">Browse shop →</Link>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <span className="h-[2px] w-9 bg-gradient-to-r from-fuchsia-500 to-indigo-500" />
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">SECURITY</span>
                </div>
                <h2 className="mt-5 text-[43px] font-black leading-[0.96] tracking-[-0.07em] text-slate-950 sm:text-[50px]">Set a new <span className="block bg-gradient-to-r from-slate-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">password.</span></h2>
                <p className="mt-5 max-w-md text-sm leading-6 text-slate-500">Choose a strong password for your Styleverse account.</p>
              </div>

              {!token && (
                <div className="mt-7 border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-5 text-amber-800">This reset link does not contain a valid token. Request a new reset email.</div>
              )}

              {(error || message) && (
                <div className={`mt-7 rounded-2xl border px-4 py-3 text-sm font-medium ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {error || message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="new-password" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">New password</label>
                    <span className="text-[11px] text-slate-400">8+ characters</span>
                  </div>

                  <div className="relative mt-2">
                    <input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={loading || success} placeholder="Enter a new password" className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pr-16 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)] disabled:bg-slate-50" />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} disabled={loading || success} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50" aria-label={showPassword ? "Hide password" : "Show password"}>
                      <EyeIcon hidden={showPassword} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium">
                    <PasswordRule ok={hasMinLength}>8+ characters</PasswordRule>
                    <PasswordRule ok={hasLetter}>One letter</PasswordRule>
                    <PasswordRule ok={hasNumber}>One number</PasswordRule>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Confirm password</label>
                  <div className="relative mt-2">
                    <input id="confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={loading || success} placeholder="Confirm your new password" className="w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 pr-16 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.035)] outline-none transition duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:shadow-[0_15px_35px_rgba(99,102,241,0.10)] disabled:bg-slate-50" />
                    <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} disabled={loading || success} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50" aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}>
                      <EyeIcon hidden={showConfirmPassword} />
                    </button>
                  </div>
                  {confirmPassword && <p className={`mt-2 text-[11px] font-medium ${passwordsMatch ? "text-emerald-700" : "text-red-600"}`}>{passwordsMatch ? "Passwords match." : "Passwords do not match."}</p>}
                </div>

                <button type="submit" disabled={loading || success || !token} className="group relative flex w-full items-center justify-center overflow-hidden rounded-[1.2rem] bg-gradient-to-r from-[#11121a] via-[#292343] to-[#11121a] px-5 py-4 text-sm font-bold text-white shadow-[0_20px_45px_rgba(22,20,42,0.22)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_55px_rgba(22,20,42,0.30)] disabled:cursor-not-allowed disabled:opacity-55">
                  <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-[340%]" />
                  <span className="relative z-10">{loading ? "Updating password…" : success ? "Password updated" : "Update password"}</span>
                  {!loading && !success && <span className="absolute right-4 transition duration-300 group-hover:translate-x-1"><ArrowIcon /></span>}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400"><ShieldIcon /> Secure password update</div>

              <div className="my-7 flex items-center gap-4"><div className="h-px flex-1 bg-slate-200" /><span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Account</span><div className="h-px flex-1 bg-slate-200" /></div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-[0_12px_35px_rgba(15,23,42,0.045)]">
                <p className="text-xs text-slate-400">Remembered your password?</p>
                <Link to="/login" className="mt-1 inline-block text-sm font-black text-slate-950 transition hover:text-fuchsia-600">Back to login →</Link>
              </div>

              <Link to="/shop" className="mt-6 block text-center text-xs font-semibold text-slate-400 transition hover:text-indigo-600">Continue shopping as guest</Link>
              <div className="mt-7 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300">STYLEVERSE · FASHION FOR EVERYONE</div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}