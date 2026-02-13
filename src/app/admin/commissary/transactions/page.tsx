"use client";

import AdminTransactionsPageContent from "@/components/admin/AdminTransactionsPageContent";
import { getCmTransactionsWithDetailsPaginated } from "@/lib/actions/commissary-transactions";
import { getUsers } from "@/lib/actions/users";

export default function CommissaryTransactionsPage() {
  return (
    <AdminTransactionsPageContent
      fetchTransactions={getCmTransactionsWithDetailsPaginated}
      fetchUsers={getUsers}
      exportFilePrefix="commissary-transactions"
    />
  );
}
