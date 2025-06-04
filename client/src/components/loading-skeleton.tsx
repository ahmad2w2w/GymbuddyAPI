import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  type?: "user-card" | "chat" | "list" | "profile";
  count?: number;
  className?: string;
}

const UserCardSkeleton = () => (
  <Card className="w-full max-w-sm mx-auto overflow-hidden">
    <div className="aspect-[4/5] relative">
      <Skeleton className="w-full h-full" />
      <div className="absolute top-4 left-4">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="absolute top-4 right-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
    <CardContent className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 flex-1 rounded-md" />
      </div>
    </CardContent>
  </Card>
);

const ChatSkeleton = () => (
  <div className="space-y-4 p-4">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className={cn(
          "flex gap-2",
          i % 2 === 0 ? "justify-start" : "justify-end"
        )}
      >
        {i % 2 === 0 && <Skeleton className="w-8 h-8 rounded-full" />}
        <div className={cn(
          "max-w-[70%]",
          i % 2 === 0 ? "bg-gray-100" : "bg-blue-100",
          "rounded-2xl p-3"
        )}>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-end mt-2">
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        {i % 2 === 1 && <Skeleton className="w-8 h-8 rounded-full" />}
      </div>
    ))}
  </div>
);

const ListSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="w-8 h-8 rounded-md" />
      </div>
    ))}
  </div>
);

const ProfileSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center gap-4">
      <Skeleton className="w-20 h-20 rounded-full" />
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

export default function LoadingSkeleton({ 
  type = "user-card", 
  count = 1, 
  className 
}: LoadingSkeletonProps) {
  const SkeletonComponent = {
    "user-card": UserCardSkeleton,
    "chat": ChatSkeleton,
    "list": ListSkeleton,
    "profile": ProfileSkeleton
  }[type];

  return (
    <div className={cn("animate-pulse", className)}>
      {type === "chat" ? (
        <SkeletonComponent />
      ) : (
        [...Array(count)].map((_, i) => (
          <div key={i} className={count > 1 ? "mb-4" : ""}>
            <SkeletonComponent />
          </div>
        ))
      )}
    </div>
  );
}