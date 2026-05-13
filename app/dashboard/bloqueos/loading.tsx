import { SkeletonLine, SkeletonCard } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <SkeletonLine className="h-7 w-28" />
        <SkeletonLine className="h-4 w-56" />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <SkeletonLine className="h-4 w-32" />
        <div className="flex gap-3">
          <SkeletonLine className="h-9 w-36" />
          <SkeletonLine className="h-9 w-28" />
          <SkeletonLine className="h-9 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
