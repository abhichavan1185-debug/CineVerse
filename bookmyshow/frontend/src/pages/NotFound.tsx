import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="text-2xl font-bold">404</p>
      <p className="text-neutral-500 mt-1">This page doesn't exist yet.</p>
      <Link to="/" className="text-brand font-medium mt-4 inline-block">Back to Home</Link>
    </div>
  );
}
