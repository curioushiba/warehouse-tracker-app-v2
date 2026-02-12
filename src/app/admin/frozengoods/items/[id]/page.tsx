import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  FolderOpen,
  Barcode,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Pencil,
  Snowflake,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  Badge,
  Alert,
} from "@/components/ui";
import { StockLevelBadge } from "@/components/ui";
import { ItemImage } from "@/components/items";
import { getFgItemById } from "@/lib/actions/frozen-goods-items";
import { getCategoryById } from "@/lib/actions/categories";
import { getLocationById } from "@/lib/actions/locations";
import { formatCurrency, formatDateTime, getStockLevel } from "@/lib/utils";

export default async function FgItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: itemId } = await params;
  const itemResult = await getFgItemById(itemId);

  if (!itemResult.success) {
    return (
      <div className="space-y-6">
        <Link href="/admin/frozengoods/items">
          <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>Back to Frozen Goods</Button>
        </Link>
        <Alert status="error" variant="subtle">{itemResult.error || "Item not found"}</Alert>
      </div>
    );
  }

  const item = itemResult.data;
  const [categoryResult, locationResult] = await Promise.all([
    item.category_id ? getCategoryById(item.category_id) : Promise.resolve(null),
    item.location_id ? getLocationById(item.location_id) : Promise.resolve(null),
  ]);

  const category = categoryResult && categoryResult.success ? categoryResult.data : null;
  const location = locationResult && locationResult.success ? locationResult.data : null;
  const stockLevel = getStockLevel(item.current_stock, item.min_stock ?? 0, item.max_stock ?? 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/frozengoods/items">
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold text-foreground">{item.name}</h1>
              {item.is_archived && <Badge colorScheme="neutral" size="sm">Archived</Badge>}
            </div>
            <p className="text-foreground-muted text-sm">{item.sku}</p>
          </div>
        </div>
        <Link href={`/admin/frozengoods/items/${item.id}/edit`}>
          <Button variant="primary" leftIcon={<Pencil className="w-4 h-4" />}>Edit</Button>
        </Link>
      </div>

      <Card variant="elevated">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <ItemImage imageUrl={item.image_url} itemName={item.name} size="xl" className="rounded-2xl" />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{item.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-foreground-muted">
                    <span className="flex items-center gap-1"><Barcode className="w-4 h-4" />{item.sku}</span>
                    {item.barcode && <span>Barcode: {item.barcode}</span>}
                  </div>
                </div>
                <StockLevelBadge level={stockLevel} />
              </div>
              {item.description && <p className="text-foreground-muted mb-4">{item.description}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1"><Package className="w-4 h-4" />Current Stock</div>
                  <p className="text-2xl font-bold text-foreground">{item.current_stock} <span className="text-sm font-normal">{item.unit}</span></p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1"><TrendingDown className="w-4 h-4" />Min Stock</div>
                  <p className="text-2xl font-bold text-foreground">{item.min_stock ?? 0} <span className="text-sm font-normal">{item.unit}</span></p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1"><TrendingUp className="w-4 h-4" />Max Stock</div>
                  <p className="text-2xl font-bold text-foreground">{item.max_stock ?? "-"} <span className="text-sm font-normal">{item.unit}</span></p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1"><DollarSign className="w-4 h-4" />Unit Price</div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(item.unit_price ?? 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0077b6]/10 rounded-lg flex items-center justify-center"><FolderOpen className="w-5 h-5 text-[#0077b6]" /></div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Category</p>
                <p className="font-medium text-foreground">{category?.name || "Uncategorized"}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center"><MapPin className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Location</p>
                <p className="font-medium text-foreground">{location?.name || "No location"}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-info-50 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-info" /></div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Created</p>
                <p className="font-medium text-foreground">{formatDateTime(item.created_at)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
