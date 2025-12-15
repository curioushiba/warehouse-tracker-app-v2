"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Skeleton } from "@/components/ui";
import type { Item } from "@/lib/supabase/types";

const ManageCodesCard = dynamic(() => import("@/components/codes/ManageCodesCard"), {
  ssr: false,
  loading: () => (
    <Card variant="elevated">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardBody className="pt-4 space-y-4">
        <Skeleton className="h-40 w-full" />
      </CardBody>
    </Card>
  ),
});

export interface ManageCodesLazyProps {
  item: Item;
}

export function ManageCodesLazy({ item }: ManageCodesLazyProps) {
  const router = useRouter();
  const [localItem, setLocalItem] = React.useState<Item>(item);

  React.useEffect(() => {
    setLocalItem(item);
  }, [item]);

  return (
    <ManageCodesCard
      item={localItem}
      onItemUpdate={(updated: Item) => {
        setLocalItem(updated);
        router.refresh();
      }}
    />
  );
}


