"use client";

import * as React from "react";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  RefreshCw,
  Target,
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
  Select,
  Textarea,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Skeleton,
  Alert,
  Switch,
} from "@/components/ui";
import {
  getProductionTargets,
  setProductionTarget,
  updateProductionTarget,
  deleteProductionTarget,
  bulkSetRecurringTargets,
  getCommissaryItems,
} from "@/lib/actions/commissary";
import type { ProductionTarget } from "@/lib/supabase/types";
import type { Item } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ============================================================================
// Types
// ============================================================================

interface TargetFormData {
  itemId: string;
  targetQuantity: string;
  targetDate: string;
  priority: string;
  isRecurring: boolean;
  dayOfWeek: string;
  notes: string;
}

interface TargetFormErrors {
  itemId?: string;
  targetQuantity?: string;
  targetDate?: string;
  priority?: string;
  dayOfWeek?: string;
  general?: string;
}

interface BulkFormData {
  itemId: string;
  targetQuantity: string;
  daysOfWeek: number[];
  priority: string;
  notes: string;
}

interface BulkFormErrors {
  itemId?: string;
  targetQuantity?: string;
  daysOfWeek?: string;
  priority?: string;
  general?: string;
}

const initialFormData: TargetFormData = {
  itemId: "",
  targetQuantity: "",
  targetDate: "",
  priority: "50",
  isRecurring: false,
  dayOfWeek: "",
  notes: "",
};

const initialBulkFormData: BulkFormData = {
  itemId: "",
  targetQuantity: "",
  daysOfWeek: [],
  priority: "50",
  notes: "",
};

// ============================================================================
// Helpers
// ============================================================================

function getTargetStatus(
  target: ProductionTarget
): "met" | "unmet" | "upcoming" {
  const today = new Date().toISOString().split("T")[0];

  if (target.is_recurring) {
    const todayDow = new Date().getDay();
    if (target.day_of_week === todayDow) {
      // For recurring targets on today's day, show as "upcoming"
      // since we don't have produced_today data on the target itself
      return "upcoming";
    }
    return "upcoming";
  }

  if (!target.target_date) return "upcoming";

  if (target.target_date > today) return "upcoming";
  if (target.target_date < today) return "unmet";

  // Today's target — show as upcoming (without production log join, we can't determine met/unmet)
  return "upcoming";
}

function getStatusBadge(status: "met" | "unmet" | "upcoming") {
  switch (status) {
    case "met":
      return (
        <Badge colorScheme="success" variant="subtle" size="sm">
          Met
        </Badge>
      );
    case "unmet":
      return (
        <Badge colorScheme="error" variant="subtle" size="sm">
          Unmet
        </Badge>
      );
    case "upcoming":
      return (
        <Badge colorScheme="primary" variant="subtle" size="sm">
          Upcoming
        </Badge>
      );
  }
}

// ============================================================================
// Component
// ============================================================================

