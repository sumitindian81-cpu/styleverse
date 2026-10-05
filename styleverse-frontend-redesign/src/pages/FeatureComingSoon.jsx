import { Link } from "react-router-dom";

export default function FeatureComingSoon({
  title,
  eyebrow = "Coming next",
  description,
  primaryTo = "/shop",
  primaryLabel = "Continue shopping",
}) {
  return (
    <div className="min-h-[70vh] bg-[#f6f1e9] px-5 py-16 text-[#1d1916] sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-5xl items-center justify-center">
        <section className="w-full border border-[#1d1916]/10 bg-white px-6 py-14 text-center shadow-[0_18px_70px_rgba(29,25,22,0.06)] sm:px-12 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7655]">
            Styleverse · {eyebrow}
          </p>
          <h1
            className="mx-auto mt-5 max-w-3xl text-4xl leading-tight sm:text-6xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6f665d] sm:text-lg">
            {description}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to={primaryTo}
              className="border border-[#1d1916] bg-[#1d1916] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#332c27] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7655] focus-visible:ring-offset-2"
            >
              {primaryLabel}
            </Link>
            <Link
              to="/"
              className="border border-[#1d1916]/15 bg-white px-6 py-3 text-sm font-semibold text-[#1d1916] transition hover:bg-[#faf8f4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7655] focus-visible:ring-offset-2"
            >
              Back home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}