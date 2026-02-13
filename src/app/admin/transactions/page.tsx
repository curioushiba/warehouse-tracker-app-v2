"use client";

import AdminTransactionsPageContent from "@/components/admin/AdminTransactionsPageContent";
import { getTransactionsWithDetailsPaginated } from "@/lib/actions/transactions";
import { getUsers } from "@/lib/actions/users";

export default function TransactionsPage() {
  return (
    <AdminTransactionsPageContent
      fetchTransactions={getTransactionsWithDetailsPaginated}
      fetchUsers={getUsers}
      exportFilePrefix="transactions"
    />
  );
}
