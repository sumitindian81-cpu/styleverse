import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../utils/api";

function normalizeImage(item) {
  const raw = item?.previewImageUrl || item?.images?.find?.((x) => x?.isMain)?.url || item?.images?.[0];
  if (typeof raw === "string") return raw;
  return raw?.url || raw?.secure_url || raw?.src || "";
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function itemId(item) {
  return item?.productId?._id || item?.productId?.id || item?.customDesignId?._id || item?.customDesignId?.id || "";
}

export default function SharedOutfit() {
  const { token } = useParams();
  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await apiRequest(`/outfits/shared/${encodeURIComponent(token || "")}`);
        const data = response?.data || response || {};
        const next = data?.outfit || data;
        if (!cancelled) setOutfit(next);
      } catch (err) {
        if (!cancelled) setError(err?.message || "This shared outfit could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  const items = useMemo(() => (Array.isArray(outfit?.items) ? outfit.items : []), [outfit]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f3ec] px-6 text-[#1d1916]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin border-2 border-[#d9cec4] border-t-[#1d1916]" />
          <p className="mt-4 text-sm text-[#6f665d]">Loading shared look…</p>
        </div>
      </main>
    );
  }

  if (error || !outfit) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f3ec] px-5 py-16 text-[#1d1916]">
        <section className="w-full max-w-2xl border border-[#1d1916]/10 bg-white p-8 text-center sm:p-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9a7655]">Styleverse / Shared Outfit</p>
          <h1 className="mt-4 text-4xl sm:text-5xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            This shared look is unavailable.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#6f665d]">{error || "The link may have expired or the outfit is no longer public."}</p>
          <Link to="/builder" className="mt-8 inline-flex border border-[#1d1916] bg-[#1d1916] px-6 py-3 text-sm font-semibold text-white">Create your own outfit</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ec] px-5 py-10 text-[#1d1916] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-4 border-b border-[#1d1916]/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9a7655]">Styleverse / Shared Look</p>
            <h1 className="mt-3 text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {outfit?.name || "Shared Outfit"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6f665d]">A Styleverse look shared from the Virtual Outfit Builder.</p>
          </div>
          <Link to="/builder" className="border border-[#1d1916] bg-[#1d1916] px-5 py-3 text-sm font-semibold text-white">Open Outfit Builder</Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]">
          <section className="border border-[#1d1916]/10 bg-white p-5 sm:p-8">
            <div className="overflow-hidden bg-[#eee7dc]">
              {outfit?.previewImageUrl ? (
                <img src={outfit.previewImageUrl} alt={outfit?.name || "Shared outfit"} className="mx-auto aspect-[4/5] w-full max-w-2xl object-contain" />
              ) : (
                <div className="grid min-h-[420px] place-items-center px-8 text-center text-sm text-[#756b61]">No composite preview was stored for this look.</div>
              )}
            </div>
          </section>

          <aside className="border border-[#1d1916]/10 bg-[#eee7dc] p-5 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a7655]">The edit</p>
            <h2 className="mt-2 text-3xl sm:text-4xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Selected pieces</h2>
            <div className="mt-7 divide-y divide-[#1d1916]/10 border-y border-[#1d1916]/10">
              {items.length ? items.map((item, index) => {
                const source = item?.productId || item?.customDesignId || {};
                const image = normalizeImage(source);
                return (
                  <article key={`${itemId(item)}-${index}`} className="flex gap-4 py-4">
                    <div className="h-20 w-16 shrink-0 overflow-hidden bg-white">
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[9px] uppercase tracking-wider text-[#9b9187]">SV</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a7655]">{item?.role || "Piece"}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold">{source?.name || source?.title || "Selected piece"}</p>
                      <p className="mt-1 text-sm text-[#6f665d]">{money(source?.price ?? item?.price)}</p>
                    </div>
                  </article>
                );
              }) : (
                <p className="py-8 text-sm text-[#6f665d]">No pieces were stored with this outfit.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}