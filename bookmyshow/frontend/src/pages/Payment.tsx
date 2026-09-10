import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../api/client";
import type { Booking } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import upiScannerImg from "../assets/upi_qr_scanner.jpg";

type PaymentMethodType = "upi" | "card" | "netbanking" | "wallet";

const METHODS: { id: PaymentMethodType; label: string; icon: string }[] = [
  { id: "upi", label: "UPI / QR", icon: "⚡" },
  { id: "card", label: "Debit / Credit Card", icon: "💳" },
  { id: "netbanking", label: "Net Banking", icon: "🏛️" },
  { id: "wallet", label: "Wallets", icon: "👛" },
];

const POPULAR_BANKS = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra"];

export default function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethodType>("upi");
  const [status, setStatus] = useState<"idle" | "processing" | "confirming" | "failed" | "cancelled">("idle");
  const [loadingStep, setLoadingStep] = useState<string>("Connecting to payment gateway...");
  const [error, setError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const copyUpiId = () => {
    navigator.clipboard.writeText("abhichavan8605@oksbi");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2200);
  };

  // Form states for realistic payment simulation
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [selectedWallet, setSelectedWallet] = useState("PhonePe");

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => (await api.get<Booking>(`/bookings/${bookingId}/`)).data,
  });

  useEffect(() => {
    if (booking?.status === "confirmed") {
      navigate(`/ticket/${bookingId}`, { replace: true });
    }
  }, [booking?.status, bookingId, navigate]);

  const pay = async (simulateOutcome: "success" | "failed") => {
    if (booking?.status === "confirmed") {
      navigate(`/ticket/${bookingId}`, { replace: true });
      return;
    }
    if (status === "processing" || status === "confirming") return;

    setStatus("processing");
    setError(null);
    setLoadingStep("Connecting to payment gateway...");

    try {
      // Step 1: Create gateway order
      const initiate = await api.post("/payments/create-order/", { booking_id: bookingId, method });

      setLoadingStep("Processing payment transaction...");
      const callback = await api.post("/payments/mock-checkout/", {
        gateway_order_id: initiate.data.gateway_order_id,
        outcome: simulateOutcome,
      });

      // Step 2: Verify payment on backend
      setLoadingStep("Verifying payment security signature...");
      setStatus("confirming");
      const verify = await api.post("/payments/verify/", callback.data);

      if (verify.data.success || verify.data.booking_status === "CONFIRMED") {
        setLoadingStep("Confirming seats & issuing CineVerse QR E-Ticket...");
        setTimeout(() => {
          navigate(verify.data.redirect || `/ticket/${bookingId}`, { replace: true });
        }, 500);
      } else {
        setStatus("failed");
        setError("Payment verification failed. Your booking has not been confirmed.");
      }
    } catch (err) {
      setStatus("failed");
      setError(apiErrorMessage(err, "Payment failed. Please try another method."));
    }
  };

  const handleCancelPayment = () => {
    if (window.confirm("Do you want to cancel this payment and release your reserved seats?")) {
      setStatus("cancelled");
      navigate("/movies");
    }
  };

  if (isLoading) return <div className="max-w-3xl mx-auto p-6"><LoadingSkeleton count={3} /></div>;
  if (isError || !booking) return <ErrorState message="Couldn't load your order." onRetry={() => refetch()} />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-36 relative">
      {/* Full-screen Verification / Loading Overlay */}
      {(status === "processing" || status === "confirming") && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center text-white animate-in fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-brand border-t-transparent animate-spin mb-4 shadow-glow" />
          <h3 className="text-xl font-black tracking-tight text-white mb-1">
            CineVerse Secure Checkout
          </h3>
          <p className="text-sm font-bold text-amber-400 animate-pulse">{loadingStep}</p>
          <p className="text-xs text-neutral-400 mt-3 max-w-xs">
            Please do not close or refresh this page. Your ticket will open automatically once confirmed.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Checkout & Payment</h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Booking Reference: <span className="font-bold text-neutral-800">{booking.booking_ref}</span>
          </p>
        </div>

        {/* Test Mode Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Test Payment Gateway
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Payment Methods (7 cols) */}
        <div className="md:col-span-7">
          <div className="card p-6 border-neutral-200 shadow-sm mb-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-400 mb-4">
              Select Payment Method
            </h2>

            {/* Method Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    method === m.id
                      ? "border-brand bg-brand-50/50 text-brand shadow-sm"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Method Content */}
            {method === "upi" && (
              <div className="space-y-4 animate-in fade-in">
                {/* User's Authentic Google Pay UPI Scanner Card */}
                <div className="rounded-2xl bg-[#13151b] text-white p-5 shadow-xl border border-neutral-800 max-w-sm mx-auto text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-500" />

                  {/* Merchant / Payee Profile */}
                  <div className="flex items-center justify-center gap-3 mb-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#00897b] flex items-center justify-center text-white font-extrabold text-base shadow-sm">
                      A
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                        Abhi Chavan
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-medium">Bank of Baroda 3194</p>
                    </div>
                  </div>

                  {/* QR Image Box */}
                  <div className="bg-white p-2.5 rounded-2xl shadow-inner inline-block mb-3 border border-neutral-200">
                    <img
                      src={upiScannerImg}
                      alt="Abhi Chavan Google Pay QR Scanner"
                      className="w-56 h-auto max-h-72 object-contain rounded-xl mx-auto"
                    />
                  </div>

                  <p className="text-xs text-neutral-300 font-medium mb-2.5">
                    Scan with <span className="font-bold text-white">Google Pay, PhonePe, Paytm</span> or any UPI app
                  </p>

                  {/* UPI ID with Copy button */}
                  <div className="flex items-center justify-between bg-neutral-800/90 border border-neutral-700/80 rounded-xl px-3 py-2 text-xs mb-3">
                    <div className="text-left">
                      <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-semibold">UPI ID</span>
                      <span className="font-mono font-bold text-neutral-100">abhichavan8605@oksbi</span>
                    </div>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="px-3 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-100 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
                    >
                      {copiedUpi ? (
                        <span className="text-emerald-400 font-bold">✓ Copied!</span>
                      ) : (
                        <span>Copy</span>
                      )}
                    </button>
                  </div>

                  {/* Amount Payable highlight */}
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Amount Payable:</span>
                    <span className="text-base font-black text-amber-400">₹{booking.total_amount}</span>
                  </div>
                </div>

                {/* Optional UPI ID Input */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Or Enter Your UPI ID / VPA
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okhdfcbank"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => pay("success")}
                      disabled={status === "processing"}
                      className="px-4 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                    >
                      Verify & Pay
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    Accepted on: Google Pay, PhonePe, Paytm, BHIM, Cred, Navi, Amazon Pay
                  </p>
                </div>
              </div>
            )}

            {method === "card" && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    maxLength={19}
                    className="input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Valid Thru</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••"
                      maxLength={3}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Name on Card</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Full Name as on card"
                    className="input"
                  />
                </div>
              </div>
            )}

            {method === "netbanking" && (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-xs font-bold text-neutral-700 mb-2">Select Your Bank</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {POPULAR_BANKS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedBank(b)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        selectedBank === b
                          ? "border-brand bg-brand-50 text-brand font-bold"
                          : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === "wallet" && (
              <div className="space-y-2 animate-in fade-in">
                <p className="text-xs font-bold text-neutral-700 mb-2">Select Digital Wallet</p>
                {["PhonePe Wallet", "Paytm Wallet", "Amazon Pay", "MobiKwik"].map((w) => (
                  <label
                    key={w}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedWallet === w ? "border-brand bg-brand-50/50" : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="text-xs font-bold text-neutral-800">{w}</span>
                    <input
                      type="radio"
                      name="wallet"
                      checked={selectedWallet === w}
                      onChange={() => setSelectedWallet(w)}
                      className="text-brand focus:ring-brand"
                    />
                  </label>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold animate-in fade-in">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-red-900">
                  <span>⚠️</span> Payment Verification Failed
                </div>
                <p className="mb-3 font-normal text-red-700">{error}</p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-red-200">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("idle");
                      setError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-sm"
                  >
                    🔄 Retry Payment
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-50 transition-colors"
                  >
                    Back to Seats
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/bookings")}
                    className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-50 transition-colors"
                  >
                    View My Bookings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Order Summary (5 cols) */}
        <div className="md:col-span-5">
          <div className="card p-5 border-neutral-200 shadow-sm sticky top-24">
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-400 mb-3">
              Order Summary
            </h2>

            <div className="border-b border-neutral-100 pb-3 mb-3">
              <h3 className="font-extrabold text-base text-neutral-900">{booking.movie_title}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {booking.cinema_name} • {booking.screen_name}
              </p>
              <p className="text-xs text-neutral-500">
                {booking.date} at {booking.start_time?.slice(0, 5)}
              </p>
            </div>

            {/* Seats Badges */}
            <div className="mb-4">
              <span className="text-xs font-bold text-neutral-600 block mb-1.5">Selected Seats:</span>
              <div className="flex flex-wrap gap-1.5">
                {booking.seats.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1"
                  >
                    <span>{s.row_label}{s.seat_number}</span>
                    <span className="text-[10px] text-neutral-400 font-normal">({s.category})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Food items if any */}
            {booking.food && booking.food.length > 0 && (
              <div className="mb-4 pb-3 border-b border-neutral-100">
                <span className="text-xs font-bold text-neutral-600 block mb-1">Food & Beverages:</span>
                {booking.food.map((f, i) => (
                  <div key={i} className="flex justify-between text-xs text-neutral-600">
                    <span>{f.name} × {f.quantity}</span>
                    <span>₹{f.price_at_order}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs text-neutral-600 border-t border-neutral-100 pt-3">
              <div className="flex justify-between">
                <span>Tickets Subtotal</span>
                <span>₹{booking.seats_subtotal}</span>
              </div>
              {parseFloat(booking.food_subtotal) > 0 && (
                <div className="flex justify-between">
                  <span>Food Subtotal</span>
                  <span>₹{booking.food_subtotal}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Convenience Fee</span>
                <span>₹{booking.convenience_fee}</span>
              </div>
              <div className="flex justify-between">
                <span>GST / Taxes</span>
                <span>₹{booking.taxes}</span>
              </div>
              {parseFloat(booking.discount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span>-₹{booking.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Total Amount</span>
                <span className="text-brand">₹{booking.total_amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-4 shadow-2xl z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-xs text-neutral-400">Grand Total Payable:</span>
            <p className="text-xl font-black text-brand">₹{booking.total_amount}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => pay("failed")}
              disabled={status === "processing"}
              className="px-4 h-12 rounded-full border border-neutral-300 text-neutral-500 hover:text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-all"
              title="Test mode failure simulation"
            >
              Simulate Failure
            </button>
            <button
              onClick={() => pay("success")}
              disabled={status === "processing"}
              className="btn-primary flex-1 sm:flex-initial h-12 px-10 text-sm font-bold shadow-glow"
            >
              {status === "processing" ? "Verifying Payment..." : `Pay ₹${booking.total_amount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
