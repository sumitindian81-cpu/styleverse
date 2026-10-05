// src/layouts/MainLayout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { label: "Shop", to: "/shop" },
      { label: "Outfit Studio", to: "/studio" },
      { label: "Outfit Builder", to: "/builder" },
      { label: "Wishlist", to: "/wishlist" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Profile", to: "/profile" },
      { label: "Orders", to: "/orders" },
      { label: "Cart", to: "/cart" },
      { label: "Checkout", to: "/checkout" },
    ],
  },
];

const policyLinks = [
  { label: "About Styleverse", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Shipping", to: "/shipping" },
  { label: "Returns", to: "/returns" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms & Policies", to: "/policies" },
];

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center text-[13px] leading-6 text-[#6f6863] transition-colors duration-200 hover:text-[#1d1a18]"
    >
      <span>{children}</span>
      <span className="ml-2 h-px w-0 bg-[#9d8460] transition-all duration-200 group-hover:w-4" />
    </Link>
  );
}

function SocialLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center border border-[#d9d0c7] text-[#514a45] transition-all duration-200 hover:border-[#9d8460] hover:bg-[#f4eee7] hover:text-[#1d1a18]"
    >
      {children}
    </a>
  );
}

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[#ddd4cb] bg-[#f8f4ef] text-[#27231f]">
      <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.15fr] lg:gap-10">
          <div className="max-w-md">
            <div className="font-serif text-3xl tracking-[-0.03em]">
              Styleverse
            </div>

            <p className="mt-5 max-w-sm text-[14px] leading-7 text-[#6f6863]">
              A fashion destination for everyday essentials, considered
              details, and personal expression. Shop the collection, shape
              your look, and make it yours.
            </p>

            <div className="mt-7 flex items-center gap-2.5">
              <SocialLink
                href="https://www.instagram.com/"
                label="Styleverse on Instagram"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.3" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </SocialLink>

              <SocialLink
                href="https://www.facebook.com/"
                label="Styleverse on Facebook"
              >
                <span className="font-serif text-base">f</span>
              </SocialLink>

              <SocialLink
                href="https://www.pinterest.com/"
                label="Styleverse on Pinterest"
              >
                <span className="font-serif text-base">p</span>
              </SocialLink>

              <SocialLink
                href="mailto:hello@styleverse.com"
                label="Email Styleverse"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="5" width="18" height="14" rx="1.5" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </SocialLink>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3f3833]">
              Explore
            </p>
            <div className="mt-5 flex flex-col items-start gap-1.5">
              {footerGroups[0].links.map((link) => (
                <FooterLink key={link.to} to={link.to}>
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3f3833]">
              Account
            </p>
            <div className="mt-5 flex flex-col items-start gap-1.5">
              {footerGroups[1].links.map((link) => (
                <FooterLink key={link.to} to={link.to}>
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3f3833]">
              Customer Care
            </p>

            <p className="mt-5 text-[13px] leading-6 text-[#6f6863]">
              Support for orders, delivery, returns, and anything else you
              need along the way.
            </p>

            <a
              href="mailto:hello@styleverse.com"
              className="mt-4 inline-flex border-b border-[#bca588] pb-1 text-[13px] text-[#3f3833] transition-colors hover:text-[#9d8460]"
            >
              hello@styleverse.com
            </a>

            <div className="mt-5 flex flex-col items-start gap-1.5">
              {policyLinks.map((link) => (
                <FooterLink key={link.to} to={link.to}>
                  {link.label}
                </FooterLink>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 border-t border-[#ddd4cb] pt-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-[#817871]">
            <span>Secure checkout</span>
            <span>Easy returns</span>
            <span>Made for style</span>
          </div>

          <p className="text-[12px] text-[#817871] md:text-right">
            © {year} Styleverse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbf8f4] text-[#27231f]">
      <Navbar />

      <main className="min-h-[calc(100vh-5rem)]">
        <Outlet />
      </main>

      <Footer key={location.pathname} />
    </div>
  );
}