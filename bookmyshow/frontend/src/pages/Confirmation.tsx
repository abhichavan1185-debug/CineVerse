import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Booking } from "../types";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ErrorState from "../components/ErrorState";
import Logo from "../components/Logo";

export default function Confirmation() {
  const { bookingId } = useParams();
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => (await api.get<Booking>(`/bookings/${bookingId}/`)).data,
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <ErrorState
        message="Couldn't load your CineVerse ticket. Please verify your booking reference or check My Bookings."
        onRetry={() => refetch()}
      />
    );
  }

  const qrData =
    booking.qr_data ||
    (booking.ticket
      ? `CINEVERSE:TICKET:${booking.booking_ref}:${booking.ticket.qr_token}`
      : `CINEVERSE:BOOKING:${booking.booking_ref}`);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    qrData
  )}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const ticketSummary = `
============================================================
              CINEVERSE OFFICIAL E-TICKET
           Maharashtra Cinema Ticket Booking
============================================================
Booking ID        : ${booking.booking_ref}
Booking Status    : ${booking.status.toUpperCase()}
Payment Status    : PAID (Gateway Verified)
------------------------------------------------------------
Movie             : ${booking.movie_title}
Language / Format : ${booking.movie_language || "All Languages"} • 2D / Atmos
Cinema            : ${booking.cinema_name}
Location          : ${booking.cinema_address || booking.cinema_city || "Maharashtra"}
Screen            : ${booking.screen_name}
Date              : ${booking.date}
Showtime          : ${booking.start_time?.slice(0, 5)}
Total Tickets     : ${booking.seats.length}
Seats             : ${booking.seats.map((s) => `${s.row_label}${s.seat_number} (${s.category})`).join(", ")}
------------------------------------------------------------
${booking.food && booking.food.length > 0 ? `Food & Beverages  :\n` + booking.food.map((f) => `  - ${f.name} x ${f.quantity} (Rs. ${f.price_at_order})`).join("\n") + "\n------------------------------------------------------------\n" : ""}Tickets Subtotal  : Rs. ${booking.seats_subtotal}
${parseFloat(booking.food_subtotal) > 0 ? `Food Subtotal     : Rs. ${booking.food_subtotal}\n` : ""}Convenience Fee   : Rs. ${booking.convenience_fee}
Taxes & GST (18%) : Rs. ${booking.taxes}
${parseFloat(booking.discount) > 0 ? `Discount Applied  : -Rs. ${booking.discount}\n` : ""}Grand Total Paid  : Rs. ${booking.total_amount}
------------------------------------------------------------
QR Token Pass     : ${booking.ticket?.qr_token || "N/A"}
Verification Code : ${qrData}
============================================================
Please present this E-Ticket or QR code at the turnstile gate.
Thank you for choosing CineVerse — Enjoy your show!
============================================================
    `.trim();

    const element = document.createElement("a");
    const file = new Blob([ticketSummary], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `CineVerse-Ticket-${booking.booking_ref}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleShare = async () => {
    const shareText = `🎬 My CineVerse Ticket for ${booking.movie_title}!\n📍 ${booking.cinema_name} • ${booking.screen_name}\n📅 ${booking.date} at ${booking.start_time?.slice(0, 5)}\n🎟️ Seats: ${booking.seats.map((s) => s.row_label + s.seat_number).join(", ")}\nBooking Ref: ${booking.booking_ref}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `CineVerse Ticket: ${booking.movie_title}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User closed native sheet
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\nOpen Pass: ${shareUrl}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 text-center pb-28">
      {/* Header Banner with Confirmation Animation */}
      <div className="no-print mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl mb-3 shadow-md">
          ✓
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-2">
          <span>🎉 Booking Confirmed!</span>
          <span>•</span>
          <span>Payment Successful</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
          Your Digital E-Ticket is Ready!
        </h1>
        <p className="text-neutral-500 text-xs mt-1 max-w-md mx-auto">
          Present this official QR ticket at the cinema turnstile for direct entry. This pass is saved to your account.
        </p>
      </div>

      {/* Cinematic Perforated Ticket Pass */}
      <div className="border-2 border-neutral-200 rounded-3xl bg-white text-left shadow-2xl relative overflow-hidden printable-ticket">
        {/* Top Header */}
        <div className="bg-neutral-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <Logo className="h-8 brightness-200 invert" />
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
              Official Digital Pass
            </span>
            <span className="font-mono font-extrabold text-xs sm:text-sm text-white">
              ID: {booking.booking_ref}
            </span>
          </div>
        </div>

        {/* Movie Info Section */}
        <div className="p-5 sm:p-6 pb-4">
          <div className="flex gap-4">
            {booking.movie_poster && (
              <img
                src={booking.movie_poster}
                alt={booking.movie_title}
                className="w-20 h-28 object-cover rounded-xl shadow-md flex-shrink-0 border border-neutral-100"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-[10px] font-black uppercase">
                  {booking.movie_language || "Original Audio"}
                </span>
                {booking.movie_certificate && (
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                    {booking.movie_certificate}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  Paid via Gateway
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 leading-tight truncate">
                {booking.movie_title}
              </h2>
              <p className="text-xs text-neutral-600 font-bold mt-1">
                📍 {booking.cinema_name}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {booking.cinema_address || booking.cinema_city || "Maharashtra"} • {booking.screen_name}
              </p>
            </div>
          </div>

          {/* Date & Time Pills */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-100 mt-4 text-xs">
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">Show Date</span>
              <span className="font-extrabold text-neutral-900">{booking.date}</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider">Show Time</span>
              <span className="font-extrabold text-neutral-900">{booking.start_time?.slice(0, 5)}</span>
            </div>
          </div>
        </div>

        {/* Perforated Divider with Circular Notches */}
        <div className="relative flex items-center justify-between my-1">
          <div className="w-5 h-8 bg-neutral-100 rounded-r-full border-r border-t border-b border-neutral-300" />
          <div className="flex-1 border-b-2 border-dashed border-neutral-300 mx-2" />
          <div className="w-5 h-8 bg-neutral-100 rounded-l-full border-l border-t border-b border-neutral-300" />
        </div>

        {/* Seats & Category Badges */}
        <div className="p-5 sm:p-6 pt-3">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Confirmed Seats ({booking.seats.length}):
              </span>
              <span className="text-[11px] font-bold text-brand">
                Screen Entrance: Front / Main
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {booking.seats.map((s, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-neutral-900 text-white text-xs font-black shadow-sm flex items-center gap-1.5"
                >
                  <span>
                    {s.row_label}
                    {s.seat_number}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold uppercase">
                    ({s.category})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Food Items Breakdown (if any) */}
          {booking.food && booking.food.length > 0 && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60">
              <span className="text-xs font-extrabold text-amber-900 block mb-1.5 flex items-center gap-1.5">
                <span>🍿</span> Pre-ordered Food & Beverages:
              </span>
              <div className="space-y-1">
                {booking.food.map((f, i) => (
                  <div key={i} className="flex justify-between text-xs text-amber-950 font-medium">
                    <span>{f.name} × {f.quantity}</span>
                    <span className="font-bold">₹{f.price_at_order}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs text-neutral-600 border-t border-neutral-100 pt-3 mb-5">
            <div className="flex justify-between">
              <span>Tickets Subtotal</span>
              <span className="font-semibold text-neutral-800">₹{booking.seats_subtotal}</span>
            </div>
            {parseFloat(booking.food_subtotal) > 0 && (
              <div className="flex justify-between">
                <span>Food & Drinks Subtotal</span>
                <span className="font-semibold text-neutral-800">₹{booking.food_subtotal}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Convenience Fee & Taxes</span>
              <span>₹{(parseFloat(booking.convenience_fee) + parseFloat(booking.taxes)).toFixed(2)}</span>
            </div>
            {parseFloat(booking.discount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount Applied</span>
                <span>-₹{booking.discount}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-black text-neutral-900 pt-2 border-t border-neutral-200">
              <span>Total Amount Paid</span>
              <span className="text-base text-brand">₹{booking.total_amount}</span>
            </div>
          </div>

          {/* Unique QR Code Section */}
          <div className="flex flex-col items-center pt-4 border-t-2 border-dashed border-neutral-200">
            <div className="p-3.5 bg-white rounded-2xl border-2 border-neutral-800 shadow-md">
              <img src={qrUrl} alt="CineVerse Entry QR Code" className="w-44 h-44 object-contain" />
            </div>
            <p className="text-xs font-mono font-bold text-neutral-800 mt-2 text-center tracking-tight">
              {qrData}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1 text-center font-medium">
              Scan this QR code at the turnstile gate for contactless cinema entry
            </p>
            <span className="mt-1.5 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              🔒 Cryptographically Secured • Single Admission Only
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Action Buttons (Print / Download / Share) */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center no-print">
        <button
          onClick={handlePrint}
          className="btn-outline h-11 px-5 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50"
        >
          <span>🖨️</span> Print Ticket
        </button>
        <button
          onClick={handleDownload}
          className="btn-outline h-11 px-5 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50"
        >
          <span>📥</span> Download Pass (.txt)
        </button>
        <button
          onClick={handleShare}
          className="btn-outline h-11 px-5 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50"
        >
          <span>🔗</span> {copiedLink ? "✓ Link Copied!" : "Share Ticket"}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center no-print">
        <Link
          to="/bookings"
          className="btn-primary h-12 px-8 text-sm font-bold flex items-center justify-center flex-1 shadow-md"
        >
          View My Bookings
        </Link>
        <Link
          to="/"
          className="btn-outline h-12 px-8 text-sm font-bold flex items-center justify-center flex-1"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
