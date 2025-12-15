export default function EmployeeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome Section Skeleton */}
      <div className="bg-gradient-to-br from-primary to-primary-700 rounded-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20" />
          <div>
            <div className="h-3 w-20 bg-white/20 rounded mb-2" />
            <div className="h-6 w-32 bg-white/20 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-card p-3">
            <div className="h-3 w-24 bg-white/20 rounded mb-2" />
            <div className="h-8 w-12 bg-white/20 rounded" />
          </div>
          <div className="bg-white/10 rounded-card p-3">
            <div className="h-3 w-20 bg-white/20 rounded mb-2" />
            <div className="h-8 w-12 bg-white/20 rounded" />
          </div>
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-40 bg-success-light/50 border-2 border-success/20 rounded-card" />
        <div className="h-40 bg-error-light/50 border-2 border-error/20 rounded-card" />
      </div>

      {/* Recent Activity Skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-28 bg-neutral-200 rounded" />
          <div className="h-4 w-16 bg-neutral-200 rounded" />
        </div>
        <div className="bg-surface rounded-card shadow-card border border-border">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-neutral-200" />
                <div>
                  <div className="h-4 w-24 bg-neutral-200 rounded mb-2" />
                  <div className="h-3 w-16 bg-neutral-100 rounded" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-8 bg-neutral-200 rounded mb-2" />
                <div className="h-4 w-16 bg-neutral-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
