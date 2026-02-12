"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Snowflake, Search, Package, Archive } from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  Badge,
  SearchInput,
  Skeleton,
  Alert,
} from "@/components/ui";
import { StockLevelBadge } from "@/components/ui";
import { ItemImage } from "@/components/items";
import { getFgItemsPaginated } from "@/lib/actions/frozen-goods-items";
import type { Item } from "@/lib/supabase/types";
import { getStockLevel } from "@/lib/utils";

export default function FrozenGoodsItemsPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [showArchived, setShowArchived] = React.useState(false);

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getFgItemsPaginated({
        page,
        pageSize: 25,
        search: searchQuery || undefined,
        isArchived: showArchived,
      });
      if (result.success) {
        setItems(result.data.data);
        setTotalPages(result.data.totalPages);
        setTotalCount(result.data.totalCount);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to fetch items");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, showArchived]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, showArchived]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0077b6]/10 rounded-xl flex items-center justify-center">
            <Snowflake className="w-5 h-5 text-[#0077b6]" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Frozen Goods</h1>
            <p className="text-sm text-foreground-muted">{totalCount} item{totalCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Link href="/admin/frozengoods/items/new">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Add Item
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <SearchInput
            placeholder="Search frozen goods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <Button
          variant={showArchived ? "primary" : "secondary"}
          onClick={() => setShowArchived(!showArchived)}
          leftIcon={<Archive className="w-4 h-4" />}
        >
          {showArchived ? "Archived" : "Active"}
        </Button>
      </div>

      {error && (
        <Alert status="error" variant="subtle">{error}</Alert>
      )}

      {/* Items List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} variant="elevated">
              <CardBody className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="elevated">
          <CardBody className="py-12 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-foreground-muted" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No frozen goods items</h3>
            <p className="text-sm text-foreground-muted mb-4">
              {searchQuery ? "No items match your search" : "Get started by adding your first frozen goods item"}
            </p>
            {!searchQuery && (
              <Link href="/admin/frozengoods/items/new">
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                  Add First Item
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const stockLevel = getStockLevel(item.current_stock, item.min_stock ?? 0, item.max_stock ?? 100);
            return (
              <Card
                key={item.id}
                variant="elevated"
                isHoverable
                className="cursor-pointer"
                onClick={() => router.push(`/admin/frozengoods/items/${item.id}`)}
              >
                <CardBody className="p-4">
                  <div className="flex items-center gap-4">
                    <ItemImage imageUrl={item.image_url} itemName={item.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground truncate">{item.name}</p>
                        {item.is_archived && (
                          <Badge colorScheme="neutral" size="xs">Archived</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground-muted">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{item.current_stock} {item.unit}</p>
                      </div>
                      <StockLevelBadge level={stockLevel} />
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-foreground-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
