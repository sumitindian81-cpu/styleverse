import { Link } from "react-router-dom";

const CONTENT = {
  about: {
    eyebrow: "Styleverse / About",
    title: "Fashion, with room for your own point of view.",
    body: [
      "Styleverse is a fashion marketplace built around two ideas: a simple shopping experience and a more personal way to create a look.",
      "Browse the collection, save pieces you love, customise a single garment in Custom Outfit Studio, or build a complete look with Virtual Outfit Builder.",
    ],
  },
  contact: {
    eyebrow: "Styleverse / Contact",
    title: "We are here when you need us.",
    body: [
      "For order questions, delivery support, returns, account help, or product assistance, reach out through the contact details below.",
      "We aim to keep every step of shopping and creating your style clear and straightforward.",
    ],
    contact: true,
  },
  shipping: {
    eyebrow: "Styleverse / Shipping",
    title: "Delivery, made clear.",
    body: [
      "Delivery availability, fees, and estimated timing are shown during checkout based on the current order and delivery address.",
      "Once an order is placed, tracking and status updates are available from your Orders area whenever tracking information is supplied.",
    ],
  },
  returns: {
    eyebrow: "Styleverse / Returns",
    title: "A straightforward returns experience.",
    body: [
      "Return eligibility can vary by product and order status. Please review the return information presented for your order before sending an item back.",
      "For help with a return, use the contact details on this page and keep your order reference available.",
    ],
  },
  privacy: {
    eyebrow: "Styleverse / Privacy",
    title: "Your account data should stay understandable and purposeful.",
    body: [
      "Styleverse uses account information to provide shopping, saved content, checkout, order, and support functionality.",
      "Authentication and order-related requests are handled through the application API. Access to account areas is protected by authentication controls.",
    ],
  },
  policies: {
    eyebrow: "Styleverse / Terms & Policies",
    title: "The details behind the experience.",
    body: [
      "These general policy pages provide navigation for store information. Product availability, pricing, order status, shipping, payment, and return rules are governed by the information shown at the time of the transaction.",
      "For a question about a specific order or product, contact support with the relevant reference so the current record can be checked.",
    ],
  },
};

function InfoPage({ type = "about" }) {
  const content = CONTENT[type] || CONTENT.about;

  return (
    <main className="min-h-[70vh] bg-[#f7f3ec] text-[#1d1916]">
      <section className="border-b border-[#1d1916]/10 bg-[#efe8dd]">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a7655]">
            {content.eyebrow}
          </p>
          <h1
            className="mt-5 max-w-4xl text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {content.title}
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <article className="border border-[#1d1916]/10 bg-white p-7 sm:p-10">
            <div className="space-y-5 text-[15px] leading-8 text-[#625a53]">
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {content.contact ? (
              <div className="mt-8 border-t border-[#1d1916]/10 pt-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
                  Customer care
                </p>
                <a
                  href="mailto:hello@styleverse.com"
                  className="mt-3 inline-block text-lg font-semibold text-[#1d1916] underline decoration-[#c9b190] underline-offset-4"
                >
                  hello@styleverse.com
                </a>
              </div>
            ) : null}
          </article>

          <aside className="border border-[#1d1916]/10 bg-[#eee7dc] p-7 sm:p-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a7655]">
              Explore Styleverse
            </p>
            <div className="mt-6 space-y-3">
              <Link
                to="/shop"
                className="flex items-center justify-between border-b border-[#1d1916]/10 pb-3 text-sm font-semibold hover:text-[#75604b]"
              >
                Shop collection <span>→</span>
              </Link>
              <Link
                to="/studio"
                className="flex items-center justify-between border-b border-[#1d1916]/10 pb-3 text-sm font-semibold hover:text-[#75604b]"
              >
                Custom Outfit Studio <span>→</span>
              </Link>
              <Link
                to="/builder"
                className="flex items-center justify-between border-b border-[#1d1916]/10 pb-3 text-sm font-semibold hover:text-[#75604b]"
              >
                Outfit Builder <span>→</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default InfoPage;