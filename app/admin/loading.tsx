import { SkeletonLine, SkeletonCard } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <SkeletonLine className="h-7 w-28" />
          <SkeletonLine className="h-4 w-24" />
        </div>
        <SkeletonLine className="h-9 w-36" />
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
