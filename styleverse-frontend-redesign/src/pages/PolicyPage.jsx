import { Link } from "react-router-dom";

const CONTENT = {
  about: {
    eyebrow: "Styleverse / About",
    title: "Fashion, with room for expression.",
    intro: "Styleverse brings everyday fashion shopping together with tools that let you shape a garment and build complete looks.",
    sections: [
      ["The store", "Browse the collection, compare details, choose variants, save favourites and move from product discovery to checkout in one connected experience."],
      ["The Studio", "Customize one garment at a time with colour, pattern and style details, then save the finished design to your account."],
      ["The Builder", "Mix multiple ready-made pieces into a complete look, save it, share it and move the whole outfit into your shopping bag."],
    ],
  },
  contact: {
    eyebrow: "Styleverse / Contact",
    title: "We’re here when you need us.",
    intro: "For order, delivery, return or account questions, reach the Styleverse support team through the details below.",
    sections: [
      ["Email", "hello@styleverse.com"],
      ["Order support", "Please include your order number and the email used for the purchase so the support team can locate the order faster."],
      ["Response", "Support availability and response time may vary depending on the volume of requests."],
    ],
  },
  shipping: {
    eyebrow: "Styleverse / Shipping",
    title: "Delivery, clearly explained.",
    intro: "Shipping charges and delivery timing are shown in the cart and checkout flow using the current store calculation.",
    sections: [
      ["Delivery estimate", "Your checkout screen shows the delivery information available for the current order."],
      ["Shipping charge", "The final shipping charge is calculated by the server and included in the checkout total."],
      ["Order tracking", "Once an order is placed, its status and available tracking information can be viewed from Orders."],
    ],
  },
  returns: {
    eyebrow: "Styleverse / Returns",
    title: "Returns, without the guesswork.",
    intro: "Return availability depends on the store policy applicable to the order. Check the order details and contact support when a return needs assistance.",
    sections: [
      ["Start with your order", "Keep the order number available when contacting support about a return."],
      ["Condition", "Items should be returned according to the applicable store return requirements communicated for the order."],
      ["Refunds", "Refund processing and timing depend on the return outcome and payment method used for the order."],
    ],
  },
  privacy: {
    eyebrow: "Styleverse / Privacy",
    title: "Your account data, handled with care.",
    intro: "Styleverse uses account information needed to provide shopping, saved-content and order-management features.",
    sections: [
      ["Account data", "Information such as your name and email is used to support your account and shopping experience."],
      ["Orders and addresses", "Address and order information is used to process delivery and show order history."],
      ["Security", "Authentication requests use the application’s configured authentication and authorization flow."],
    ],
  },
  policies: {
    eyebrow: "Styleverse / Policies",
    title: "Store policies, in one place.",
    intro: "These policy pages provide the customer-facing information areas linked from the Styleverse footer.",
    sections: [
      ["Shopping", "Product availability, pricing, variants and stock are based on the current catalogue data returned by the store."],
      ["Checkout", "Order totals are recalculated by the server before order creation."],
      ["Support", "For an issue involving an order, payment or delivery, contact Styleverse support with the relevant order details."],
    ],
  },
};

export default function PolicyPage({ type = "about" }) {
  const content = CONTENT[type] || CONTENT.about;

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#1d1916]">
      <section className="border-b border-[#1d1916]/10 bg-[#efe8dd]">
        <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a7655]">
            {content.eyebrow}
          </p>
          <h1
            className="mt-4 max-w-4xl text-5xl leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {content.title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#6f665d] sm:text-lg">
            {content.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {content.sections.map(([title, body]) => (
            <article key={title} className="border border-[#1d1916]/10 bg-white p-6 sm:p-7">
              <h2
                className="text-2xl tracking-[-0.02em]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6f665d]">
                {body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/shop"
            className="border border-[#1d1916] bg-[#1d1916] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#332c27]"
          >
            Browse collection
          </Link>
          <Link
            to="/"
            className="border border-[#1d1916]/15 bg-white px-6 py-3 text-sm font-semibold text-[#1d1916] transition hover:bg-[#faf8f4]"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}