"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Plus,
  Minus,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  Check,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  IconButton,
  Textarea,
  Select,
  Badge,
  Alert,
  Modal,
  ModalBody,
  Spinner,
  Skeleton,
} from "@/components/ui";
import { StockLevelBadge } from "@/components/ui";
import { ItemImage } from "@/components/items";
import { getItemById, getLocations } from "@/lib/actions";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import type { Item, Location, TransactionType as DBTransactionType } from "@/lib/supabase/types";
import { getStockLevel } from "@/lib/utils";

type TransactionType = "check_in" | "check_out" | "transfer" | "adjustment";

function TransactionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { queueTransaction, isOnline } = useSyncQueue();

  const itemId = searchParams.get("itemId");
  const typeParam = searchParams.get("type") as TransactionType | null;

  const [transactionType, setTransactionType] = React.useState<TransactionType>(
    typeParam || "check_in"
  );
  const [quantity, setQuantity] = React.useState(1);
  const [quantityInput, setQuantityInput] = React.useState("1");
  const [selectedLocation, setSelectedLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Quantity validation constants
  const MAX_QUANTITY = 9999.999;
  const DECIMAL_PLACES = 3;

  // Real data state
  const [item, setItem] = React.useState<Item | null>(null);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Fetch item and locations on mount
  React.useEffect(() => {
    async function fetchData() {
      if (!itemId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        // Fetch item and locations in parallel
        const [itemResult, locationsResult] = await Promise.all([
          getItemById(itemId),
          getLocations(true), // Only active locations
        ]);

        if (itemResult.success) {
          setItem(itemResult.data);
        } else {
          setLoadError(itemResult.error);
        }

        if (locationsResult.success) {
          setLocations(locationsResult.data);
        }
      } catch (err) {
        setLoadError("Failed to load item data");
        console.error("Load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [itemId]);

  const stockLevel = item
    ? getStockLevel(item.current_stock, item.min_stock ?? 0, item.max_stock ?? 100)
    : "normal";

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  const transactionTypes = [
    {
      value: "check_in",
      label: "Check In",
      description: "Add items to inventory",
      icon: Plus,
      color: "text-success",
      bgColor: "bg-success-light",
    },
    {
      value: "check_out",
      label: "Check Out",
      description: "Remove items from inventory",
      icon: Minus,
      color: "text-error",
      bgColor: "bg-error-light",
    },
    {
      value: "transfer",
      label: "Transfer",
      description: "Move between locations",
      icon: MapPin,
      color: "text-info",
      bgColor: "bg-info-light",
    },
    {
      value: "adjustment",
      label: "Adjustment",
      description: "Correct stock count",
      icon: FileText,
      color: "text-warning",
      bgColor: "bg-warning-light",
    },
  ];

  // Validate quantity value
  const validateQuantity = (value: number): string | null => {
    if (isNaN(value) || value <= 0) {
      return "Quantity must be greater than 0";
    }
    if (value > MAX_QUANTITY) {
      return `Quantity cannot exceed ${MAX_QUANTITY}`;
    }
    // Check decimal places
    const decimalPart = value.toString().split(".")[1];
    if (decimalPart && decimalPart.length > DECIMAL_PLACES) {
      return `Maximum ${DECIMAL_PLACES} decimal places allowed`;
    }
    if (transactionType === "check_out" && item && value > item.current_stock) {
      return "Cannot check out more than available stock";
    }
    return null;
  };

  // Round to proper decimal places
  const roundToDecimalPlaces = (value: number): number => {
    const factor = Math.pow(10, DECIMAL_PLACES);
    return Math.round(value * factor) / factor;
  };

  const handleQuantityChange = (delta: number) => {
    const newValue = roundToDecimalPlaces(quantity + delta);
    const validationError = validateQuantity(newValue);

    if (validationError && newValue > 0) {
      setError(validationError);
      return;
    }

    if (newValue >= 0.001) {
      setQuantity(newValue);
      setQuantityInput(newValue.toString());
      setError(null);
    }
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setQuantityInput(inputValue);

    // Allow empty input while typing
    if (inputValue === "" || inputValue === ".") {
      return;
    }

    const parsedValue = parseFloat(inputValue);
    if (!isNaN(parsedValue)) {
      const validationError = validateQuantity(parsedValue);
      if (validationError) {
        setError(validationError);
      } else {
        setQuantity(parsedValue);
        setError(null);
      }
    }
  };

  const handleQuantityInputBlur = () => {
    // On blur, ensure we have a valid value
    if (quantityInput === "" || quantityInput === ".") {
      setQuantity(1);
      setQuantityInput("1");
      return;
    }

    const parsedValue = parseFloat(quantityInput);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setQuantity(1);
      setQuantityInput("1");
      setError(null);
    } else {
      const roundedValue = roundToDecimalPlaces(parsedValue);
      setQuantity(Math.min(roundedValue, MAX_QUANTITY));
      setQuantityInput(Math.min(roundedValue, MAX_QUANTITY).toString());
    }
  };

  const handleSubmit = async () => {
    if (!item) return;

    // Validate quantity before submitting
    const validationError = validateQuantity(quantity);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (transactionType === "transfer" && !selectedLocation) {
      setError("Please select a destination location");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Queue the transaction - it will sync immediately if online,
      // or be queued for later sync if offline. The queue handles
      // retries and ensures no data loss.
      await queueTransaction({
        transactionType: transactionType as DBTransactionType,
        itemId: item.id,
        quantity,
        notes: notes || undefined,
        sourceLocationId: item.location_id ?? undefined,
        destinationLocationId: selectedLocation || undefined,
        deviceTimestamp: new Date().toISOString(),
      });

      // Show success immediately - the queue will handle sync
      setShowSuccess(true);
    } catch (err) {
      setError("Failed to queue transaction. Please try again.");
      console.error("Transaction queue error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    router.push("/employee");
  };

  const newStockLevel =
    transactionType === "check_in"
      ? (item?.current_stock || 0) + quantity
      : transactionType === "check_out"
      ? (item?.current_stock || 0) - quantity
      : item?.current_stock || 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card variant="elevated">
          <CardBody>
            <Skeleton className="h-24 w-full" />
          </CardBody>
        </Card>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Error or item not found
  if (loadError || !item) {
    return (
      <div className="space-y-6">
        <Alert status="error" variant="subtle">
          <AlertCircle className="w-4 h-4" />
          {loadError || "Item not found. Please scan an item first."}
        </Alert>
        <Button
          variant="primary"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/employee/scan")}
        >
          Go to Scanner
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Item Info */}
      <Card variant="elevated">
        <CardBody>
          <div className="flex items-start gap-4">
            <ItemImage
              imageUrl={item.image_url}
              itemName={item.name}
              size="lg"
              className="rounded-xl"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-semibold text-foreground text-lg">
                {item.name}
              </h2>
              <p className="text-sm text-foreground-muted">{item.sku}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge colorScheme="neutral" size="sm">
                  {item.category_id ?? "Uncategorized"}
                </Badge>
                <StockLevelBadge level={stockLevel} size="sm" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-foreground-muted">Current</p>
                <p className={`font-semibold ${
                  stockLevel === "critical" ? "text-error" :
                  stockLevel === "low" ? "text-warning" :
                  stockLevel === "overstocked" ? "text-info" :
                  "text-foreground"
                }`}>
                  {item.current_stock}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Min</p>
                <p className="font-semibold text-foreground-muted">{item.min_stock ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-muted">Max</p>
                <p className="font-semibold text-foreground-muted">{item.max_stock ?? 100}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Transaction Type Selection */}
      <div>
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
          Transaction Type
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {transactionTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = transactionType === type.value;

            return (
              <button
                key={type.value}
                onClick={() =>
                  setTransactionType(type.value as TransactionType)
                }
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-primary bg-primary-50"
                    : "border-border bg-white hover:border-primary/50"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${type.bgColor}`}
                >
                  <Icon className={`w-5 h-5 ${type.color}`} />
                </div>
                <p className="font-medium text-foreground text-sm">
                  {type.label}
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity */}
      <Card variant="elevated">
        <CardBody>
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">
            Quantity
          </h3>
          <div className="flex items-center justify-center gap-6">
            <IconButton
              icon={<Minus className="w-6 h-6" />}
              aria-label="Decrease quantity"
              variant="outline"
              size="lg"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 0.001}
              className="w-14 h-14 rounded-xl"
            />
            <div className="text-center min-w-[120px]">
              <input
                type="number"
                step="0.001"
                min="0.001"
                max={MAX_QUANTITY}
                value={quantityInput}
                onChange={handleQuantityInputChange}
                onBlur={handleQuantityInputBlur}
                className="text-4xl font-bold text-foreground text-center bg-neutral-50 rounded-xl py-2 px-4 border-2 border-border focus:border-primary focus:bg-white outline-none w-full transition-colors appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-sm text-foreground-muted mt-1">{item.unit}</p>
            </div>
            <IconButton
              icon={<Plus className="w-6 h-6" />}
              aria-label="Increase quantity"
              variant="outline"
              size="lg"
              onClick={() => handleQuantityChange(1)}
              disabled={
                (transactionType === "check_out" && quantity >= item.current_stock) ||
                quantity >= MAX_QUANTITY
              }
              className="w-14 h-14 rounded-xl"
            />
          </div>

          {/* Quick quantity buttons */}
          <div className="flex justify-center gap-3 mt-4">
            {[5, 10, 25, 50].map((q) => (
              <Button
                key={q}
                variant={quantity === q ? "primary" : "secondary"}
                size="md"
                className="min-w-[48px]"
                onClick={() => {
                  const validationError = validateQuantity(q);
                  if (validationError) {
                    setError(validationError);
                    return;
                  }
                  setQuantity(q);
                  setQuantityInput(q.toString());
                  setError(null);
                }}
              >
                {q}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Stock Preview */}
      <Card
        variant="filled"
        className={
          transactionType === "check_in"
            ? "bg-success-light"
            : transactionType === "check_out"
            ? "bg-error-light"
            : "bg-neutral-100"
        }
      >
        <CardBody className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-foreground-muted mb-1">
                New Stock Level
              </p>
              <p className="text-2xl font-bold text-foreground">
                {newStockLevel}{" "}
                <span className="text-sm font-normal text-foreground-muted">
                  {item.unit}
                </span>
              </p>
            </div>
            <div
              className={`text-2xl font-bold ${
                transactionType === "check_in"
                  ? "text-success"
                  : transactionType === "check_out"
                  ? "text-error"
                  : "text-foreground"
              }`}
            >
              {transactionType === "check_in"
                ? `+${quantity}`
                : transactionType === "check_out"
                ? `-${quantity}`
                : "0"}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Destination Location (for transfers) */}
      {transactionType === "transfer" && (
        <div>
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
            Destination Location
          </h3>
          <Select
            options={locationOptions}
            value={selectedLocation}
            onChange={setSelectedLocation}
            placeholder="Select destination"
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
          Notes (Optional)
        </h3>
        <Textarea
          placeholder="Add any notes about this transaction..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Error */}
      {error && (
        <Alert status="error" variant="subtle">
          <AlertCircle className="w-4 h-4" />
          {error}
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        variant="cta"
        size="lg"
        isFullWidth
        leftIcon={<Send className="w-5 h-5" />}
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={
          isSubmitting ||
          (transactionType === "transfer" && !selectedLocation)
        }
      >
        Submit Transaction
      </Button>

      {/* Success Modal */}
      <Modal isOpen={showSuccess} onClose={handleSuccessClose} size="sm">
        <ModalBody className="text-center py-8">
          <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
            Transaction Complete
          </h3>
          <p className="text-foreground-muted">
            {transactionType === "check_in"
              ? `Added ${quantity} ${item.unit} to inventory`
              : transactionType === "check_out"
              ? `Removed ${quantity} ${item.unit} from inventory`
              : transactionType === "transfer"
              ? `Transferred ${quantity} ${item.unit} to new location`
              : `Adjusted stock by ${quantity} ${item.unit}`}
          </p>
          <div className="mt-6 space-y-3">
            <Button
              variant="primary"
              isFullWidth
              onClick={handleSuccessClose}
            >
              Done
            </Button>
            <Button
              variant="ghost"
              isFullWidth
              onClick={() => {
                setShowSuccess(false);
                router.push("/employee/scan");
              }}
            >
              Scan Another Item
            </Button>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

function TransactionLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size="lg" />
    </div>
  );
}

export default function TransactionPage() {
  return (
    <Suspense fallback={<TransactionLoading />}>
      <TransactionContent />
    </Suspense>
  );
}
