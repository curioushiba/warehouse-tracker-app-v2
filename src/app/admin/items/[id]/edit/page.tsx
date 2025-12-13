"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Package } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Skeleton,
  Alert,
} from "@/components/ui";
import { getItemById, updateItem } from "@/lib/actions/items";
import { getCategories } from "@/lib/actions/categories";
import { getLocations } from "@/lib/actions/locations";
import type { Item, Category, Location, ItemUpdate } from "@/lib/supabase/types";

interface ItemFormData {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category_id: string;
  location_id: string;
  unit: string;
  current_stock: string;
  min_stock: string;
  max_stock: string;
  unit_price: string;
}

const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "l", label: "Liters (l)" },
  { value: "ml", label: "Milliliters (ml)" },
  { value: "m", label: "Meters (m)" },
  { value: "box", label: "Boxes" },
  { value: "bag", label: "Bags" },
  { value: "roll", label: "Rolls" },
  { value: "unit", label: "Units" },
];

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  // Data state
  const [item, setItem] = React.useState<Item | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [formData, setFormData] = React.useState<ItemFormData>({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    category_id: "",
    location_id: "",
    unit: "pcs",
    current_stock: "0",
    min_stock: "0",
    max_stock: "",
    unit_price: "0",
  });
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof ItemFormData, string>>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch data
  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const [itemResult, categoriesResult, locationsResult] = await Promise.all([
          getItemById(itemId),
          getCategories(),
          getLocations(),
        ]);

        if (!itemResult.success) {
          setError(itemResult.error || "Failed to load item");
          return;
        }

        setItem(itemResult.data);
        setCategories(categoriesResult.success ? categoriesResult.data : []);
        setLocations(locationsResult.success ? locationsResult.data.filter((l) => l.is_active) : []);

        // Populate form
        const i = itemResult.data;
        setFormData({
          name: i.name,
          sku: i.sku,
          barcode: i.barcode || "",
          description: i.description || "",
          category_id: i.category_id || "",
          location_id: i.location_id || "",
          unit: i.unit,
          current_stock: i.current_stock.toString(),
          min_stock: (i.min_stock ?? 0).toString(),
          max_stock: i.max_stock?.toString() || "",
          unit_price: (i.unit_price ?? 0).toString(),
        });
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [itemId]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ItemFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.sku.trim()) {
      errors.sku = "SKU is required";
    }

    if (!formData.unit) {
      errors.unit = "Unit is required";
    }

    const stock = parseFloat(formData.current_stock);
    if (isNaN(stock) || stock < 0) {
      errors.current_stock = "Current stock must be a valid positive number";
    }

    const minStock = parseFloat(formData.min_stock);
    if (formData.min_stock && (isNaN(minStock) || minStock < 0)) {
      errors.min_stock = "Min stock must be a valid positive number";
    }

    const maxStock = parseFloat(formData.max_stock);
    if (formData.max_stock && (isNaN(maxStock) || maxStock < 0)) {
      errors.max_stock = "Max stock must be a valid positive number";
    }

    if (formData.max_stock && formData.min_stock) {
      if (maxStock < minStock) {
        errors.max_stock = "Max stock must be greater than min stock";
      }
    }

    const price = parseFloat(formData.unit_price);
    if (formData.unit_price && (isNaN(price) || price < 0)) {
      errors.unit_price = "Unit price must be a valid positive number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);
    setError(null);

    try {
      const updateData: ItemUpdate = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim() || null,
        description: formData.description.trim() || null,
        category_id: formData.category_id || null,
        location_id: formData.location_id || null,
        unit: formData.unit,
        current_stock: parseFloat(formData.current_stock),
        min_stock: formData.min_stock ? parseFloat(formData.min_stock) : 0,
        max_stock: formData.max_stock ? parseFloat(formData.max_stock) : null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : 0,
      };

      const result = await updateItem(itemId, updateData);

      if (result.success) {
        router.push(`/admin/items/${itemId}`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to update item");
      console.error("Error updating item:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Update form field
  const updateField = (field: keyof ItemFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card variant="elevated">
          <CardBody className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="space-y-6">
        <Link href="/admin/items">
          <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Items
          </Button>
        </Link>
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/items/${itemId}`}>
          <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Edit Item
          </h1>
          <p className="text-foreground-muted text-sm">{item?.sku}</p>
        </div>
      </div>

      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card variant="elevated">
              <CardHeader className="p-6 pb-0">
                <h3 className="font-semibold text-foreground">Basic Information</h3>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                <FormControl isRequired isInvalid={!!formErrors.name}>
                  <FormLabel>Item Name</FormLabel>
                  <Input
                    placeholder="e.g., Premium Dog Food 5kg"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                  {formErrors.name && <FormErrorMessage>{formErrors.name}</FormErrorMessage>}
                </FormControl>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormControl isRequired isInvalid={!!formErrors.sku}>
                    <FormLabel>SKU</FormLabel>
                    <Input
                      placeholder="e.g., SKU-001"
                      value={formData.sku}
                      onChange={(e) => updateField("sku", e.target.value.toUpperCase())}
                    />
                    {formErrors.sku && <FormErrorMessage>{formErrors.sku}</FormErrorMessage>}
                  </FormControl>

                  <FormControl>
                    <FormLabel>Barcode</FormLabel>
                    <Input
                      placeholder="e.g., 1234567890123"
                      value={formData.barcode}
                      onChange={(e) => updateField("barcode", e.target.value)}
                    />
                  </FormControl>
                </div>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    placeholder="Optional description..."
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                  />
                </FormControl>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardHeader className="p-6 pb-0">
                <h3 className="font-semibold text-foreground">Stock Information</h3>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormControl isRequired isInvalid={!!formErrors.unit}>
                    <FormLabel>Unit</FormLabel>
                    <Select
                      options={UNIT_OPTIONS}
                      value={formData.unit}
                      onChange={(value) => updateField("unit", value)}
                    />
                    {formErrors.unit && <FormErrorMessage>{formErrors.unit}</FormErrorMessage>}
                  </FormControl>

                  <FormControl isRequired isInvalid={!!formErrors.current_stock}>
                    <FormLabel>Current Stock</FormLabel>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0"
                      value={formData.current_stock}
                      onChange={(e) => updateField("current_stock", e.target.value)}
                    />
                    {formErrors.current_stock && (
                      <FormErrorMessage>{formErrors.current_stock}</FormErrorMessage>
                    )}
                  </FormControl>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormControl isInvalid={!!formErrors.min_stock}>
                    <FormLabel>Min Stock</FormLabel>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0"
                      value={formData.min_stock}
                      onChange={(e) => updateField("min_stock", e.target.value)}
                    />
                    <FormHelperText>Triggers low stock alerts</FormHelperText>
                    {formErrors.min_stock && (
                      <FormErrorMessage>{formErrors.min_stock}</FormErrorMessage>
                    )}
                  </FormControl>

                  <FormControl isInvalid={!!formErrors.max_stock}>
                    <FormLabel>Max Stock</FormLabel>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Optional"
                      value={formData.max_stock}
                      onChange={(e) => updateField("max_stock", e.target.value)}
                    />
                    <FormHelperText>Maximum storage capacity</FormHelperText>
                    {formErrors.max_stock && (
                      <FormErrorMessage>{formErrors.max_stock}</FormErrorMessage>
                    )}
                  </FormControl>
                </div>

                <FormControl isInvalid={!!formErrors.unit_price}>
                  <FormLabel>Unit Price (SGD)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.unit_price}
                    onChange={(e) => updateField("unit_price", e.target.value)}
                  />
                  {formErrors.unit_price && (
                    <FormErrorMessage>{formErrors.unit_price}</FormErrorMessage>
                  )}
                </FormControl>
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader className="p-6 pb-0">
                <h3 className="font-semibold text-foreground">Organization</h3>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Select
                    options={[
                      { value: "", label: "No category" },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={formData.category_id}
                    onChange={(value) => updateField("category_id", value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Select
                    options={[
                      { value: "", label: "No location" },
                      ...locations.map((l) => ({ value: l.id, label: l.name })),
                    ]}
                    value={formData.location_id}
                    onChange={(value) => updateField("location_id", value)}
                  />
                </FormControl>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardBody className="p-6">
                <Button
                  type="submit"
                  variant="primary"
                  isFullWidth
                  size="lg"
                  leftIcon={<Save className="w-5 h-5" />}
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  Save Changes
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
