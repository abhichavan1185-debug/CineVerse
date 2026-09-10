export default function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center py-16 text-neutral-500">
      <p className="text-lg font-medium text-neutral-700">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