export default function ProductionTargetsPage() {
  // Data state
  const [targets, setTargets] = React.useState<ProductionTarget[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [recurringFilter, setRecurringFilter] = React.useState<
    "all" | "recurring" | "oneoff"
  >("all");

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [editingTarget, setEditingTarget] =
    React.useState<ProductionTarget | null>(null);
  const [targetToDelete, setTargetToDelete] =
    React.useState<ProductionTarget | null>(null);

  // Form state
  const [formData, setFormData] =
    React.useState<TargetFormData>(initialFormData);
  const [formErrors, setFormErrors] = React.useState<TargetFormErrors>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Bulk form state
  const [bulkFormData, setBulkFormData] =
    React.useState<BulkFormData>(initialBulkFormData);
  const [bulkFormErrors, setBulkFormErrors] = React.useState<BulkFormErrors>(
    {}
  );
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);

  // Item lookup map
  const itemMap = React.useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  // Item options for Select
  const itemOptions = React.useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.sku})`,
      })),
    [items]
  );

  // Day of week options for Select
  const dayOfWeekOptions = DAY_NAMES.map((name, i) => ({
    value: String(i),
    label: name,
  }));

  // ============================================================================
  // Fetch data
  // ============================================================================

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [targetsResult, itemsResult] = await Promise.all([
        getProductionTargets({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          isRecurring:
            recurringFilter === "all"
              ? undefined
              : recurringFilter === "recurring",
        }),
        getCommissaryItems(),
      ]);

      if (!targetsResult.success) {
        setError(targetsResult.error || "Failed to load production targets");
        return;
      }

      if (!itemsResult.success) {
        setError(itemsResult.error || "Failed to load commissary items");
        return;
      }

      setTargets(targetsResult.data);
      setItems(itemsResult.data);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, recurringFilter]);

  // Initial fetch
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================================
  // Filtered targets
  // ============================================================================

  const filteredTargets = React.useMemo(() => {
    let result = [...targets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((target) => {
        const item = itemMap.get(target.item_id);
        if (!item) return false;
        return (
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          target.notes?.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [targets, searchQuery, itemMap]);

  // ============================================================================
  // Modal handlers
  // ============================================================================

  const handleOpenAddModal = () => {
    setEditingTarget(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (target: ProductionTarget) => {
    setEditingTarget(target);
    setFormData({
      itemId: target.item_id,
      targetQuantity: String(target.target_quantity),
      targetDate: target.target_date ?? "",
      priority: String(target.priority),
      isRecurring: target.is_recurring,
      dayOfWeek: target.day_of_week !== null ? String(target.day_of_week) : "",
      notes: target.notes ?? "",
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setEditingTarget(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleOpenDeleteModal = (target: ProductionTarget) => {
    setTargetToDelete(target);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTargetToDelete(null);
  };

  const handleOpenBulkModal = () => {
    setBulkFormData(initialBulkFormData);
    setBulkFormErrors({});
    setIsBulkModalOpen(true);
  };

  const handleCloseBulkModal = () => {
    setIsBulkModalOpen(false);
    setBulkFormData(initialBulkFormData);
    setBulkFormErrors({});
  };

  // ============================================================================
  // Form validation
  // ============================================================================

  const validateForm = (): boolean => {
    const errors: TargetFormErrors = {};

    if (!formData.itemId) {
      errors.itemId = "Please select an item";
    }

    const qty = parseFloat(formData.targetQuantity);
    if (!formData.targetQuantity || isNaN(qty) || qty <= 0) {
      errors.targetQuantity = "Quantity must be greater than 0";
    } else if (qty > 9999.999) {
      errors.targetQuantity = "Quantity must be 9999.999 or less";
    }

    const priority = parseInt(formData.priority, 10);
    if (isNaN(priority) || priority < 1 || priority > 100) {
      errors.priority = "Priority must be between 1 and 100";
    }

    if (formData.isRecurring) {
      if (formData.dayOfWeek === "") {
        errors.dayOfWeek = "Please select a day of the week";
      }
    } else {
      if (!formData.targetDate) {
        errors.targetDate = "Please select a date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBulkForm = (): boolean => {
    const errors: BulkFormErrors = {};

    if (!bulkFormData.itemId) {
      errors.itemId = "Please select an item";
    }

    const qty = parseFloat(bulkFormData.targetQuantity);
    if (!bulkFormData.targetQuantity || isNaN(qty) || qty <= 0) {
      errors.targetQuantity = "Quantity must be greater than 0";
    } else if (qty > 9999.999) {
      errors.targetQuantity = "Quantity must be 9999.999 or less";
    }

    const priority = parseInt(bulkFormData.priority, 10);
    if (isNaN(priority) || priority < 1 || priority > 100) {
      errors.priority = "Priority must be between 1 and 100";
    }

    if (bulkFormData.daysOfWeek.length === 0) {
      errors.daysOfWeek = "Please select at least one day";
    }

    setBulkFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // Form submit handlers
  // ============================================================================

  const handleFormSubmit = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (editingTarget) {
        const result = await updateProductionTarget(editingTarget.id, {
          targetQuantity: parseFloat(formData.targetQuantity),
          targetDate: formData.isRecurring ? null : formData.targetDate || null,
          priority: parseInt(formData.priority, 10),
          isRecurring: formData.isRecurring,
          dayOfWeek: formData.isRecurring
            ? parseInt(formData.dayOfWeek, 10)
            : null,
          notes: formData.notes.trim() || null,
        });

        if (result.success) {
          await fetchData();
          handleCloseAddEditModal();
        } else {
          setFormErrors({ general: result.error });
        }
      } else {
        const result = await setProductionTarget({
          itemId: formData.itemId,
          targetQuantity: parseFloat(formData.targetQuantity),
          targetDate: formData.isRecurring
            ? undefined
            : formData.targetDate || undefined,
          priority: parseInt(formData.priority, 10),
          isRecurring: formData.isRecurring,
          dayOfWeek: formData.isRecurring
            ? parseInt(formData.dayOfWeek, 10)
            : undefined,
          notes: formData.notes.trim() || undefined,
        });

        if (result.success) {
          await fetchData();
          handleCloseAddEditModal();
        } else {
          setFormErrors({ general: result.error });
        }
      }
    } catch (err) {
      setFormErrors({ general: "An unexpected error occurred" });
      console.error("Error saving target:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!targetToDelete) return;

    setIsDeleting(true);

    try {
      const result = await deleteProductionTarget(targetToDelete.id);

      if (result.success) {
        await fetchData();
        handleCloseDeleteModal();
      } else {
        setError(result.error);
        handleCloseDeleteModal();
      }
    } catch (err) {
      setError("Failed to delete target");
      console.error("Error deleting target:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!validateBulkForm()) return;

    setIsBulkSaving(true);

    try {
      const result = await bulkSetRecurringTargets([
        {
          itemId: bulkFormData.itemId,
          targetQuantity: parseFloat(bulkFormData.targetQuantity),
          daysOfWeek: bulkFormData.daysOfWeek,
          priority: parseInt(bulkFormData.priority, 10),
          notes: bulkFormData.notes.trim() || undefined,
        },
      ]);

      if (result.success) {
        await fetchData();
        handleCloseBulkModal();
      } else {
        setBulkFormErrors({ general: result.error });
      }
    } catch (err) {
      setBulkFormErrors({ general: "An unexpected error occurred" });
      console.error("Error setting recurring targets:", err);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // ============================================================================
  // Bulk day toggle
  // ============================================================================

  const handleBulkDayToggle = (day: number, checked: boolean) => {
    if (checked) {
      setBulkFormData({
        ...bulkFormData,
        daysOfWeek: [...bulkFormData.daysOfWeek, day].sort(),
      });
    } else {
      setBulkFormData({
        ...bulkFormData,
        daysOfWeek: bulkFormData.daysOfWeek.filter((d) => d !== day),
      });
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Production Targets
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Manage daily and recurring production targets
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
            variant="outline"
            leftIcon={<Calendar className="w-4 h-4" />}
            onClick={handleOpenBulkModal}
          >
            Set Recurring
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAddModal}
          >
            Add Target
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 max-w-md">
          <SearchInput
            placeholder="Search by item name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <div className="flex items-center gap-3">
          <FormControl className="w-40">
            <FormLabel className="text-xs">From</FormLabel>
            <Input
              type="date"
              size="sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </FormControl>
          <FormControl className="w-40">
            <FormLabel className="text-xs">To</FormLabel>
            <Input
              type="date"
              size="sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </FormControl>
          <FormControl className="w-40">
            <FormLabel className="text-xs">Type</FormLabel>
            <Select
              size="sm"
              options={[
                { value: "all", label: "All" },
                { value: "recurring", label: "Recurring" },
                { value: "oneoff", label: "One-off" },
              ]}
              value={recurringFilter}
              onChange={(val) =>
                setRecurringFilter(val as "all" | "recurring" | "oneoff")
              }
            />
          </FormControl>
        </div>
      </div>

      {/* Targets Table */}
      <Card variant="elevated" className="overflow-hidden">
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="w-28">Target Qty</TableHead>
                <TableHead className="w-40">Date / Schedule</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-24">Status</TableHead>
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
              ) : filteredTargets.length === 0 ? (
                <TableEmpty
                  title={
                    searchQuery
                      ? "No targets found"
                      : "No production targets yet"
                  }
                  description={
                    searchQuery
                      ? "Try adjusting your search or filters"
                      : "Add your first production target to start tracking"
                  }
                  icon={<Target className="w-12 h-12" />}
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
                        Add Target
                      </Button>
                    )
                  }
                  colSpan={7}
                />
              ) : (
                filteredTargets.map((target) => {
                  const item = itemMap.get(target.item_id);
                  const status = getTargetStatus(target);

                  return (
                    <TableRow key={target.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              {item?.name ?? "Unknown Item"}
                            </span>
                            {item?.sku && (
                              <p className="text-xs text-foreground-muted">
                                {item.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">
                          {target.target_quantity}
                        </span>
                        {item?.unit && (
                          <span className="text-xs text-foreground-muted ml-1">
                            {item.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {target.is_recurring ? (
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 text-foreground-muted" />
                            <span className="text-sm">
                              {target.day_of_week !== null
                                ? DAY_NAMES[target.day_of_week]
                                : "Every day"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-foreground-muted" />
                            <span className="text-sm">
                              {target.target_date ?? "-"}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-full max-w-[60px] bg-neutral-200 rounded-full h-1.5">
                            <div
                              className={cn(
                                "h-1.5 rounded-full",
                                target.priority >= 75
                                  ? "bg-error"
                                  : target.priority >= 50
                                    ? "bg-warning"
                                    : "bg-success"
                              )}
                              style={{
                                width: `${target.priority}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-foreground-muted">
                            {target.priority}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {target.is_recurring ? (
                          <Badge
                            colorScheme="primary"
                            variant="subtle"
                            size="sm"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Recurring
                          </Badge>
                        ) : (
                          <Badge
                            colorScheme="warning"
                            variant="subtle"
                            size="sm"
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Target
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={<Edit className="w-4 h-4" />}
                            aria-label="Edit target"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(target)}
                          />
                          <IconButton
                            icon={<Trash2 className="w-4 h-4" />}
                            aria-label="Delete target"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeleteModal(target)}
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

      {/* Footer */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            Showing {filteredTargets.length} of {targets.length} targets
          </p>
        </div>
      )}

      {/* ================================================================== */}
      {/* Add/Edit Target Modal                                              */}
      {/* ================================================================== */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        size="md"
      >
        <ModalHeader showCloseButton onClose={handleCloseAddEditModal}>
          {editingTarget ? "Edit Target" : "Add Target"}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {formErrors.general && (
            <Alert status="error" variant="subtle">
              {formErrors.general}
            </Alert>
          )}

          <FormControl isRequired isInvalid={!!formErrors.itemId}>
            <FormLabel>Commissary Item</FormLabel>
            <Select
              options={itemOptions}
              value={formData.itemId}
              onChange={(val) => setFormData({ ...formData, itemId: val })}
              placeholder="Select an item..."
              isDisabled={!!editingTarget}
            />
            {formErrors.itemId && (
              <FormErrorMessage>{formErrors.itemId}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isRequired isInvalid={!!formErrors.targetQuantity}>
            <FormLabel>Target Quantity</FormLabel>
            <Input
              type="number"
              placeholder="e.g. 100"
              value={formData.targetQuantity}
              onChange={(e) =>
                setFormData({ ...formData, targetQuantity: e.target.value })
              }
              min={0.001}
              max={9999.999}
              step="any"
            />
            {formErrors.targetQuantity && (
              <FormErrorMessage>{formErrors.targetQuantity}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!formErrors.priority}>
            <FormLabel>Priority (1-100)</FormLabel>
            <Input
              type="number"
              placeholder="50"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              min={1}
              max={100}
            />
            {formErrors.priority && (
              <FormErrorMessage>{formErrors.priority}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl>
            <div className="flex items-center justify-between">
              <FormLabel className="mb-0">Recurring</FormLabel>
              <Switch
                isChecked={formData.isRecurring}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isRecurring: e.target.checked,
                    targetDate: e.target.checked ? "" : formData.targetDate,
                    dayOfWeek: e.target.checked ? formData.dayOfWeek : "",
                  })
                }
              />
            </div>
          </FormControl>

          {formData.isRecurring ? (
            <FormControl isRequired isInvalid={!!formErrors.dayOfWeek}>
              <FormLabel>Day of Week</FormLabel>
              <Select
                options={dayOfWeekOptions}
                value={formData.dayOfWeek}
                onChange={(val) => setFormData({ ...formData, dayOfWeek: val })}
                placeholder="Select a day..."
              />
              {formErrors.dayOfWeek && (
                <FormErrorMessage>{formErrors.dayOfWeek}</FormErrorMessage>
              )}
            </FormControl>
          ) : (
            <FormControl isRequired isInvalid={!!formErrors.targetDate}>
              <FormLabel>Target Date</FormLabel>
              <Input
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
              />
              {formErrors.targetDate && (
                <FormErrorMessage>{formErrors.targetDate}</FormErrorMessage>
              )}
            </FormControl>
          )}

          <FormControl>
            <FormLabel>Notes</FormLabel>
            <Textarea
              placeholder="Optional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              maxLength={500}
            />
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
            {editingTarget ? "Save Changes" : "Add Target"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ================================================================== */}
      {/* Delete Confirmation Modal                                          */}
      {/* ================================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={handleCloseDeleteModal}>
          Delete Target
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <p className="text-foreground mb-2">
              Are you sure you want to delete this production target
              {targetToDelete && (
                <>
                  {" "}
                  for{" "}
                  <strong>
                    &ldquo;
                    {itemMap.get(targetToDelete.item_id)?.name ?? "Unknown"}
                    &rdquo;
                  </strong>
                </>
              )}
              ?
            </p>
            {targetToDelete?.is_recurring && (
              <p className="text-sm text-foreground-muted">
                This is a recurring target for{" "}
                {targetToDelete.day_of_week !== null
                  ? DAY_NAMES[targetToDelete.day_of_week]
                  : "every day"}
                .
              </p>
            )}
            <p className="text-sm text-foreground-muted mt-1">
              This action cannot be undone.
            </p>
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
            disabled={isDeleting}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* ================================================================== */}
      {/* Bulk Recurring Modal                                               */}
      {/* ================================================================== */}
      <Modal isOpen={isBulkModalOpen} onClose={handleCloseBulkModal} size="md">
        <ModalHeader showCloseButton onClose={handleCloseBulkModal}>
          Set Recurring Targets
        </ModalHeader>
        <ModalBody className="space-y-4">
          {bulkFormErrors.general && (
            <Alert status="error" variant="subtle">
              {bulkFormErrors.general}
            </Alert>
          )}

          <FormControl isRequired isInvalid={!!bulkFormErrors.itemId}>
            <FormLabel>Commissary Item</FormLabel>
            <Select
              options={itemOptions}
              value={bulkFormData.itemId}
              onChange={(val) =>
                setBulkFormData({ ...bulkFormData, itemId: val })
              }
              placeholder="Select an item..."
            />
            {bulkFormErrors.itemId && (
              <FormErrorMessage>{bulkFormErrors.itemId}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isRequired isInvalid={!!bulkFormErrors.targetQuantity}>
            <FormLabel>Target Quantity</FormLabel>
            <Input
              type="number"
              placeholder="e.g. 100"
              value={bulkFormData.targetQuantity}
              onChange={(e) =>
                setBulkFormData({
                  ...bulkFormData,
                  targetQuantity: e.target.value,
                })
              }
              min={0.001}
              max={9999.999}
              step="any"
            />
            {bulkFormErrors.targetQuantity && (
              <FormErrorMessage>
                {bulkFormErrors.targetQuantity}
              </FormErrorMessage>
            )}
          </FormControl>

          <FormControl isRequired isInvalid={!!bulkFormErrors.daysOfWeek}>
            <FormLabel>Days of Week</FormLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              {DAY_ABBREVS.map((abbrev, i) => (
                <Checkbox
                  key={i}
                  isChecked={bulkFormData.daysOfWeek.includes(i)}
                  onChange={(e) => handleBulkDayToggle(i, e.target.checked)}
                  label={abbrev}
                  size="sm"
                />
              ))}
            </div>
            {bulkFormErrors.daysOfWeek && (
              <FormErrorMessage>{bulkFormErrors.daysOfWeek}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl isInvalid={!!bulkFormErrors.priority}>
            <FormLabel>Priority (1-100)</FormLabel>
            <Input
              type="number"
              placeholder="50"
              value={bulkFormData.priority}
              onChange={(e) =>
                setBulkFormData({ ...bulkFormData, priority: e.target.value })
              }
              min={1}
              max={100}
            />
            {bulkFormErrors.priority && (
              <FormErrorMessage>{bulkFormErrors.priority}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl>
            <FormLabel>Notes</FormLabel>
            <Textarea
              placeholder="Optional notes..."
              value={bulkFormData.notes}
              onChange={(e) =>
                setBulkFormData({ ...bulkFormData, notes: e.target.value })
              }
              rows={3}
              maxLength={500}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleCloseBulkModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleBulkSubmit}
            isLoading={isBulkSaving}
            disabled={isBulkSaving}
          >
            Create Recurring Targets
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
