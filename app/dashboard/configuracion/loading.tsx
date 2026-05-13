import { SkeletonLine } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex flex-col gap-1">
        <SkeletonLine className="h-7 w-36" />
        <SkeletonLine className="h-4 w-40" />
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonLine className="h-3 w-28" />
            <SkeletonLine className="h-9 w-full" />
          </div>
        ))}
        <SkeletonLine className="h-9 w-full mt-2" />
      </div>
    </div>
  );
}
