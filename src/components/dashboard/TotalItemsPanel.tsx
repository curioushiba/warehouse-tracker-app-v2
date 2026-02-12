"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderOpen, Package, Archive, Clock } from "lucide-react";
import {
  Button,
  Skeleton,
  SkeletonText,
  Badge,
} from "@/components/ui";
import {
  getTotalItemsBreakdown,
  type TotalItemsBreakdown,
} from "@/lib/actions/dashboard";
import { formatRelativeTime } from "@/lib/utils";

export function TotalItemsPanel() {
  const [data, setData] = useState<TotalItemsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const result = await getTotalItemsBreakdown();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Skeleton className="w-32 h-5" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <SkeletonText lines={1} className="w-24" />
              <Skeleton className="w-8 h-5" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="w-32 h-5" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-white rounded">
              <Skeleton className="w-8 h-8 rounded" />
              <SkeletonText lines={1} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-600">
        <p>Failed to load data: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-foreground-muted">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No item data available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Category breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-4 h-4 text-emerald-600" />
          <h4 className="font-medium text-foreground-secondary">Categories</h4>
        </div>
        <div className="space-y-2">
          {data.categories.slice(0, 6).map((category) => (
            <div
              key={category.id ?? "uncategorized"}
              className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <span className="text-sm text-foreground-secondary">
                {category.name}
              </span>
              <Badge colorScheme="neutral" size="sm">
                {category.count}
              </Badge>
            </div>
          ))}
          {data.categories.length > 6 && (
            <Link href="/admin/categories">
              <Button variant="ghost" size="sm" className="w-full text-foreground-secondary">
                +{data.categories.length - 6} more categories
              </Button>
            </Link>
          )}
        </div>

        {/* Archived items count */}
        {data.archivedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-border-secondary">
            <Link
              href="/admin/items?filter=archived"
              className="flex items-center justify-between p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-foreground-muted" />
                <span className="text-sm text-foreground-secondary">Archived Items</span>
              </div>
              <Badge colorScheme="neutral" size="sm">
                {data.archivedCount}
              </Badge>
            </Link>
          </div>
        )}
      </div>

      {/* Recently added items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h4 className="font-medium text-foreground-secondary">Recently Added</h4>
        </div>
        <div className="space-y-2">
          {data.recentItems.length === 0 ? (
            <p className="text-sm text-foreground-muted italic p-2">No items added recently.</p>
          ) : (
            data.recentItems.map((item) => (
              <Link
                key={item.id}
                href={`/admin/items/${item.id}`}
                className="flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-secondary truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {item.sku} &bull; {formatRelativeTime(item.created_at)}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-foreground-placeholder" />
              </Link>
            ))
          )}
        </div>

        {/* Add new item CTA */}
        <div className="mt-4 pt-4 border-t border-border-secondary">
          <Link href="/admin/items/new">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Package className="w-4 h-4 mr-2" />
              Add New Item
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
