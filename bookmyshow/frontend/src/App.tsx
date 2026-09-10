import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { CityProvider } from "./hooks/useCity";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import MoviesList from "./pages/MoviesList";
import MovieDetails from "./pages/MovieDetails";
import SeatSelection from "./pages/SeatSelection";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import Confirmation from "./pages/Confirmation";
import MyBookings from "./pages/MyBookings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Location from "./pages/Location";
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import EventConfirmation from "./pages/EventConfirmation";
import Offers from "./pages/Offers";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <AuthProvider>
      <CityProvider>
        <Header />
        <main className="min-h-[70vh] pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<MoviesList />} />
            <Route path="/movies/:slug" element={<MovieDetails />} />
            <Route path="/seats/:showId" element={<ProtectedRoute><SeatSelection /></ProtectedRoute>} />
            <Route path="/checkout/:showId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/payment/:bookingId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/ticket/:bookingId" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
            <Route path="/confirmation/:bookingId" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/location" element={<Location />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
            <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            <Route path="/events" element={<Events title="Events" />} />
            <Route path="/sports" element={<Events title="Sports" fixedCategory="sports" />} />
            <Route path="/plays" element={<Events title="Plays" fixedCategory="plays" />} />
            <Route path="/activities" element={<Events title="Activities" fixedCategory="activities" />} />
            <Route path="/events/confirmation/:bookingId" element={<ProtectedRoute><EventConfirmation /></ProtectedRoute>} />
            <Route path="/events/:slug" element={<EventDetails />} />
            <Route path="/offers" element={<Offers />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </CityProvider>
    </AuthProvider>
  );
}
