"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  RefreshCw,
  Clock,
  CloudOff,
  Archive,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  ItemImage,
  BulkAddModal,
  ClickableTableCell,
  PhotoUploadModal,
  CategoryAssignmentModal,
  StockAdjustmentModal,
  ThresholdAdjustmentModal,
  CostEditModal,
} from "@/components/items";
import { useToastHelpers } from "@/components/ui/Toast";
import {
  Card,
  Button,
  IconButton,
  SearchInput,
  Select,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Checkbox,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Skeleton,
  SkeletonTableRow,
  Alert,
  LoadingOverlay,
  Progress,
  Tooltip,
} from "@/components/ui";
import { StockLevelBadge } from "@/components/ui";
import { getItemsPaginated, archiveItem, type PaginatedItemFilters } from "@/lib/actions/items";
import { getCategories } from "@/lib/actions/categories";
import {
  applyPendingOperationsToItems,
  type PendingOperationType,
  getAllCachedItems,
  getAllCachedCategories,
  cacheItems,
  cacheCategories,
  cachedItemToItem,
  itemToCachedItem,
  cachedCategoryToCategory,
  categoryToCachedCategory,
} from "@/lib/offline/db";
import { useOfflineItemSync } from "@/hooks";
import type { Item, Category } from "@/lib/supabase/types";
import { formatCurrency, getStockLevel } from "@/lib/utils";
import type { StockLevel } from "@/lib/utils";

const STOCK_LEVEL_PROGRESS_COLOR: Record<StockLevel, "error" | "warning" | "success" | "primary"> = {
  critical: "error",
  low: "warning",
  normal: "success",
  overstocked: "primary",
};

const CATEGORY_COLORS = ["primary", "info", "success", "warning", "secondary"] as const;

