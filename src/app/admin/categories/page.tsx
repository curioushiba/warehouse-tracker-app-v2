"use client";

import * as React from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen,
  Package,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  IconButton,
  SearchInput,
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
  Input,
  Textarea,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Skeleton,
  Alert,
  Select,
} from "@/components/ui";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/categories";
import { getItems } from "@/lib/actions/items";
import type { Category, CategoryInsert, CategoryUpdate, Item } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

interface CategoryFormData {
  name: string;
  description: string;
  parent_id: string;
}

const initialFormData: CategoryFormData = {
  name: "",
  description: "",
  parent_id: "",
};

interface CategoryWithCount extends Category {
  itemCount: number;
}

export default function CategoriesPage() {
  // Data state
  const [categories, setCategories] = React.useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryWithCount | null>(null);

  // Form state
  const [formData, setFormData] = React.useState<CategoryFormData>(initialFormData);
  const [formErrors, setFormErrors] = React.useState<Partial<CategoryFormData>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [categoriesResult, itemsResult] = await Promise.all([
        getCategories(),
        getItems(),
      ]);

      if (!categoriesResult.success) {
        setError(categoriesResult.error || "Failed to load categories");
        return;
      }

      // Count items per category
      const itemCounts = new Map<string, number>();
      if (itemsResult.success && itemsResult.data) {
        itemsResult.data.forEach((item: Item) => {
          if (item.category_id) {
            itemCounts.set(item.category_id, (itemCounts.get(item.category_id) || 0) + 1);
          }
        });
      }

      // Add item counts to categories
      const categoriesWithCounts: CategoryWithCount[] = categoriesResult.data.map((cat) => ({
        ...cat,
        itemCount: itemCounts.get(cat.id) || 0,
      }));

      setCategories(categoriesWithCounts);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and sort categories
  const filteredCategories = React.useMemo(() => {
    let result = [...categories];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.key === "name") {
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
        } else if (sortConfig.key === "itemCount") {
          aValue = a.itemCount || 0;
          bValue = b.itemCount || 0;
        } else {
          return 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [categories, searchQuery, sortConfig]);

  // Get parent category name
  const getParentName = (parentId: string | null): string | null => {
    if (!parentId) return null;
    const parent = categories.find((c) => c.id === parentId);
    return parent?.name || null;
  };

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === "asc" ? { key, direction: "desc" } : null;
      }
      return { key, direction: "asc" };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(filteredCategories.map((cat) => cat.id));
    } else {
      setSelectedCategories([]);
    }
  };

  const handleSelectCategory = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
    }
  };

  // Modal handlers
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id || "",
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setEditingCategory(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleOpenDeleteModal = (category: CategoryWithCount) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  const handleOpenBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(true);
  };

  const handleCloseBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(false);
  };

  // Form handlers
  const validateForm = (): boolean => {
    const errors: Partial<CategoryFormData> = {};

    if (!formData.name.trim()) {
      errors.name = "Category name is required";
    } else if (formData.name.length > 50) {
      errors.name = "Category name must be 50 characters or less";
    }

    if (formData.description && formData.description.length > 200) {
      errors.description = "Description must be 200 characters or less";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (editingCategory) {
        // Update
        const updateData: CategoryUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          parent_id: formData.parent_id || null,
        };

        const result = await updateCategory(editingCategory.id, updateData);

        if (result.success) {
          await fetchData();
          handleCloseAddEditModal();
        } else {
          setFormErrors({ name: result.error });
        }
      } else {
        // Create
        const insertData: CategoryInsert = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          parent_id: formData.parent_id || null,
        };

        const result = await createCategory(insertData);

        if (result.success) {
          await fetchData();
          handleCloseAddEditModal();
        } else {
          setFormErrors({ name: result.error });
        }
      }
    } catch (err) {
      setFormErrors({ name: "An unexpected error occurred" });
      console.error("Error saving category:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);

    try {
      const result = await deleteCategory(categoryToDelete.id);

      if (result.success) {
        await fetchData();
        handleCloseDeleteModal();
      } else {
        setError(result.error);
        handleCloseDeleteModal();
      }
    } catch (err) {
      setError("Failed to delete category");
      console.error("Error deleting category:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setIsDeleting(true);

    try {
      // Delete categories one by one (could be optimized with bulk delete endpoint)
      const results = await Promise.all(
        selectedCategories.map((id) => deleteCategory(id))
      );

      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        setError(`Failed to delete ${failures.length} categories. Some may have items.`);
      }

      setSelectedCategories([]);
      await fetchData();
      handleCloseBulkDeleteModal();
    } catch (err) {
      setError("Failed to delete categories");
      console.error("Error bulk deleting categories:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Categories
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Manage inventory categories and organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchData}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAddModal}
          >
            Add Category
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
      </div>

      {/* Selected Items Actions */}
      {selectedCategories.length > 0 && (
        <Card variant="filled" size="sm">
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedCategories.length} categor{selectedCategories.length > 1 ? "ies" : "y"} selected
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleOpenBulkDeleteModal}
              >
                Delete Selected
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Categories Table */}
      <Card variant="elevated" className="overflow-hidden">
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    isChecked={
                      selectedCategories.length === filteredCategories.length &&
                      filteredCategories.length > 0
                    }
                    isIndeterminate={
                      selectedCategories.length > 0 &&
                      selectedCategories.length < filteredCategories.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all categories"
                  />
                </TableHead>
                <TableHead
                  sortable
                  sortDirection={
                    sortConfig?.key === "name" ? sortConfig.direction : null
                  }
                  onSort={() => handleSort("name")}
                >
                  Category Name
                </TableHead>
                <TableHead>Parent</TableHead>
                <TableHead
                  sortable
                  sortDirection={
                    sortConfig?.key === "itemCount" ? sortConfig.direction : null
                  }
                  onSort={() => handleSort("itemCount")}
                  className="w-32"
                >
                  Items
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredCategories.length === 0 ? (
                <TableEmpty
                  title={searchQuery ? "No categories found" : "No categories yet"}
                  description={
                    searchQuery
                      ? "Try adjusting your search"
                      : "Add your first category to organize your inventory"
                  }
                  icon={<FolderOpen className="w-12 h-12" />}
                  action={
                    searchQuery ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear Search
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={handleOpenAddModal}
                      >
                        Add Category
                      </Button>
                    )
                  }
                  colSpan={6}
                />
              ) : (
                filteredCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  const parentName = getParentName(category.parent_id);

                  return (
                    <TableRow key={category.id} isSelected={isSelected}>
                      <TableCell>
                        <Checkbox
                          isChecked={isSelected}
                          onChange={(e) =>
                            handleSelectCategory(category.id, e.target.checked)
                          }
                          aria-label={`Select ${category.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">
                            {category.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {parentName ? (
                          <div className="flex items-center gap-1 text-sm text-foreground-muted">
                            <ChevronRight className="w-4 h-4" />
                            {parentName}
                          </div>
                        ) : (
                          <span className="text-foreground-muted">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge colorScheme="primary" variant="subtle" size="sm">
                          <Package className="w-3 h-3 mr-1" />
                          {category.itemCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground-muted max-w-xs truncate">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={<Edit className="w-4 h-4" />}
                            aria-label="Edit category"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(category)}
                          />
                          <IconButton
                            icon={<Trash2 className="w-4 h-4" />}
                            aria-label="Delete category"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeleteModal(category)}
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
        </CardBody>
      </Card>

      {/* Pagination Footer */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            Showing {filteredCategories.length} of {categories.length} categories
          </p>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={handleCloseAddEditModal}>
          {editingCategory ? "Edit Category" : "Add Category"}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <FormControl isRequired isInvalid={!!formErrors.name}>
            <FormLabel>Category Name</FormLabel>
            <Input
              placeholder="e.g. Animal Feed"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              maxLength={50}
            />
            {formErrors.name && (
              <FormErrorMessage>{formErrors.name}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl>
            <FormLabel>Parent Category</FormLabel>
            <Select
              options={[
                { value: "", label: "None (Top Level)" },
                ...categories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={formData.parent_id}
              onChange={(value) => setFormData({ ...formData, parent_id: value })}
              placeholder="Select parent category..."
            />
          </FormControl>

          <FormControl isInvalid={!!formErrors.description}>
            <FormLabel>Description</FormLabel>
            <Textarea
              placeholder="Optional description..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              maxLength={200}
            />
            {formErrors.description && (
              <FormErrorMessage>{formErrors.description}</FormErrorMessage>
            )}
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleCloseAddEditModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleFormSubmit}
            isLoading={isSaving}
            disabled={isSaving}
          >
            {editingCategory ? "Save Changes" : "Add Category"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={handleCloseDeleteModal}>
          Delete Category
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <p className="text-foreground mb-2">
              Are you sure you want to delete{" "}
              <strong>&ldquo;{categoryToDelete?.name}&rdquo;</strong>?
            </p>
            {categoryToDelete?.itemCount && categoryToDelete.itemCount > 0 ? (
              <p className="text-sm text-error">
                This category has {categoryToDelete.itemCount} item
                {categoryToDelete.itemCount > 1 ? "s" : ""}. Please move or delete them first.
              </p>
            ) : (
              <p className="text-sm text-foreground-muted">
                This action cannot be undone.
              </p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
            disabled={isDeleting || (categoryToDelete?.itemCount ?? 0) > 0}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={handleCloseBulkDeleteModal}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={handleCloseBulkDeleteModal}>
          Delete Categories
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <p className="text-foreground mb-2">
              Are you sure you want to delete{" "}
              <strong>{selectedCategories.length}</strong> categor
              {selectedCategories.length > 1 ? "ies" : "y"}?
            </p>
            <p className="text-sm text-foreground-muted">
              Categories with items cannot be deleted.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleCloseBulkDeleteModal}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleBulkDeleteConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            Delete {selectedCategories.length} Categor{selectedCategories.length > 1 ? "ies" : "y"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
