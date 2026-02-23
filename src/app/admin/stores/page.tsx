"use client";

import * as React from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Store,
  Package,
  RefreshCw,
  AlertCircle,
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
} from "@/components/ui";
import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  getStoreItemCounts,
} from "@/lib/actions/stores";
import type { Store as StoreType, StoreInsert, StoreUpdate } from "@/lib/supabase/types";

interface StoreFormData {
  name: string;
  description: string;
}

const initialFormData: StoreFormData = {
  name: "",
  description: "",
};

interface StoreWithCount extends StoreType {
  itemCount: number;
}

export default function StoresPage() {
  // Data state
  const [stores, setStores] = React.useState<StoreWithCount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStores, setSelectedStores] = React.useState<string[]>([]);
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState<StoreType | null>(null);
  const [storeToDelete, setStoreToDelete] = React.useState<StoreWithCount | null>(null);

  // Form state
  const [formData, setFormData] = React.useState<StoreFormData>(initialFormData);
  const [formErrors, setFormErrors] = React.useState<Partial<StoreFormData>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [storesResult, countsResult] = await Promise.all([
        getStores(),
        getStoreItemCounts(),
      ]);

      if (!storesResult.success) {
        setError(storesResult.error || "Failed to load stores");
        return;
      }

      // Add item counts to stores
      const itemCounts = countsResult.success ? countsResult.data : {};
      const storesWithCounts: StoreWithCount[] = storesResult.data.map((store) => ({
        ...store,
        itemCount: itemCounts[store.id] || 0,
      }));

      setStores(storesWithCounts);
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

  // Filter and sort stores
  const filteredStores = React.useMemo(() => {
    let result = [...stores];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (store) =>
          store.name.toLowerCase().includes(query) ||
          store.description?.toLowerCase().includes(query)
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
  }, [stores, searchQuery, sortConfig]);

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
      setSelectedStores(filteredStores.map((store) => store.id));
    } else {
      setSelectedStores([]);
    }
  };

  const handleSelectStore = (storeId: string, checked: boolean) => {
    if (checked) {
      setSelectedStores([...selectedStores, storeId]);
    } else {
      setSelectedStores(selectedStores.filter((id) => id !== storeId));
    }
  };

  // Modal handlers
  const handleOpenAddModal = () => {
    setEditingStore(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (store: StoreType) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      description: store.description || "",
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setEditingStore(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleOpenDeleteModal = (store: StoreWithCount) => {
    setStoreToDelete(store);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setStoreToDelete(null);
  };

  const handleOpenBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(true);
  };

  const handleCloseBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(false);
  };

  // Form handlers
  const validateForm = (): boolean => {
    const errors: Partial<StoreFormData> = {};

    if (!formData.name.trim()) {
      errors.name = "Store name is required";
    } else if (formData.name.length > 50) {
      errors.name = "Store name must be 50 characters or less";
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
      if (editingStore) {
        // Update
        const updateData: StoreUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        };

        const result = await updateStore(editingStore.id, updateData);

        if (result.success) {
          await fetchData();
          handleCloseAddEditModal();
        } else {
          setFormErrors({ name: result.error });
        }
      } else {
        // Create
        const insertData: StoreInsert = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        };

        const result = await createStore(insertData);

        if (result.success) {
          await fetchData();
          handleCloseAddEditModal();
        } else {
          setFormErrors({ name: result.error });
        }
      }
    } catch (err) {
      setFormErrors({ name: "An unexpected error occurred" });
      console.error("Error saving store:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!storeToDelete) return;

    setIsDeleting(true);

    try {
      const result = await deleteStore(storeToDelete.id);

      if (result.success) {
        await fetchData();
        handleCloseDeleteModal();
      } else {
        setError(result.error);
        handleCloseDeleteModal();
      }
    } catch (err) {
      setError("Failed to delete store");
      console.error("Error deleting store:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setIsDeleting(true);

    try {
      // Delete stores one by one (could be optimized with bulk delete endpoint)
      const results = await Promise.all(
        selectedStores.map((id) => deleteStore(id))
      );

      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        setError(`Failed to delete ${failures.length} stores. Some may have items.`);
      }

      setSelectedStores([]);
      await fetchData();
      handleCloseBulkDeleteModal();
    } catch (err) {
      setError("Failed to delete stores");
      console.error("Error bulk deleting stores:", err);
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
            Stores
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Manage your stores
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
            Add Store
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
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
      </div>

      {/* Selected Items Actions */}
      {selectedStores.length > 0 && (
        <Card variant="filled" size="sm">
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedStores.length} store{selectedStores.length > 1 ? "s" : ""} selected
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

      {/* Stores Table */}
      <Card variant="elevated" className="overflow-hidden">
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    isChecked={
                      selectedStores.length === filteredStores.length &&
                      filteredStores.length > 0
                    }
                    isIndeterminate={
                      selectedStores.length > 0 &&
                      selectedStores.length < filteredStores.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all stores"
                  />
                </TableHead>
                <TableHead
                  sortable
                  sortDirection={
                    sortConfig?.key === "name" ? sortConfig.direction : null
                  }
                  onSort={() => handleSort("name")}
                >
                  Name
                </TableHead>
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
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredStores.length === 0 ? (
                <TableEmpty
                  title={searchQuery ? "No stores found" : "No stores yet"}
                  description={
                    searchQuery
                      ? "Try adjusting your search"
                      : "Add your first store to organize your inventory"
                  }
                  icon={<Store className="w-12 h-12" />}
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
                        Add Store
                      </Button>
                    )
                  }
                  colSpan={5}
                />
              ) : (
                filteredStores.map((store) => {
                  const isSelected = selectedStores.includes(store.id);

                  return (
                    <TableRow key={store.id} isSelected={isSelected}>
                      <TableCell>
                        <Checkbox
                          isChecked={isSelected}
                          onChange={(e) =>
                            handleSelectStore(store.id, e.target.checked)
                          }
                          aria-label={`Select ${store.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                            <Store className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">
                            {store.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge colorScheme="primary" variant="subtle" size="sm">
                          <Package className="w-3 h-3 mr-1" />
                          {store.itemCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground-muted max-w-xs truncate">
                        {store.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={<Edit className="w-4 h-4" />}
                            aria-label="Edit store"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(store)}
                          />
                          <IconButton
                            icon={<Trash2 className="w-4 h-4" />}
                            aria-label="Delete store"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeleteModal(store)}
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
            Showing {filteredStores.length} of {stores.length} stores
          </p>
        </div>
      )}

      {/* Add/Edit Store Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={handleCloseAddEditModal}>
          {editingStore ? "Edit Store" : "Add Store"}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <FormControl isRequired isInvalid={!!formErrors.name}>
            <FormLabel>Store Name</FormLabel>
            <Input
              placeholder="e.g. Main Warehouse"
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
            {editingStore ? "Save Changes" : "Add Store"}
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
          Delete Store
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <p className="text-foreground mb-2">
              Are you sure you want to delete{" "}
              <strong>&ldquo;{storeToDelete?.name}&rdquo;</strong>?
            </p>
            {storeToDelete?.itemCount && storeToDelete.itemCount > 0 ? (
              <p className="text-sm text-error">
                This store has {storeToDelete.itemCount} item
                {storeToDelete.itemCount > 1 ? "s" : ""}. Please move or delete them first.
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
            disabled={isDeleting || (storeToDelete?.itemCount ?? 0) > 0}
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
          Delete Stores
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <p className="text-foreground mb-2">
              Are you sure you want to delete{" "}
              <strong>{selectedStores.length}</strong> store
              {selectedStores.length > 1 ? "s" : ""}?
            </p>
            <p className="text-sm text-foreground-muted">
              Stores with items cannot be deleted.
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
            Delete {selectedStores.length} Store{selectedStores.length > 1 ? "s" : ""}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