function getCategoryColor(name: string): typeof CATEGORY_COLORS[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export interface ItemsListViewProps {
  /** Pre-set category filter (hides category dropdown when set) */
  lockedCategoryId?: string;
  /** Base path for links (e.g. "/admin/items") */
  basePath: string;
  /** Label for the section (used in exports, empty states) */
  sectionLabel: string;
}

export default function ItemsListView({ lockedCategoryId, basePath, sectionLabel }: ItemsListViewProps) {
  // Offline sync hook
  const { queueItemArchive, isOnline } = useOfflineItemSync();

  // Data state
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = React.useState<Map<string, Set<PendingOperationType>>>(new Map());
  const [offlineItemIds, setOfflineItemIds] = React.useState<Set<string>>(new Set());
  const [isUsingCache, setIsUsingCache] = React.useState(false);

  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(25);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  // Filter state (synced to server)
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState(lockedCategoryId || "");
  const [stockFilter, setStockFilter] = React.useState("");

  // Debounced search for server-side filtering
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // UI state
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = React.useState(false);

  // Quick action modal state
  const [photoModalItem, setPhotoModalItem] = React.useState<Item | null>(null);
  const [categoryModalItem, setCategoryModalItem] = React.useState<Item | null>(null);
  const [stockModalItem, setStockModalItem] = React.useState<Item | null>(null);
  const [thresholdModalItem, setThresholdModalItem] = React.useState<Item | null>(null);
  const [costModalItem, setCostModalItem] = React.useState<Item | null>(null);

  // Toast notifications
  const toast = useToastHelpers();

  // Create lookup maps
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // Summary counts for the summary bar
  const stockSummary = React.useMemo(() => {
    let critical = 0;
    let low = 0;
    for (const item of items) {
      const level = getStockLevel(item.current_stock, item.min_stock, item.max_stock || 0);
      if (level === "critical") critical++;
      else if (level === "low") low++;
    }
    return { critical, low };
  }, [items]);

  // Check if any filters are active
  const hasActiveFilters = debouncedSearch || (!lockedCategoryId && categoryFilter) || stockFilter;

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, stockFilter]);

  // Fetch data with server-side pagination, with offline fallback
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use locked category for filter
      const effectiveCategoryFilter = lockedCategoryId || categoryFilter;

      // OFFLINE FALLBACK: Use cached data when offline
      if (!isOnline) {
        const [cachedItems, cachedCategories] = await Promise.all([
          getAllCachedItems(),
          getAllCachedCategories(),
        ]);

        let items = cachedItems
          .filter(item => !item.isArchived)
          .map(cachedItemToItem);

        const { items: mergedItems, pendingOperations: ops, offlineItemIds: offlineIds } =
          await applyPendingOperationsToItems(items);

        let filteredItems = mergedItems;

        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          filteredItems = filteredItems.filter(
            item =>
              item.name.toLowerCase().includes(searchLower) ||
              item.sku.toLowerCase().includes(searchLower) ||
              (item.description && item.description.toLowerCase().includes(searchLower))
          );
        }

        if (effectiveCategoryFilter) {
          filteredItems = filteredItems.filter(item => item.category_id === effectiveCategoryFilter);
        }

        if (stockFilter) {
          filteredItems = filteredItems.filter(item => {
            const level = getStockLevel(item.current_stock, item.min_stock, item.max_stock || 0);
            return level === stockFilter;
          });
        }

        setItems(filteredItems);
        setPendingOperations(ops);
        setOfflineItemIds(offlineIds);
        setCategories(cachedCategories.map(cachedCategoryToCategory));
        setTotalCount(filteredItems.length);
        setTotalPages(1);
        setIsUsingCache(true);
        setIsInitialLoad(false);
        return;
      }

      // ONLINE FLOW
      setIsUsingCache(false);

      const filters: PaginatedItemFilters = {
        page: currentPage,
        pageSize: itemsPerPage,
        search: debouncedSearch || undefined,
        categoryId: effectiveCategoryFilter || undefined,
        stockLevel: stockFilter as PaginatedItemFilters['stockLevel'] || undefined,
      };

      const [itemsResult, categoriesResult] = await Promise.all([
        getItemsPaginated(filters),
        getCategories(),
      ]);

      if (itemsResult.success) {
        const { items: mergedItems, pendingOperations: ops, offlineItemIds: offlineIds } = await applyPendingOperationsToItems(
          itemsResult.data.data
        );
        setItems(mergedItems);
        setPendingOperations(ops);
        setOfflineItemIds(offlineIds);
        setTotalCount(itemsResult.data.totalCount + offlineIds.size);
        setTotalPages(Math.ceil((itemsResult.data.totalCount + offlineIds.size) / itemsPerPage));

        cacheItems(itemsResult.data.data.map(itemToCachedItem)).catch(console.error);
      } else {
        setError(itemsResult.error || "Failed to load items");
        return;
      }

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
        cacheCategories(categoriesResult.data.map(categoryToCachedCategory)).catch(console.error);
      }

      setIsInitialLoad(false);
    } catch (err) {
      if (!navigator.onLine) {
        setIsLoading(false);
        return fetchData();
      }
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, currentPage, itemsPerPage, debouncedSearch, categoryFilter, stockFilter, lockedCategoryId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side sorting only
  const sortedItems = React.useMemo(() => {
    if (!sortConfig) return items;

    const result = [...items];
    result.sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      switch (sortConfig.key) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "category":
          aValue = categoryMap.get(a.category_id || "")?.name?.toLowerCase() || "";
          bValue = categoryMap.get(b.category_id || "")?.name?.toLowerCase() || "";
          break;
        case "current_stock":
          aValue = a.current_stock;
          bValue = b.current_stock;
          break;
        case "unit_price":
          aValue = a.unit_price || 0;
          bValue = b.unit_price || 0;
          break;
        default:
          return 0;
      }

      if (aValue === null || bValue === null) return 0;
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, sortConfig, categoryMap]);

  const displayItems = sortedItems;

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    setSelectedItems([]);
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === "asc"
          ? { key, direction: "desc" }
          : null;
      }
      return { key, direction: "asc" };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(displayItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    const item = items.find((i) => i.id === itemToDelete);
    const isOfflineItem = offlineItemIds.has(itemToDelete);

    if (isOfflineItem) {
      try {
        const { removeItemCreateFromQueue, removePendingImagesForItem } = await import("@/lib/offline/db");
        await removeItemCreateFromQueue(itemToDelete);
        await removePendingImagesForItem(itemToDelete);
      } catch (err) {
        console.error("Error cleaning up offline item:", err);
      }
      setItems(items.filter((i) => i.id !== itemToDelete));
      setSelectedItems(selectedItems.filter((id) => id !== itemToDelete));
      toast.success("Offline item removed");
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      return;
    }

    if (!isOnline && item) {
      try {
        await queueItemArchive(itemToDelete, "archive", item.version);
        setItems(items.filter((i) => i.id !== itemToDelete));
        setSelectedItems(selectedItems.filter((id) => id !== itemToDelete));
        toast.success("Archive queued for sync");
      } catch (err) {
        setError("Failed to queue archive operation");
      }
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      return;
    }

    const result = await archiveItem(itemToDelete);

    if (result.success) {
      setItems(items.filter((i) => i.id !== itemToDelete));
      setSelectedItems(selectedItems.filter((id) => id !== itemToDelete));
    } else {
      setError(result.error || "Failed to delete item");
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
      return;
    }

    setIsDeleting(true);
    const successIds: string[] = [];
    const failures: string[] = [];

    for (const id of selectedItems) {
      const item = items.find((i) => i.id === id);
      const isOfflineItem = offlineItemIds.has(id);

      if (isOfflineItem) {
        successIds.push(id);
        continue;
      }

      if (!isOnline && item) {
        try {
          await queueItemArchive(id, "archive", item.version);
          successIds.push(id);
        } catch {
          failures.push(id);
        }
        continue;
      }

      const result = await archiveItem(id);
      if (result.success) {
        successIds.push(id);
      } else {
        failures.push(id);
      }
    }

    setItems(items.filter((item) => !successIds.includes(item.id)));
    setSelectedItems([]);
    setIsDeleting(false);

    if (failures.length > 0) {
      setError(`Failed to delete ${failures.length} item(s)`);
    } else if (!isOnline && successIds.length > 0) {
      toast.success(`${successIds.length} item(s) queued for deletion`);
    }
  };

  const handleExport = () => {
    const headers = ["SKU", "Name", "Category", "Stock", "Unit", "Price"];
    const rows = displayItems.map((item) => [
      item.sku,
      item.name,
      categoryMap.get(item.category_id || "")?.name || "",
      item.current_stock.toString(),
      item.unit,
      (item.unit_price || 0).toString(),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sectionLabel.toLowerCase().replace(/\s+/g, '-')}-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickActionSuccess = (updatedItem?: Item) => {
    if (updatedItem) {
      setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    } else {
      fetchData();
    }
    toast.success("Item updated");
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  const stockOptions = [
    { value: "critical", label: "Critical" },
    { value: "low", label: "Low Stock" },
    { value: "normal", label: "In Stock" },
    { value: "overstocked", label: "Overstocked" },
  ];

  // Build "Add Item" link
  const addItemHref = lockedCategoryId
    ? `/admin/items/new?category=${lockedCategoryId}`
    : `${basePath}/new`;

  // Loading state
  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" borderRadius="lg" />
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 flex-1" />
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
        <Card variant="elevated" className="overflow-hidden">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <SkeletonTableRow key={i} columns={7} />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load {sectionLabel}</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button onClick={fetchData} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && items.length > 0 && (
        <Alert status="error" variant="subtle" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Offline Mode Banner */}
      {isUsingCache && (
        <Alert status="info" variant="subtle">
          <div className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Offline Mode:</strong> Showing cached data. Some features may be limited.
            </span>
          </div>
        </Alert>
      )}

      {/* Summary Bar */}
      {items.length > 0 && (
        <Card variant="filled" size="sm">
          <div className="flex items-center gap-4 text-sm">
            <span><strong>{totalCount}</strong> total items</span>
            {stockSummary.critical > 0 && (
              <Badge colorScheme="error" variant="subtle" size="xs">{stockSummary.critical} critical</Badge>
            )}
            {stockSummary.low > 0 && (
              <Badge colorScheme="warning" variant="subtle" size="xs">{stockSummary.low} low stock</Badge>
            )}
          </div>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="space-y-3">
        {/* Row 1: Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              placeholder={`Search ${sectionLabel.toLowerCase()} by name, SKU...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!lockedCategoryId && (
              <Select
                options={[{ value: "", label: "All Categories" }, ...categoryOptions]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Category"
                isClearable
                className="w-40"
              />
            )}
            <Select
              options={[{ value: "", label: "All Status" }, ...stockOptions]}
              value={stockFilter}
              onChange={setStockFilter}
              placeholder="Stock Status"
              isClearable
              className="w-40"
            />
          </div>
        </div>

        {/* Row 2: Info text + Action buttons */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            Showing {totalCount === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsBulkAddOpen(true)}
            >
              Bulk Add
            </Button>
            <Link href={addItemHref}>
              <Button variant="cta" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Add Item
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Selected Items Actions */}
      {selectedItems.length > 0 && (
        <Card variant="filled" size="sm" className="animate-slide-in-down">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
                isLoading={isDeleting}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Items Table */}
      <Card variant="elevated" className="overflow-hidden relative">
        <LoadingOverlay isLoading={isLoading && !isInitialLoad} label="Updating items..." />
        <Table variant="simple" size="md">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  isChecked={
                    selectedItems.length === displayItems.length &&
                    displayItems.length > 0
                  }
                  isIndeterminate={
                    selectedItems.length > 0 &&
                    selectedItems.length < displayItems.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all items"
                />
              </TableHead>
              <TableHead
                sortable
                sortDirection={
                  sortConfig?.key === "name" ? sortConfig.direction : null
                }
                onSort={() => handleSort("name")}
              >
                Item
              </TableHead>
              {!lockedCategoryId && (
                <TableHead
                  sortable
                  sortDirection={
                    sortConfig?.key === "category" ? sortConfig.direction : null
                  }
                  onSort={() => handleSort("category")}
                >
                  Category
                </TableHead>
              )}
              <TableHead
                sortable
                sortDirection={
                  sortConfig?.key === "current_stock" ? sortConfig.direction : null
                }
                onSort={() => handleSort("current_stock")}
              >
                Stock
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                sortable
                sortDirection={
                  sortConfig?.key === "unit_price" ? sortConfig.direction : null
                }
                onSort={() => handleSort("unit_price")}
              >
                Cost
              </TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.length === 0 ? (
              hasActiveFilters ? (
                <TableEmpty
                  title={`No matching ${sectionLabel.toLowerCase()}`}
                  description="Try adjusting your search or filters"
                  icon={<Package className="w-12 h-12" />}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        if (!lockedCategoryId) setCategoryFilter("");
                        setStockFilter("");
                      }}
                    >
                      Clear All Filters
                    </Button>
                  }
                  colSpan={lockedCategoryId ? 6 : 7}
                />
              ) : (
                <TableEmpty
                  title={`No ${sectionLabel.toLowerCase()} yet`}
                  description={`Add your first ${sectionLabel.toLowerCase().replace(/s$/, '')} to get started`}
                  icon={<Package className="w-12 h-12" />}
                  action={
                    <Link href={addItemHref}>
                      <Button variant="cta" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                        Add First Item
                      </Button>
                    </Link>
                  }
                  colSpan={lockedCategoryId ? 6 : 7}
                />
              )
            ) : (
              displayItems.map((item) => {
                const level = getStockLevel(
                  item.current_stock,
                  item.min_stock,
                  item.max_stock || 0
                );
                const isSelected = selectedItems.includes(item.id);
                const itemOps = pendingOperations.get(item.id);
                const isOfflineItem = offlineItemIds.has(item.id);
                const hasPendingEdit = itemOps?.has('pending_edit');
                const hasPendingArchive = itemOps?.has('pending_archive');
                const categoryName = item.category_id
                  ? categoryMap.get(item.category_id)?.name || "Uncategorized"
                  : "Uncategorized";

                return (
                  <TableRow key={item.id} isSelected={isSelected} className="hover:bg-background-tertiary">
                    <TableCell>
                      <Checkbox
                        isChecked={isSelected}
                        onChange={(e) =>
                          handleSelectItem(item.id, e.target.checked)
                        }
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ClickableTableCell
                          onClick={() => setPhotoModalItem(item)}
                          ariaLabel={`Update photo for ${item.name}`}
                        >
                          <ItemImage
                            imageUrl={item.image_url}
                            itemName={item.name}
                            size="sm"
                          />
                        </ClickableTableCell>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isOfflineItem ? (
                              <span className="font-medium text-foreground">
                                {item.name}
                              </span>
                            ) : (
                              <Link
                                href={`/admin/items/${item.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {item.name}
                              </Link>
                            )}
                            {isOfflineItem && (
                              <Badge colorScheme="info" variant="subtle" size="xs" leftIcon={<CloudOff className="w-3 h-3" />}>
                                Offline
                              </Badge>
                            )}
                            {hasPendingEdit && !isOfflineItem && (
                              <Badge colorScheme="warning" variant="subtle" size="xs" leftIcon={<Clock className="w-3 h-3" />}>
                                Pending Edit
                              </Badge>
                            )}
                            {hasPendingArchive && (
                              <Badge colorScheme="error" variant="subtle" size="xs" leftIcon={<Archive className="w-3 h-3" />}>
                                Pending Delete
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground-muted">
                            {item.sku}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {!lockedCategoryId && (
                      <TableCell>
                        <ClickableTableCell
                          onClick={() => setCategoryModalItem(item)}
                          ariaLabel={`Change category for ${item.name}`}
                        >
                          <Badge colorScheme={getCategoryColor(categoryName)} variant="subtle" size="sm">
                            {categoryName}
                          </Badge>
                        </ClickableTableCell>
                      </TableCell>
                    )}
                    <TableCell>
                      <ClickableTableCell
                        onClick={() => setStockModalItem(item)}
                        ariaLabel={`Adjust stock for ${item.name}`}
                      >
                        <div className="text-sm">
                          <span className="font-medium">{item.current_stock}</span>
                          <span className="text-foreground-muted">
                            {" "}
                            / {item.max_stock || "∞"} {item.unit}
                          </span>
                          {(item.max_stock ?? 0) > 0 && (
                            <Progress
                              value={item.current_stock}
                              max={item.max_stock!}
                              size="xs"
                              colorScheme={STOCK_LEVEL_PROGRESS_COLOR[level]}
                              className="mt-1"
                              aria-label={`Stock level: ${item.current_stock} of ${item.max_stock}`}
                            />
                          )}
                        </div>
                      </ClickableTableCell>
                    </TableCell>
                    <TableCell>
                      <ClickableTableCell
                        onClick={() => setThresholdModalItem(item)}
                        ariaLabel={`Adjust thresholds for ${item.name}`}
                      >
                        <StockLevelBadge level={level} size="sm" showIcon={false} />
                      </ClickableTableCell>
                    </TableCell>
                    <TableCell>
                      <ClickableTableCell
                        onClick={() => setCostModalItem(item)}
                        ariaLabel={`Edit cost for ${item.name}`}
                        className="font-medium"
                      >
                        {formatCurrency(item.unit_price || 0)}
                      </ClickableTableCell>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {!isOfflineItem && (
                          <>
                            <Tooltip content="View" placement="top">
                              <Link href={`/admin/items/${item.id}`}>
                                <IconButton
                                  icon={<Eye className="w-4 h-4" />}
                                  aria-label="View item"
                                  variant="ghost"
                                  size="sm"
                                />
                              </Link>
                            </Tooltip>
                            <Tooltip content="Edit" placement="top">
                              <Link href={`/admin/items/${item.id}/edit`}>
                                <IconButton
                                  icon={<Edit className="w-4 h-4" />}
                                  aria-label="Edit item"
                                  variant="ghost"
                                  size="sm"
                                />
                              </Link>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip content={isOfflineItem ? "Remove" : "Archive"} placement="top">
                          <IconButton
                            icon={<Trash2 className="w-4 h-4" />}
                            aria-label={isOfflineItem ? "Remove offline item" : "Delete item"}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(item.id)}
                            className="text-error hover:bg-error-light"
                          />
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {isUsingCache ? (
        <div className="flex items-center justify-center">
          <p className="text-sm text-foreground-muted">
            Showing {totalCount} cached item{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-muted">Items per page:</span>
            <Select
              options={[
                { value: "10", label: "10" },
                { value: "25", label: "25" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
              value={itemsPerPage.toString()}
              onChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}
              className="w-20"
            />
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              icon={<ChevronsLeft className="w-4 h-4" />}
              aria-label="First page"
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            />
            <IconButton
              icon={<ChevronLeft className="w-4 h-4" />}
              aria-label="Previous page"
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {getPageNumbers(currentPage, totalPages || 1).map((page, idx) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-foreground-muted">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                    page === currentPage
                      ? "bg-primary text-white"
                      : "text-foreground-secondary hover:bg-background-tertiary"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <IconButton
              icon={<ChevronRight className="w-4 h-4" />}
              aria-label="Next page"
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            />
            <IconButton
              icon={<ChevronsRight className="w-4 h-4" />}
              aria-label="Last page"
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={() => setDeleteModalOpen(false)}>
          Archive Item
        </ModalHeader>
        <ModalBody>
          <p className="text-foreground-secondary">
            Are you sure you want to archive this item? It will be hidden from
            the active inventory list but can be restored later.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
          >
            Archive
          </Button>
        </ModalFooter>
      </Modal>

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        onSuccess={(count) => {
          toast.success(
            `${count} item${count > 1 ? "s" : ""} added`,
            "Items have been created with default values"
          );
          fetchData();
        }}
      />

      {/* Quick Action Modals */}
      {photoModalItem && (
        <PhotoUploadModal
          isOpen={!!photoModalItem}
          onClose={() => setPhotoModalItem(null)}
          item={photoModalItem}
          onSuccess={handleQuickActionSuccess}
        />
      )}

      {categoryModalItem && (
        <CategoryAssignmentModal
          isOpen={!!categoryModalItem}
          onClose={() => setCategoryModalItem(null)}
          item={categoryModalItem}
          categories={categories}
          onSuccess={handleQuickActionSuccess}
        />
      )}

      {stockModalItem && (
        <StockAdjustmentModal
          isOpen={!!stockModalItem}
          onClose={() => setStockModalItem(null)}
          item={stockModalItem}
          onSuccess={() => handleQuickActionSuccess()}
        />
      )}

      {thresholdModalItem && (
        <ThresholdAdjustmentModal
          isOpen={!!thresholdModalItem}
          onClose={() => setThresholdModalItem(null)}
          item={thresholdModalItem}
          onSuccess={handleQuickActionSuccess}
        />
      )}

      {costModalItem && (
        <CostEditModal
          isOpen={!!costModalItem}
          onClose={() => setCostModalItem(null)}
          item={costModalItem}
          onSuccess={handleQuickActionSuccess}
        />
      )}
    </div>
  );
}
