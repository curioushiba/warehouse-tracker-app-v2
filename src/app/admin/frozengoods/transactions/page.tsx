"use client";

import AdminTransactionsPageContent from "@/components/admin/AdminTransactionsPageContent";
import { getFgTransactionsWithDetailsPaginated } from "@/lib/actions/frozen-goods-transactions";
import { getUsers } from "@/lib/actions/users";

export default function FrozenGoodsTransactionsPage() {
  return (
    <AdminTransactionsPageContent
      fetchTransactions={getFgTransactionsWithDetailsPaginated}
      fetchUsers={getUsers}
      exportFilePrefix="frozen-goods-transactions"
    />
  );
}
