"use client";

import * as React from "react";
import {
  ChefHat,
  Target,
  TrendingUp,
  Package,
  Plus,
  AlertCircle,
  CheckCircle2,
  Star,
} from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Progress,
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Skeleton,
  Alert,
  Switch,
} from "@/components/ui";
import {
  getCommissaryDashboardData,
  getProductionRecommendations,
  getProductionLogs,
  submitProduction,
  getCommissaryItems,
  togglePriorityFlag,
} from "@/lib/actions/commissary";
import type { ProductionRecommendation, Item } from "@/lib/supabase/types";
import type {
  CommissaryDashboardData,
  ProductionLogWithDetails,
  SubmitProductionInput,
} from "@/lib/actions/commissary";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Priority helpers
// ---------------------------------------------------------------------------

type PriorityLevel = "CRITICAL" | "URGENT" | "HIGH" | "NORMAL";

function getPriorityLevel(daysOfStock: number | null): PriorityLevel {
  if (daysOfStock === null || daysOfStock <= 0) return "CRITICAL";
  if (daysOfStock <= 1) return "URGENT";
  if (daysOfStock <= 3) return "HIGH";
  return "NORMAL";
}

function getPriorityBadgeColor(
  level: PriorityLevel
): "error" | "warning" | "info" | "neutral" {
  switch (level) {
    case "CRITICAL":
      return "error";
    case "URGENT":
      return "warning";
    case "HIGH":
      return "info";
    case "NORMAL":
      return "neutral";
  }
}

// ---------------------------------------------------------------------------
// Production form types
// ---------------------------------------------------------------------------

interface ProductionFormData {
  itemId: string;
  quantityProduced: string;
  wasteQuantity: string;
  wasteReason: string;
  notes: string;
  showWaste: boolean;
}

