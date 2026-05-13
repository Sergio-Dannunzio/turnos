import { SkeletonLine, SkeletonCard } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <SkeletonLine className="h-7 w-28" />
        <SkeletonLine className="h-4 w-40" />
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
