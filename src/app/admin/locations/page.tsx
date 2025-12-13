"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MapPin,
  Warehouse,
  Store,
  Building2,
  Box,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
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
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Skeleton,
  Alert,
  Input,
  Textarea,
} from "@/components/ui";
import {
  getLocations,
  createLocation,
  updateLocation,
  deactivateLocation,
  activateLocation,
} from "@/lib/actions/locations";
import type { Location, LocationType, LocationInsert, LocationUpdate } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

const LOCATION_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "warehouse", label: "Warehouse" },
  { value: "storefront", label: "Storefront" },
  { value: "storage", label: "Storage" },
  { value: "office", label: "Office" },
];

const LOCATION_TYPE_CREATE_OPTIONS = [
  { value: "warehouse", label: "Warehouse" },
  { value: "storefront", label: "Storefront" },
  { value: "storage", label: "Storage" },
  { value: "office", label: "Office" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const getLocationIcon = (type: LocationType | null) => {
  switch (type) {
    case "warehouse":
      return <Warehouse className="w-4 h-4" />;
    case "storefront":
      return <Store className="w-4 h-4" />;
    case "storage":
      return <Box className="w-4 h-4" />;
    case "office":
      return <Building2 className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
};

const getLocationTypeColor = (type: LocationType | null) => {
  switch (type) {
    case "warehouse":
      return "primary";
    case "storefront":
      return "success";
    case "storage":
      return "warning";
    case "office":
      return "info";
    default:
      return "neutral";
  }
};

interface LocationFormData {
  name: string;
  code: string;
  type: LocationType | "";
  address: string;
}

const initialFormData: LocationFormData = {
  name: "",
  code: "",
  type: "",
  address: "",
};

export default function LocationsPage() {
  // Data state
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingLocation, setEditingLocation] = React.useState<Location | null>(null);
  const [formData, setFormData] = React.useState<LocationFormData>(initialFormData);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [locationToDelete, setLocationToDelete] = React.useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getLocations();

      if (result.success) {
        setLocations(result.data);
      } else {
        setError(result.error || "Failed to load locations");
      }
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

  // Filter locations
  const filteredLocations = React.useMemo(() => {
    return locations.filter((loc) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          loc.name.toLowerCase().includes(query) ||
          loc.code.toLowerCase().includes(query) ||
          loc.address?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Type filter
      if (typeFilter && loc.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "active" && !loc.is_active) {
        return false;
      }
      if (statusFilter === "inactive" && loc.is_active) {
        return false;
      }

      return true;
    });
  }, [locations, searchQuery, typeFilter, statusFilter]);

  // Open create modal
  const handleCreate = () => {
    setEditingLocation(null);
    setFormData(initialFormData);
    setFormError(null);
    setModalOpen(true);
  };

  // Open edit modal
  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      code: location.code,
      type: location.type || "",
      address: location.address || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!formData.code.trim()) {
      setFormError("Code is required");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingLocation) {
        // Update
        const updateData: LocationUpdate = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          type: formData.type as LocationType || null,
          address: formData.address.trim() || null,
        };

        const result = await updateLocation(editingLocation.id, updateData);

        if (result.success) {
          setLocations((prev) =>
            prev.map((loc) => (loc.id === editingLocation.id ? result.data : loc))
          );
          setModalOpen(false);
        } else {
          setFormError(result.error);
        }
      } else {
        // Create
        const insertData: LocationInsert = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          type: formData.type as LocationType || null,
          address: formData.address.trim() || null,
        };

        const result = await createLocation(insertData);

        if (result.success) {
          setLocations((prev) => [...prev, result.data]);
          setModalOpen(false);
        } else {
          setFormError(result.error);
        }
      }
    } catch (err) {
      setFormError("An unexpected error occurred");
      console.error("Error saving location:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (location: Location) => {
    try {
      const result = location.is_active
        ? await deactivateLocation(location.id)
        : await activateLocation(location.id);

      if (result.success) {
        setLocations((prev) =>
          prev.map((loc) => (loc.id === location.id ? result.data : loc))
        );
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to update location status");
      console.error("Error toggling status:", err);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = (location: Location) => {
    setLocationToDelete(location);
    setDeleteModalOpen(true);
  };

  // Delete location (deactivate)
  const handleDelete = async () => {
    if (!locationToDelete) return;

    setIsDeleting(true);

    try {
      const result = await deactivateLocation(locationToDelete.id);

      if (result.success) {
        setLocations((prev) =>
          prev.map((loc) => (loc.id === locationToDelete.id ? result.data : loc))
        );
        setDeleteModalOpen(false);
        setLocationToDelete(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to deactivate location");
      console.error("Error deleting location:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("");
    setStatusFilter("");
  };

  const hasActiveFilters = searchQuery || typeFilter || statusFilter;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Locations
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Manage warehouses, storefronts, and storage areas
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
            onClick={handleCreate}
          >
            Add Location
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card variant="elevated">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <SearchInput
                placeholder="Search by name, code, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>

            {/* Type Filter */}
            <Select
              options={LOCATION_TYPE_OPTIONS}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
            />

            {/* Status Filter */}
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            />
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="w-4 h-4" />}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Error State */}
      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      {/* Locations Table */}
      <Card variant="elevated">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredLocations.length === 0 ? (
                  <TableEmpty
                    icon={<MapPin className="w-12 h-12" />}
                    title="No locations found"
                    description={
                      hasActiveFilters
                        ? "Try adjusting your filters"
                        : "Get started by adding your first location"
                    }
                    action={
                      hasActiveFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Plus className="w-4 h-4" />}
                          onClick={handleCreate}
                        >
                          Add Location
                        </Button>
                      )
                    }
                  />
                ) : (
                  filteredLocations.map((location) => (
                    <TableRow
                      key={location.id}
                      className={location.is_active ? "" : "opacity-60"}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${getLocationTypeColor(
                              location.type
                            )}-50`}
                          >
                            {getLocationIcon(location.type)}
                          </div>
                          <span className="font-medium text-foreground">
                            {location.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-neutral-100 px-2 py-1 rounded">
                          {location.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {location.type && (
                          <Badge
                            colorScheme={getLocationTypeColor(location.type) as "primary" | "success" | "warning" | "info" | "neutral"}
                            size="sm"
                          >
                            {location.type.charAt(0).toUpperCase() + location.type.slice(1)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground-muted text-sm max-w-xs truncate">
                        {location.address || "-"}
                      </TableCell>
                      <TableCell>
                        {location.is_active ? (
                          <Badge colorScheme="success" size="sm">
                            Active
                          </Badge>
                        ) : (
                          <Badge colorScheme="neutral" size="sm">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground-muted text-sm">
                        {formatDateTime(location.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={<Edit className="w-4 h-4" />}
                            aria-label="Edit location"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(location)}
                          />
                          <IconButton
                            icon={
                              location.is_active ? (
                                <ToggleRight className="w-4 h-4 text-success" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-neutral-400" />
                              )
                            }
                            aria-label={
                              location.is_active ? "Deactivate location" : "Activate location"
                            }
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(location)}
                          />
                          {location.is_active && (
                            <IconButton
                              icon={<Trash2 className="w-4 h-4 text-error" />}
                              aria-label="Delete location"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteConfirm(location)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardBody>

        {/* Results count */}
        {!isLoading && filteredLocations.length > 0 && (
          <div className="px-6 py-4 border-t border-neutral-100">
            <p className="text-sm text-foreground-muted">
              Showing {filteredLocations.length} of {locations.length} locations
            </p>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <ModalHeader showCloseButton onClose={() => setModalOpen(false)}>
          {editingLocation ? "Edit Location" : "Add New Location"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {formError && (
              <Alert status="error" variant="subtle">
                {formError}
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Name <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g., Main Warehouse"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Code <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g., WH-001"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
              />
              <p className="text-xs text-foreground-muted mt-1">
                Unique identifier for this location
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Type
              </label>
              <Select
                options={LOCATION_TYPE_CREATE_OPTIONS}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as LocationType })}
                placeholder="Select type..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Address
              </label>
              <Textarea
                placeholder="Full address (optional)"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSaving}
            disabled={isSaving}
          >
            {editingLocation ? "Save Changes" : "Create Location"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={() => setDeleteModalOpen(false)}>
          Deactivate Location
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <p className="text-foreground mb-2">
              Are you sure you want to deactivate{" "}
              <strong>{locationToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-foreground-muted">
              The location will be marked as inactive but can be reactivated later.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            Deactivate
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
