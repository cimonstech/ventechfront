const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="w-full aspect-square bg-gray-200" />

      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Category */}
        <div className="h-4 w-20 bg-gray-200 rounded" />

        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>

        {/* Rating */}
        <div className="h-4 w-24 bg-gray-200 rounded" />

        {/* Price */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>

        {/* Button */}
        <div className="h-10 w-full bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
};

export const ProductListSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};


