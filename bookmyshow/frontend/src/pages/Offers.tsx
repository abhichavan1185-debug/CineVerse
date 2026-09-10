import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOffers } from "../api/offers";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import type { Offer } from "../types";

function OfferCard({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard?.writeText(offer.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const discountLabel =
    offer.discount_type === "flat" ? `₹${offer.discount_value} OFF` : `${offer.discount_value}% OFF`;

  return (
    <div className="card overflow-hidden">
      {offer.banner_url && <img src={offer.banner_url} alt={offer.title} className="w-full h-32 object-cover" />}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-brand">{discountLabel}</span>
          {offer.is_featured && (
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Featured</span>
          )}
        </div>
        <p className="font-semibold text-sm">{offer.title || offer.code}</p>
        <p className="text-xs text-neutral-500 mt-1">{offer.description}</p>
        <p className="text-[11px] text-neutral-400 mt-1">
          Min. order ₹{offer.min_order_amount} · Valid till {new Date(offer.valid_until).toLocaleDateString()}
        </p>
        <button
          onClick={copyCode}
          className="mt-3 w-full flex items-center justify-between border border-dashed border-brand rounded-lg px-3 py-2 text-sm font-mono font-semibold text-brand"
        >
          {offer.code}
          <span className="text-xs font-sans font-normal">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

export default function Offers() {
  const { data: offers, isLoading, isError, refetch } = useQuery({
    queryKey: ["offers"],
    queryFn: fetchOffers,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl md:text-2xl font-extrabold mb-1">Offers</h1>
      <p className="text-sm text-neutral-500 mb-6">Apply these codes at checkout to save on your booking.</p>

      {isLoading && <LoadingSkeleton count={6} />}
      {isError && <ErrorState message="Couldn't load offers." onRetry={() => refetch()} />}
      {offers && offers.length === 0 && <EmptyState title="No active offers right now." subtitle="Check back soon!" />}
      {offers && offers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {offers.map((o) => (
            <OfferCard key={o.code} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
}
