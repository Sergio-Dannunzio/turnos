import { SkeletonLine, SkeletonCard } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <SkeletonLine className="h-7 w-32" />
        <SkeletonLine className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
            <SkeletonLine className="h-8 w-10" />
            <SkeletonLine className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonLine className="h-4 w-16 mb-1" />
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
