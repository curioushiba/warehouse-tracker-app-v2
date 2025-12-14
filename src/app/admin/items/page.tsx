"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ItemImage } from "@/components/items";
import {
  Card,
  CardHeader,
  CardBody,
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
  Alert,
} from "@/components/ui";
import { StockLevelBadge } from "@/components/ui";
import { getItems, archiveItem } from "@/lib/actions/items";
import { getCategories } from "@/lib/actions/categories";
import { getLocations } from "@/lib/actions/locations";
import type { Item, Category, Location } from "@/lib/supabase/types";
import { formatCurrency, getStockLevel, formatDateTime } from "@/lib/utils";

export default function ItemsPage() {
  // Data state
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState("");
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(25);

  // Create lookup maps
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const locationMap = React.useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach((loc) => map.set(loc.id, loc));
    return map;
  }, [locations]);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [itemsResult, categoriesResult, locationsResult] = await Promise.all([
        getItems(),
        getCategories(),
        getLocations(),
      ]);

      if (itemsResult.success) {
        setItems(itemsResult.data);
      } else {
        setError(itemsResult.error || "Failed to load items");
        return;
      }

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }

      if (locationsResult.success && locationsResult.data) {
        setLocations(locationsResult.data);
      }
    } catch (err) {
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and sort items
  const filteredItems = React.useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const categoryName = item.category_id ? categoryMap.get(item.category_id)?.name || "" : "";
        return (
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          categoryName.toLowerCase().includes(query)
        );
      });
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((item) => item.category_id === categoryFilter);
    }

    // Stock level filter
    if (stockFilter) {
      result = result.filter((item) => {
        const level = getStockLevel(item.current_stock, item.min_stock, item.max_stock || 0);
        return level === stockFilter;
      });
    }

    // Sort
    if (sortConfig) {
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
    }

    return result;
  }, [items, searchQuery, categoryFilter, stockFilter, sortConfig, categoryMap]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, stockFilter]);

  // Paginated items
  const paginatedItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

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
      setSelectedItems(paginatedItems.map((item) => item.id));
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
    const result = await archiveItem(itemToDelete);

    if (result.success) {
      setItems(items.filter((item) => item.id !== itemToDelete));
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
    const results = await Promise.all(selectedItems.map((id) => archiveItem(id)));
    const successIds = selectedItems.filter((_, index) => results[index].success);

    setItems(items.filter((item) => !successIds.includes(item.id)));
    setSelectedItems([]);
    setIsDeleting(false);

    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      setError(`Failed to delete ${failures.length} item(s)`);
    }
  };

  const handleExport = () => {
    const headers = ["SKU", "Name", "Category", "Stock", "Unit", "Price"];
    const rows = filteredItems.map((item) => [
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
    a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3">
            <Skeleton className="h-10 flex-1 max-w-md" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <Card variant="elevated">
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Items</h2>
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

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder="Search items by name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
          <Select
            options={[{ value: "", label: "All Categories" }, ...categoryOptions]}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="Category"
            isClearable
            className="w-40"
          />
          <Select
            options={[{ value: "", label: "All Status" }, ...stockOptions]}
            value={stockFilter}
            onChange={setStockFilter}
            placeholder="Stock Status"
            isClearable
            className="w-40"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Link href="/admin/items/new">
            <Button variant="cta" leftIcon={<Plus className="w-4 h-4" />}>
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Selected Items Actions */}
      {selectedItems.length > 0 && (
        <Card variant="filled" size="sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled>
                Bulk Edit
              </Button>
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
      <Card variant="elevated" className="overflow-hidden">
        <Table variant="simple" size="md">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  isChecked={
                    selectedItems.length === paginatedItems.length &&
                    paginatedItems.length > 0
                  }
                  isIndeterminate={
                    selectedItems.length > 0 &&
                    selectedItems.length < paginatedItems.length
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
              <TableHead
                sortable
                sortDirection={
                  sortConfig?.key === "category" ? sortConfig.direction : null
                }
                onSort={() => handleSort("category")}
              >
                Category
              </TableHead>
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
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableEmpty
                title="No items found"
                description="Try adjusting your search or filters"
                icon={<Package className="w-12 h-12" />}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("");
                      setStockFilter("");
                    }}
                  >
                    Clear Filters
                  </Button>
                }
                colSpan={8}
              />
            ) : (
              paginatedItems.map((item) => {
                const level = getStockLevel(
                  item.current_stock,
                  item.min_stock,
                  item.max_stock || 0
                );
                const isSelected = selectedItems.includes(item.id);
                const categoryName = item.category_id
                  ? categoryMap.get(item.category_id)?.name || "Uncategorized"
                  : "Uncategorized";

                return (
                  <TableRow key={item.id} isSelected={isSelected}>
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
                        <ItemImage
                          imageUrl={item.image_url}
                          itemName={item.name}
                          size="sm"
                        />
                        <div>
                          <Link
                            href={`/admin/items/${item.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {item.name}
                          </Link>
                          <p className="text-sm text-foreground-muted">
                            {item.sku}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge colorScheme="neutral" variant="subtle" size="sm">
                        {categoryName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{item.current_stock}</span>
                        <span className="text-foreground-muted">
                          {" "}
                          / {item.max_stock || "∞"} {item.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StockLevelBadge level={level} size="sm" showIcon={false} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.unit_price || 0)}
                    </TableCell>
                    <TableCell className="text-sm text-foreground-muted">
                      {formatDateTime(item.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/items/${item.id}`}>
                          <IconButton
                            icon={<Eye className="w-4 h-4" />}
                            aria-label="View item"
                            variant="ghost"
                            size="sm"
                          />
                        </Link>
                        <Link href={`/admin/items/${item.id}/edit`}>
                          <IconButton
                            icon={<Edit className="w-4 h-4" />}
                            aria-label="Edit item"
                            variant="ghost"
                            size="sm"
                          />
                        </Link>
                        <IconButton
                          icon={<Trash2 className="w-4 h-4" />}
                          aria-label="Delete item"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item.id)}
                          className="text-error hover:bg-error-light"
                        />
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-foreground-muted">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
          </p>
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-foreground-muted px-2">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages}
          >
            Last
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={() => setDeleteModalOpen(false)}>
          Delete Item
        </ModalHeader>
        <ModalBody>
          <p className="text-foreground-secondary">
            Are you sure you want to delete this item? This action cannot be
            undone.
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
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
