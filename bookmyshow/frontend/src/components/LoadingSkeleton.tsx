export default function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-40 md:w-48 flex-shrink-0 animate-pulse">
          <div className="aspect-[2/3] rounded-xl bg-neutral-200" />
          <div className="h-3 mt-2 bg-neutral-200 rounded w-3/4" />
          <div className="h-3 mt-1 bg-neutral-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
