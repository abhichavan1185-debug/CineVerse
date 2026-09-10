import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../api/client";
import type { FoodItem } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";

const CATEGORIES = [
  { id: "all", label: "All Items", icon: "🍿" },
  { id: "popcorn", label: "Popcorn", icon: "🍿" },
  { id: "nachos", label: "Nachos", icon: "🧀" },
  { id: "combo", label: "Combos", icon: "🍱" },
  { id: "beverage", label: "Beverages", icon: "🥤" },
  { id: "snack", label: "Desserts & Snacks", icon: "🍨" },
];

const DEFAULT_FOOD_IMG = "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80";

export default function Checkout() {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const showSeatIds: number[] = (location.state as any)?.showSeatIds ?? [];

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: foodItems, isLoading } = useQuery({
    queryKey: ["food-items"],
    queryFn: async () => (await api.get<{ results: FoodItem[] } | FoodItem[]>("/food/")).data as any,
  });
  const items: FoodItem[] = Array.isArray(foodItems) ? foodItems : foodItems?.results ?? [];

  const filteredItems = selectedCategory === "all"
    ? items
    : items.filter((item) => item.category === selectedCategory);

  const setQty = (id: number, delta: number) =>
    setQuantities((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });

  const totalFoodCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const foodSubtotal = items.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * parseFloat(item.price), 0);

  const proceedToPayment = async () => {
    if (showSeatIds.length === 0) {
      setError("Your seat selection was lost — please go back and reselect seats.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const foodPayload = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([food_item_id, quantity]) => ({ food_item_id: Number(food_item_id), quantity }));

      const res = await api.post("/bookings/checkout/", {
        show_id: showId,
        show_seat_ids: showSeatIds,
        food_items: foodPayload,
        coupon_code: couponCode || undefined,
      });
      navigate(`/payment/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const applyCoupon = async (codeToApply?: string) => {
    const targetCode = codeToApply || couponCode;
    if (!targetCode) return;
    setCouponMessage(null);
    try {
      const orderAmount = foodSubtotal;
      const res = await api.post("/coupons/validate/", { code: targetCode, order_amount: orderAmount + 1 });
      setCouponCode(targetCode);
      setCouponMessage(`Coupon applied — you'll save ₹${res.data.discount} at checkout.`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-36">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-6 md:p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 text-neutral-800/40 text-9xl font-black pointer-events-none select-none">
          🍿
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3">
            <span>✨ CineVerse Food Court</span>
            <span>•</span>
            <span>Hot & Fresh</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
            Grab Your Movie Bites & Drinks
          </h1>
          <p className="text-xs md:text-sm text-neutral-300 font-medium">
            Pre-order delicious combos, gourmet popcorn, and chilled drinks. Delivered directly to your seat before showtime!
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              selectedCategory === cat.id
                ? "bg-brand text-white shadow-md shadow-brand/20 scale-105"
                : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {isLoading && <LoadingSkeleton count={4} />}

      {/* Food Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {filteredItems.map((item) => {
          const qty = quantities[item.id] ?? 0;
          return (
            <div
              key={item.id}
              className="group bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Food Image with Veg Marker */}
                <div className="relative h-44 w-full overflow-hidden bg-neutral-100">
                  <img
                    src={item.image_url || DEFAULT_FOOD_IMG}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_FOOD_IMG;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                  {/* Veg Marker (Indian Cinema standard) */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-sm">
                    <div className="w-3.5 h-3.5 border border-emerald-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                    </div>
                  </div>

                  {/* Category Pill */}
                  <div className="absolute bottom-2.5 left-3 bg-neutral-900/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white px-2.5 py-0.5 rounded-md">
                    {item.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-brand transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 mt-1 min-h-[32px]">
                    {item.description || "Freshly prepared cinema snack."}
                  </p>
                </div>
              </div>

              {/* Price & Quantity Controls */}
              <div className="p-4 pt-0 flex items-center justify-between border-t border-neutral-100 mt-2">
                <span className="text-base font-extrabold text-neutral-900">
                  ₹{item.price}
                </span>

                {qty === 0 ? (
                  <button
                    onClick={() => setQty(item.id, 1)}
                    className="px-4 py-1.5 rounded-xl border border-brand text-brand hover:bg-brand hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    + ADD
                  </button>
                ) : (
                  <div className="flex items-center bg-brand text-white rounded-xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setQty(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center font-bold hover:bg-brand-600 transition-colors text-sm active:scale-90"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-xs font-black">{qty}</span>
                    <button
                      onClick={() => setQty(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center font-bold hover:bg-brand-600 transition-colors text-sm active:scale-90"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Offers & Coupons Section */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm mb-6">
        <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span>🎟️ Have a Coupon?</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code (e.g. MAHA100)"
            className="input flex-1 uppercase tracking-wide font-mono font-bold text-sm"
          />
          <button
            onClick={() => applyCoupon()}
            className="px-6 h-10 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold transition-all"
          >
            Apply Code
          </button>
        </div>

        {/* Quick Apply Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-neutral-400 font-semibold">Popular Coupons:</span>
          {["MAHA100", "CINE20", "WEEKEND50"].map((c) => (
            <button
              key={c}
              onClick={() => applyCoupon(c)}
              className="px-2.5 py-0.5 rounded-lg border border-dashed border-brand/50 bg-brand-50 text-brand text-[11px] font-mono font-bold hover:bg-brand-100 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>

        {couponMessage && (
          <p className="text-xs text-emerald-600 font-semibold mt-2.5 flex items-center gap-1.5">
            <span>✓</span> {couponMessage}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* Floating Bottom Summary Drawer */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-4 shadow-2xl z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-500 font-medium">
              {showSeatIds.length} {showSeatIds.length === 1 ? "Seat" : "Seats"} Selected
              {totalFoodCount > 0 && (
                <span className="font-bold text-neutral-800"> • {totalFoodCount} F&B Items</span>
              )}
            </p>
            <p className="text-lg font-black text-neutral-900">
              {totalFoodCount > 0 ? (
                <>
                  Food Subtotal: <span className="text-brand">₹{foodSubtotal.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-neutral-400 text-sm font-semibold">No food selected</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {totalFoodCount === 0 ? (
              <button
                onClick={proceedToPayment}
                disabled={submitting}
                className="btn-primary h-12 px-8 text-sm font-bold shadow-glow"
              >
                {submitting ? "Preparing Order..." : "Skip F&B & Continue →"}
              </button>
            ) : (
              <button
                onClick={proceedToPayment}
                disabled={submitting}
                className="btn-primary h-12 px-8 text-sm font-bold shadow-glow"
              >
                {submitting ? "Preparing Order..." : `Proceed to Pay (₹${foodSubtotal}) →`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
