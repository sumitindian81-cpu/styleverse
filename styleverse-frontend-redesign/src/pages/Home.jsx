import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { apiRequest } from "../utils/api";

const FALLBACK_IMAGES = {
  hero:
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=85",
  women:
    "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=85",
  men:
    "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1200&q=85",
  kids:
    "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=1200&q=85",
  accessories:
    "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=1200&q=85",
  editorial:
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1500&q=85",
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.65, delay, ease: "easeOut" },
});

function getImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return image;
  if (typeof image === "object") {
    return image.url || image.secure_url || image.src || "";
  }
  return "";
}

function getMainImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const main = images.find((item) => item?.isMain === true) || images[0];
  return getImageUrl(main);
}

function getId(product) {
  return product?._id || product?.id || "";
}

function getCategoryName(product) {
  if (typeof product?.categoryId === "object") {
    return product.categoryId?.name || product.categoryId?.title || "Collection";
  }
  if (typeof product?.category === "object") {
    return product.category?.name || product.category?.title || "Collection";
  }
  return product?.type ? String(product.type) : "Styleverse";
}

function formatPrice(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getProductArray(response) {
  const list =
    response?.data?.items ||
    response?.data?.products ||
    response?.items ||
    response?.products ||
    [];
  return Array.isArray(list) ? list : [];
}

function ProductCard({ product }) {
  const image = getMainImage(product);
  const discount = Number(product?.discountPercent) || 0;
  const rating = Number(product?.averageRating) || 0;
  const reviews = Number(product?.totalReviews) || 0;
  const productId = getId(product);

  return (
    <article className="group min-w-[220px] max-w-[220px] shrink-0 sm:min-w-[250px] sm:max-w-[250px]">
      <Link to={`/product/${productId}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#eee8df]">
          {image ? (
            <img
              src={image}
              alt={product?.name || "Styleverse product"}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_IMAGES.editorial;
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-xs uppercase tracking-[0.18em] text-[#7d756a]">
              Styleverse collection
            </div>
          )}

          {discount > 0 && (
            <span className="absolute left-3 top-3 bg-[#171614] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
              {discount}% off
            </span>
          )}

          {product?.isNewArrival && (
            <span className="absolute right-3 top-3 bg-[#f7f1e7]/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#27231f]">
              New
            </span>
          )}

          <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-white/60 bg-[#f8f3eb]/90 text-[#171614] opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
            ↗
          </span>
        </div>
      </Link>

      <div className="pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a9083]">
          {product?.brand || "Styleverse"} · {getCategoryName(product)}
        </div>

        <Link
          to={`/product/${productId}`}
          className="mt-1.5 block line-clamp-2 text-[15px] font-medium leading-6 text-[#1d1a17] hover:underline"
        >
          {product?.name || "Untitled product"}
        </Link>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#171614]">
              {formatPrice(product?.price)}
            </div>
            {Number(product?.mrp) > Number(product?.price) && (
              <div className="text-xs text-[#a69c90] line-through">
                {formatPrice(product?.mrp)}
              </div>
            )}
          </div>

          {reviews > 0 && (
            <div className="text-right text-[10px] uppercase tracking-[0.12em] text-[#837a70]">
              <div>★ {rating.toFixed(1)}</div>
              <div>{reviews} reviews</div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductRail({ products, emptyLabel = "Curating this edit…" }) {
  if (!products.length) {
    return (
      <div className="border-y border-[#dcd3c6] py-12 text-center text-xs uppercase tracking-[0.2em] text-[#978d81]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((product) => (
        <ProductCard key={getId(product)} product={product} />
      ))}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, linkLabel = "View all", to = "/shop" }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-[#dcd3c6] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.27em] text-[#8b8176]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-4xl leading-none tracking-[-0.03em] text-[#191714] sm:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#746d64]">{description}</p>
        )}
      </div>

      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2c2824]"
      >
        {linkLabel} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function EditorialCard({ to, eyebrow, title, copy, image, align = "left" }) {
  return (
    <Link to={to} className="group relative block min-h-[470px] overflow-hidden bg-[#dbd0c2]">
      <img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.04]"
        onError={(event) => {
          event.currentTarget.src = FALLBACK_IMAGES.editorial;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      <div
        className={`absolute inset-x-0 bottom-0 p-7 text-white sm:p-9 ${
          align === "right" ? "sm:text-right" : ""
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">{eyebrow}</p>
        <h3 className="mt-2 font-serif text-4xl leading-[0.95] tracking-[-0.02em] sm:text-5xl">{title}</h3>
        <p className={`mt-4 max-w-md text-sm leading-6 text-white/80 ${align === "right" ? "ml-auto" : ""}`}>
          {copy}
        </p>
        <span className="mt-6 inline-flex items-center gap-3 border-b border-white/70 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em]">
          Explore edit <span>↗</span>
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/products?limit=60&page=1&sort=new");
      setProducts(getProductArray(response));
    } catch (err) {
      setProducts([]);
      setError(err?.message || "Could not load the latest collection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const sections = useMemo(() => {
    const featured = products.filter((item) => item?.isFeatured);
    const bestSellers = products.filter((item) => item?.isBestSeller);
    const sale = products.filter((item) => Number(item?.discountPercent) > 0 || item?.isOnSale);
    const newArrivals = products.filter((item) => item?.isNewArrival);

    return {
      trending: (featured.length ? featured : products).slice(0, 10),
      newArrivals: (newArrivals.length ? newArrivals : products).slice(0, 10),
      bestSellers: (bestSellers.length ? bestSellers : products.slice().sort((a, b) => Number(b?.totalReviews || 0) - Number(a?.totalReviews || 0))).slice(0, 10),
      sale: sale.slice(0, 8),
    };
  }, [products]);

  const heroImages = useMemo(() => {
    const images = products.map(getMainImage).filter(Boolean);
    return [images[0] || FALLBACK_IMAGES.hero, images[1] || FALLBACK_IMAGES.women, images[2] || FALLBACK_IMAGES.men];
  }, [products]);

  const categoryCards = [
    { key: "women", title: "Women", subtitle: "Elevated everyday", image: heroImages[0] || FALLBACK_IMAGES.women, query: "gender=women" },
    { key: "men", title: "Men", subtitle: "Modern essentials", image: heroImages[2] || FALLBACK_IMAGES.men, query: "gender=men" },
    { key: "kids", title: "Kids", subtitle: "Playful expression", image: FALLBACK_IMAGES.kids, query: "gender=kids" },
    { key: "accessories", title: "Accessories", subtitle: "Finish the look", image: FALLBACK_IMAGES.accessories, query: "type=accessory" },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f2e9] text-[#1b1815]">
      <div className="border-b border-[#ddd4c7] bg-[#171614] px-4 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.24em] text-[#efe7db] sm:text-[10px]">
        New season / New mood / New you&nbsp;&nbsp;·&nbsp;&nbsp; Explore the latest Styleverse collection
      </div>

      <main>
        {/* HERO */}
        <section className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
          <div className="relative min-h-[670px] overflow-hidden bg-[#e9dfd1] lg:min-h-[730px]">
            <img
              src={heroImages[0]}
              alt="Styleverse latest collection"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_IMAGES.hero;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#f3eadf]/95 via-[#efe4d4]/60 to-black/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

            <motion.div {...fadeUp(0.05)} className="relative flex min-h-[670px] items-end lg:min-h-[730px]">
              <div className="w-full max-w-2xl p-7 sm:p-10 lg:p-14 xl:p-16">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#665d53]">SS26 / Collection</p>
                <h1 className="mt-5 max-w-xl font-serif text-6xl leading-[0.86] tracking-[-0.045em] text-[#1a1714] sm:text-7xl lg:text-[6.6rem]">
                  Dress for the
                  <span className="block italic text-[#645242]">life you want.</span>
                </h1>
                <p className="mt-6 max-w-lg text-sm leading-6 text-[#5e564d] sm:text-base">
                  Statement pieces. Everyday essentials. A considered collection designed to help you build a style that feels unmistakably yours.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-4 bg-[#171614] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#2c2824]"
                  >
                    Shop collection <span>→</span>
                  </Link>
                  <Link
                    to="/builder"
                    className="inline-flex items-center gap-4 border border-[#6c6258] bg-[#f5eee3]/55 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#292521] backdrop-blur-sm transition hover:bg-white/70"
                  >
                    Build a look <span>✧</span>
                  </Link>
                </div>

                <div className="mt-10 grid max-w-xl grid-cols-3 border-y border-[#bfb4a5] py-5">
                  <div>
                    <div className="font-serif text-3xl">{loading ? "—" : `${products.length}+`}</div>
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7a7065]">Styles online</div>
                  </div>
                  <div className="border-l border-[#c8bdaf] pl-4 sm:pl-7">
                    <div className="font-serif text-3xl">4</div>
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7a7065]">Collections</div>
                  </div>
                  <div className="border-l border-[#c8bdaf] pl-4 sm:pl-7">
                    <div className="font-serif text-3xl">∞</div>
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7a7065]">Ways to wear</div>
                  </div>
                </div>

                {error && (
                  <button
                    type="button"
                    onClick={loadProducts}
                    className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f2d2d] underline underline-offset-4"
                  >
                    {error} · Retry
                  </button>
                )}
              </div>
            </motion.div>

            <div className="absolute right-5 top-6 hidden w-44 overflow-hidden border border-white/80 bg-[#f7f1e6]/85 p-2 shadow-2xl backdrop-blur md:block lg:right-8 lg:top-8 lg:w-52">
              <img
                src={heroImages[1]}
                alt="New drop"
                className="aspect-[4/5] w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_IMAGES.women;
                }}
              />
              <div className="px-2 pb-2 pt-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8a7d6e]">New drop</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-serif text-lg">After Hours</span>
                  <span className="text-lg">→</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 right-6 hidden w-52 border border-[#3c372f]/25 bg-[#f7f1e6]/90 p-3 shadow-xl backdrop-blur md:block lg:right-10 lg:bottom-10">
              <p className="px-1 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8a7d6e]">Colour story</p>
              <div className="flex gap-2 px-1">
                {["#e7dccc", "#62564a", "#a38169", "#d2b679", "#2c2824"].map((color) => (
                  <span key={color} className="h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORY DISCOVERY */}
        <section className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
          <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4">
            {categoryCards.map((category) => (
              <Link
                key={category.key}
                to={`/shop?${category.query}&page=1`}
                className="group relative min-h-[210px] overflow-hidden border-r border-[#f7f2e9] last:border-r-0 sm:min-h-[250px] lg:min-h-[290px]"
              >
                <img
                  src={category.image}
                  alt={category.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] group-hover:scale-[1.04]"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGES.editorial;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <div className="font-serif text-3xl">{category.title}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/75">{category.subtitle}</div>
                  <div className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#171614] transition group-hover:translate-x-1">→</div>
                </div>
              </Link>
            ))}
          </motion.div>
        </section>

        {/* TRENDING */}
        <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            eyebrow="Trending now"
            title="Pieces people are watching."
            description="A live selection from the current Styleverse catalogue, refreshed from your store inventory."
          />
          <ProductRail products={sections.trending} emptyLabel={loading ? "Loading the latest edit…" : "No trending pieces yet."} />
        </section>

        {/* EXPERIENCE */}
        <section className="mx-auto max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
          <motion.div {...fadeUp(0.05)} className="grid gap-px bg-[#d8cfc2] md:grid-cols-3">
            <Link to="/shop" className="group bg-[#eee5d9] p-8 transition hover:bg-[#e7ddd0] sm:p-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8d8376]">01 / Shop</p>
              <h3 className="mt-12 font-serif text-4xl tracking-[-0.03em]">Shop smart.</h3>
              <p className="mt-4 text-sm leading-6 text-[#71685f]">Search, filter and discover the pieces already waiting in the Styleverse catalogue.</p>
              <div className="mt-10 text-[10px] font-semibold uppercase tracking-[0.2em]">Discover products →</div>
            </Link>
            <Link to="/studio" className="group bg-[#e9e0d4] p-8 transition hover:bg-[#e1d6c8] sm:p-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8d8376]">02 / Studio</p>
              <h3 className="mt-12 font-serif text-4xl tracking-[-0.03em]">Make it yours.</h3>
              <p className="mt-4 text-sm leading-6 text-[#71685f]">Customize a garment one detail at a time — colour, pattern and silhouette choices included.</p>
              <div className="mt-10 text-[10px] font-semibold uppercase tracking-[0.2em]">Open the studio →</div>
            </Link>
            <Link to="/builder" className="group bg-[#e4d9cb] p-8 transition hover:bg-[#dccfc0] sm:p-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8d8376]">03 / Builder</p>
              <h3 className="mt-12 font-serif text-4xl tracking-[-0.03em]">Build the look.</h3>
              <p className="mt-4 text-sm leading-6 text-[#71685f]">Bring multiple pieces together into one complete outfit and shape the look around you.</p>
              <div className="mt-10 text-[10px] font-semibold uppercase tracking-[0.2em]">Create an outfit →</div>
            </Link>
          </motion.div>
        </section>

        {/* EDITORIAL CAMPAIGN */}
        <section className="mx-auto max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
          <motion.div {...fadeUp(0.05)} className="grid lg:grid-cols-2">
            <EditorialCard
              to="/shop?gender=women&page=1"
              eyebrow="The new feminine"
              title="Soft tailoring. Strong presence."
              copy="Fluid layers, precise lines and easy pieces made to move from morning plans to after-hours moments."
              image={heroImages[1] || FALLBACK_IMAGES.editorial}
            />
            <EditorialCard
              to="/shop?gender=men&page=1"
              eyebrow="The modern edit"
              title="Quiet confidence, considered."
              copy="Elevated essentials and sharper separates for a wardrobe that stays relevant beyond the season."
              image={heroImages[2] || FALLBACK_IMAGES.men}
              align="right"
            />
          </motion.div>
        </section>

        {/* NEW ARRIVALS */}
        <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            eyebrow="Just in"
            title="New arrivals, now in."
            description="Fresh additions to the catalogue, pulled directly from your latest store inventory."
          />
          <ProductRail products={sections.newArrivals} emptyLabel={loading ? "Loading new arrivals…" : "No new arrivals yet."} />
        </section>

        {/* SALE BANNER */}
        {sections.sale.length > 0 && (
          <section className="mx-auto max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
            <motion.div {...fadeUp(0.05)} className="relative overflow-hidden bg-[#171614] px-7 py-12 text-white sm:px-12 sm:py-16 lg:px-16">
              <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-[#d6bd93]/20" />
              <div className="absolute -right-2 -top-10 h-52 w-52 rounded-full border border-[#d6bd93]/15" />
              <div className="relative max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.27em] text-[#cfb583]">The sale edit</p>
                <h2 className="mt-4 font-serif text-5xl leading-[0.95] tracking-[-0.03em] sm:text-6xl">A little more style. A little less spend.</h2>
                <p className="mt-5 max-w-xl text-sm leading-6 text-white/65">Discover marked-down pieces from the live catalogue while the current edit lasts.</p>
                <Link to="/shop?sort=price_asc&page=1" className="mt-7 inline-flex items-center gap-4 border-b border-[#cfb583] pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e9d9bb]">Shop the sale →</Link>
              </div>
            </motion.div>
          </section>
        )}

        {/* BEST SELLERS */}
        <section className="mx-auto max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
          <SectionHeading
            eyebrow="Best sellers"
            title="The pieces to come back to."
            description="A popularity-led selection from your current product catalogue."
          />
          <ProductRail products={sections.bestSellers} emptyLabel={loading ? "Curating favourites…" : "No best sellers yet."} />
        </section>

        {/* TRUST */}
        <section className="border-y border-[#dcd3c6] bg-[#f0e8dc]">
          <div className="mx-auto grid max-w-[1500px] divide-y divide-[#d2c8bb] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              ["01", "Secure checkout", "Protected payment flow for every order."],
              ["02", "Easy returns", "A smoother experience when something is not quite right."],
              ["03", "Style discovery", "Shop the catalogue or build your own direction."],
            ].map(([number, title, copy]) => (
              <motion.div key={number} {...fadeUp(Number(number) * 0.05)} className="px-6 py-9 sm:px-8 lg:px-12">
                <div className="flex items-start gap-5">
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-[#9c8e7f]">{number}</span>
                  <div>
                    <h3 className="font-serif text-2xl tracking-[-0.02em]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#756d64]">{copy}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* NEWSLETTER */}
        <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <motion.div {...fadeUp(0.05)} className="grid gap-10 border-t border-[#dcd3c6] pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.27em] text-[#8b8176]">The Styleverse edit</p>
              <h2 className="mt-3 max-w-2xl font-serif text-5xl leading-[0.94] tracking-[-0.035em] sm:text-6xl">New drops, style stories and pieces worth knowing.</h2>
            </div>
            <form
              onSubmit={(event) => event.preventDefault()}
              className="flex flex-col gap-3 border-b border-[#8f8579] pb-3 sm:flex-row sm:items-end"
            >
              <label className="flex-1">
                <span className="sr-only">Email address</span>
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full bg-transparent px-0 py-2 text-sm text-[#1d1a17] outline-none placeholder:text-[#9a9083]"
                />
              </label>
              <button type="submit" className="self-start text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1d1a17] sm:self-auto">Join the list →</button>
            </form>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
