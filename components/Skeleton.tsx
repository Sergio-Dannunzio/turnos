export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-800 rounded animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
      <div className="flex flex-col gap-2 w-full">
        <SkeletonLine className="h-4 w-40" />
        <SkeletonLine className="h-3 w-24" />
      </div>
    </div>
  );
}
