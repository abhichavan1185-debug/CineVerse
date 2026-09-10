export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-red-600 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 px-4 py-2 rounded-full bg-brand text-white text-sm">
          Try again
        </button>
      )}
    </div>
  );
}