const initialFormData: ProductionFormData = {
  itemId: "",
  quantityProduced: "",
  wasteQuantity: "",
  wasteReason: "",
  notes: "",
  showWaste: false,
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CommissaryPage() {
  // Data state
  const [dashboardData, setDashboardData] =
    React.useState<CommissaryDashboardData | null>(null);
  const [recommendations, setRecommendations] = React.useState<
    ProductionRecommendation[]
  >([]);
  const [productionLogs, setProductionLogs] = React.useState<
    ProductionLogWithDetails[]
  >([]);
  const [commissaryItems, setCommissaryItems] = React.useState<Item[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] =
    React.useState<ProductionFormData>(initialFormData);
  const [formErrors, setFormErrors] = React.useState<
    Partial<Record<keyof ProductionFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Priority toggle state
  const [togglingPriority, setTogglingPriority] = React.useState<Set<string>>(new Set());

  // ---------- Data fetching ----------

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];

      const [dashResult, recsResult, logsResult, itemsResult] =
        await Promise.all([
          getCommissaryDashboardData(),
          getProductionRecommendations(),
          getProductionLogs({ page: 1, pageSize: 10, dateFrom: today }),
          getCommissaryItems(),
        ]);

      if (!dashResult.success) {
        setError(dashResult.error || "Failed to load dashboard data");
        return;
      }

      setDashboardData(dashResult.data);
      setRecommendations(recsResult.success ? recsResult.data : []);
      setProductionLogs(
        logsResult.success ? logsResult.data.data : []
      );
      setCommissaryItems(itemsResult.success ? itemsResult.data : []);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error fetching commissary data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Modal handlers ----------

  const handleOpenModal = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setFormErrors({});
    setSubmitError(null);
  };

  // ---------- Form validation & submission ----------

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ProductionFormData, string>> = {};

    if (!formData.itemId) {
      errors.itemId = "Please select an item";
    }

    const qty = parseFloat(formData.quantityProduced);
    if (!formData.quantityProduced || isNaN(qty) || qty <= 0) {
      errors.quantityProduced = "Quantity must be greater than 0";
    } else if (qty > 9999.999) {
      errors.quantityProduced = "Quantity cannot exceed 9999.999";
    }

    if (formData.showWaste && formData.wasteQuantity) {
      const waste = parseFloat(formData.wasteQuantity);
      if (isNaN(waste) || waste < 0) {
        errors.wasteQuantity = "Waste quantity must be 0 or greater";
      }
      if (waste > 0 && !formData.wasteReason.trim()) {
        errors.wasteReason = "Please provide a reason for waste";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const input: SubmitProductionInput = {
        itemId: formData.itemId,
        quantityProduced: parseFloat(formData.quantityProduced),
      };

      if (formData.showWaste && formData.wasteQuantity) {
        input.wasteQuantity = parseFloat(formData.wasteQuantity);
        if (formData.wasteReason.trim()) {
          input.wasteReason = formData.wasteReason.trim();
        }
      }

      if (formData.notes.trim()) {
        input.notes = formData.notes.trim();
      }

      const result = await submitProduction(input);

      if (result.success) {
        handleCloseModal();
        await fetchData();
      } else {
        setSubmitError(result.error || "Failed to submit production");
      }
    } catch (err) {
      setSubmitError("An unexpected error occurred");
      console.error("Error submitting production:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Priority toggle handler ----------

  const handleTogglePriority = async (itemId: string, currentValue: boolean) => {
    setTogglingPriority(prev => new Set(prev).add(itemId));
    try {
      const result = await togglePriorityFlag(itemId, !currentValue);
      if (result.success) {
        await fetchData();
      } else {
        setError(result.error || "Failed to update priority");
      }
    } finally {
      setTogglingPriority(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // ---------- Derived data for priority items ----------

  const priorityItems = React.useMemo(() => {
    return recommendations
      .filter((r) => r.is_priority || r.has_explicit_target || r.suggested_quantity > 0)
      .sort((a, b) => {
        // Starred/priority items always first
        if (a.is_priority !== b.is_priority) {
          return a.is_priority ? -1 : 1;
        }
        // Explicit targets next
        if (a.has_explicit_target !== b.has_explicit_target) {
          return a.has_explicit_target ? -1 : 1;
        }
        return b.priority - a.priority;
      });
  }, [recommendations]);

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Commissary Dashboard
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            Production tracking and target management
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenModal}
        >
          Log Production
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Commissary Items */}
        <Card variant="elevated" size="sm">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Total Items</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.totalCommissaryItems ?? 0}
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Items Below Target */}
        <Card variant="elevated" size="sm">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-error-light rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Below Target</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.itemsBelowTarget ?? 0}
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Produced Today */}
        <Card variant="elevated" size="sm">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Produced Today</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.producedToday ?? 0}
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Target Completion */}
        <Card variant="elevated" size="sm">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-info-light rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-foreground-muted">
                  Target Completion
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.targetCompletionPercent ?? 0}%
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Production Progress Today */}
      <Card variant="elevated">
        <CardHeader
          title="Production Progress Today"
          subtitle="Overall target completion across all commissary items"
        />
        <CardBody>
          {isLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Overall Progress</span>
                <span className="font-medium text-foreground">
                  {dashboardData?.targetCompletionPercent ?? 0}%
                </span>
              </div>
              <Progress
                value={dashboardData?.targetCompletionPercent ?? 0}
                max={100}
                size="lg"
                colorScheme={
                  (dashboardData?.targetCompletionPercent ?? 0) >= 100
                    ? "success"
                    : (dashboardData?.targetCompletionPercent ?? 0) >= 50
                    ? "primary"
                    : "warning"
                }
                aria-label="Overall production progress"
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Priority Items */}
      <Card variant="elevated">
        <CardHeader
          title="Priority Items"
          subtitle="Items that need production today, sorted by priority"
          action={
            <Badge colorScheme="neutral" variant="subtle" size="sm">
              {priorityItems.length} items
            </Badge>
          }
        />
        <CardBody>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : priorityItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="font-medium text-foreground">All caught up!</p>
              <p className="text-sm text-foreground-muted">
                No items require production right now.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {priorityItems.map((item) => {
                const priority = getPriorityLevel(item.days_of_stock);
                const isOverTarget =
                  item.target_today > 0 &&
                  item.produced_today >= item.target_today;
                const progressPercent =
                  item.target_today > 0
                    ? Math.round(
                        (item.produced_today / item.target_today) * 100
                      )
                    : 0;
                const progressColor = isOverTarget ? "success" : "primary";

                return (
                  <div
                    key={item.item_id}
                    className={cn(
                      "p-4 rounded-lg",
                      item.has_explicit_target
                        ? "border-2 border-solid border-border"
                        : "border-2 border-dashed border-border"
                    )}
                  >
                    {/* Item header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePriority(item.item_id, item.is_priority)}
                          disabled={togglingPriority.has(item.item_id)}
                          className="flex-shrink-0 p-0.5 rounded hover:bg-background-secondary transition-colors disabled:opacity-50"
                          title={item.is_priority ? "Unstar essential item" : "Star as essential item"}
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              item.is_priority
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-foreground-muted"
                            )}
                          />
                        </button>
                        <span className="font-medium text-foreground">
                          {item.name}
                        </span>
                        {item.is_priority && (
                          <Badge
                            colorScheme="warning"
                            variant="subtle"
                            size="sm"
                          >
                            ESSENTIAL
                          </Badge>
                        )}
                        {item.has_explicit_target ? (
                          <Badge
                            colorScheme="info"
                            variant="subtle"
                            size="sm"
                          >
                            Target
                          </Badge>
                        ) : (
                          <Badge
                            colorScheme="neutral"
                            variant="subtle"
                            size="sm"
                          >
                            Suggested
                          </Badge>
                        )}
                        <Badge
                          colorScheme={getPriorityBadgeColor(priority)}
                          variant="subtle"
                          size="sm"
                        >
                          {priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-foreground-muted">
                        Stock:{" "}
                        <span className="font-medium text-foreground">
                          {item.current_stock} {item.unit}
                        </span>
                        {item.days_of_stock !== null && (
                          <span className="ml-1">
                            ({item.days_of_stock.toFixed(1)}d)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground-muted">
                          {item.produced_today} / {item.target_today}{" "}
                          {item.unit}
                        </span>
                        {isOverTarget ? (
                          <span className="font-medium text-success flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            DONE
                          </span>
                        ) : (
                          <span className="text-foreground-muted">
                            {progressPercent}%
                          </span>
                        )}
                      </div>
                      <Progress
                        value={Math.min(progressPercent, 100)}
                        max={100}
                        size="md"
                        colorScheme={progressColor}
                        aria-label={`Production progress for ${item.name}`}
                      />
                      {isOverTarget && progressPercent > 100 && (
                        <div className="text-xs text-success">
                          {item.produced_today}/{item.target_today} produced
                          (overflow +
                          {item.produced_today - item.target_today}{" "}
                          {item.unit})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* All Commissary Items */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader
          title="All Commissary Items"
          subtitle="Star essential items to pin them to the top of the priority list"
          action={
            <Badge colorScheme="neutral" variant="subtle" size="sm">
              {commissaryItems.length} items
            </Badge>
          }
        />
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : commissaryItems.length === 0 ? (
                <TableEmpty
                  title="No commissary items"
                  description="Mark items as commissary from the Items page"
                  icon={<ChefHat className="w-12 h-12" />}
                  colSpan={5}
                />
              ) : (
                [...commissaryItems]
                  .sort((a, b) => {
                    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleTogglePriority(item.id, item.is_priority)}
                          disabled={togglingPriority.has(item.id)}
                          className="flex-shrink-0 p-1 rounded hover:bg-background-secondary transition-colors disabled:opacity-50"
                          title={item.is_priority ? "Unstar essential item" : "Star as essential item"}
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              item.is_priority
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-foreground-muted"
                            )}
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </TableCell>
                      <TableCell className="text-foreground-muted">
                        {item.sku || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {item.current_stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground-muted">
                        {item.unit}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Today's Production Log */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader
          title="Today's Production Log"
          subtitle="Recent production events recorded today"
          action={
            <div className="flex items-center gap-1 text-foreground-muted">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">{productionLogs.length} entries</span>
            </div>
          }
        />
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Waste</TableHead>
                <TableHead>Logged By</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : productionLogs.length === 0 ? (
                <TableEmpty
                  title="No production logged today"
                  description="Use the 'Log Production' button to record your first entry"
                  icon={<ChefHat className="w-12 h-12" />}
                  colSpan={5}
                />
              ) : (
                productionLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {log.item_name}
                        </span>
                        {log.item_sku && (
                          <span className="text-xs text-foreground-muted">
                            {log.item_sku}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {log.quantity_produced}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.waste_quantity > 0 ? (
                        <Badge colorScheme="warning" variant="subtle" size="sm">
                          {log.waste_quantity}
                          {log.waste_reason && (
                            <span className="ml-1 text-xs">
                              ({log.waste_reason})
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <span className="text-foreground-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell>{log.user_name}</TableCell>
                    <TableCell className="text-foreground-muted">
                      {new Date(log.event_timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Log Production Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="md">
        <ModalHeader showCloseButton onClose={handleCloseModal}>
          Log Production
        </ModalHeader>
        <ModalBody className="space-y-4">
          {submitError && (
            <Alert status="error" variant="subtle">
              {submitError}
            </Alert>
          )}

          {/* Select item */}
          <FormControl isRequired isInvalid={!!formErrors.itemId}>
            <FormLabel>Commissary Item</FormLabel>
            <Select
              options={commissaryItems.map((item) => ({
                value: item.id,
                label: `${item.name}${item.sku ? ` (${item.sku})` : ""}`,
              }))}
              value={formData.itemId}
              onChange={(value) =>
                setFormData({ ...formData, itemId: value })
              }
              placeholder="Select an item..."
            />
            {formErrors.itemId && (
              <FormErrorMessage>{formErrors.itemId}</FormErrorMessage>
            )}
          </FormControl>

          {/* Quantity */}
          <FormControl isRequired isInvalid={!!formErrors.quantityProduced}>
            <FormLabel>Quantity Produced</FormLabel>
            <Input
              type="number"
              placeholder="0"
              min={0}
              step="any"
              value={formData.quantityProduced}
              onChange={(e) =>
                setFormData({ ...formData, quantityProduced: e.target.value })
              }
            />
            {formErrors.quantityProduced && (
              <FormErrorMessage>
                {formErrors.quantityProduced}
              </FormErrorMessage>
            )}
          </FormControl>

          {/* Waste toggle */}
          <div className="pt-2">
            <Switch
              isChecked={formData.showWaste}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  showWaste: e.target.checked,
                  wasteQuantity: e.target.checked
                    ? formData.wasteQuantity
                    : "",
                  wasteReason: e.target.checked ? formData.wasteReason : "",
                })
              }
              label="Record waste"
              size="sm"
            />
          </div>

          {/* Waste section */}
          {formData.showWaste && (
            <div className="space-y-4 pl-4 border-l-2 border-border">
              <FormControl isInvalid={!!formErrors.wasteQuantity}>
                <FormLabel>Waste Quantity</FormLabel>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  step="any"
                  value={formData.wasteQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wasteQuantity: e.target.value,
                    })
                  }
                />
                {formErrors.wasteQuantity && (
                  <FormErrorMessage>
                    {formErrors.wasteQuantity}
                  </FormErrorMessage>
                )}
              </FormControl>

              <FormControl isInvalid={!!formErrors.wasteReason}>
                <FormLabel>Waste Reason</FormLabel>
                <Input
                  placeholder="e.g. Overcooked, expired ingredients..."
                  value={formData.wasteReason}
                  onChange={(e) =>
                    setFormData({ ...formData, wasteReason: e.target.value })
                  }
                />
                {formErrors.wasteReason && (
                  <FormErrorMessage>
                    {formErrors.wasteReason}
                  </FormErrorMessage>
                )}
              </FormControl>
            </div>
          )}

          {/* Notes */}
          <FormControl>
            <FormLabel>Notes (optional)</FormLabel>
            <Textarea
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            leftIcon={<ChefHat className="w-4 h-4" />}
          >
            Submit Production
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
