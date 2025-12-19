'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StoreFormModal } from '@/components/attendance/StoreFormModal'
import { StoreQRCard } from '@/components/attendance/StoreQRCard'
import {
  getStoresPaginated,
  createStore,
  updateStore,
  deleteStore,
  generateStoreQrCode,
} from '@/lib/actions/attendance/stores'
import type { AttStore, AttStoreInsert, AttStoreUpdate } from '@/lib/supabase/attendance-types'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  QrCode,
} from 'lucide-react'

export default function StoresPage() {
  // Data state
  const [stores, setStores] = useState<AttStore[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<AttStore | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Fetch stores
  const fetchStores = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getStoresPaginated({
      page,
      pageSize,
      search: search || undefined,
    })

    if (result.success) {
      setStores(result.data.data)
      setTotalCount(result.data.totalCount)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchStores()
    }, 300)

    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleCreateClick = () => {
    setSelectedStore(null)
    setActionError(null)
    setIsFormModalOpen(true)
  }

  const handleEditClick = (store: AttStore) => {
    setSelectedStore(store)
    setActionError(null)
    setIsFormModalOpen(true)
  }

  const handleQRClick = (store: AttStore) => {
    setSelectedStore(store)
    setIsQRModalOpen(true)
  }

  const handleDeleteClick = (store: AttStore) => {
    setSelectedStore(store)
    setActionError(null)
    setIsDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: AttStoreInsert | AttStoreUpdate) => {
    setIsSubmitting(true)
    setActionError(null)

    const result = selectedStore
      ? await updateStore(selectedStore.id, data)
      : await createStore(data as AttStoreInsert)

    if (result.success) {
      setIsFormModalOpen(false)
      setSelectedStore(null)
      fetchStores()
    } else {
      setActionError(result.error)
    }

    setIsSubmitting(false)
  }

  const handleGenerateQR = async (store: AttStore) => {
    setIsSubmitting(true)
    setActionError(null)

    const result = await generateStoreQrCode(store.id)

    if (result.success) {
      setSelectedStore(result.data)
      fetchStores()
    } else {
      setActionError(result.error)
    }

    setIsSubmitting(false)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedStore) return

    setIsSubmitting(true)
    setActionError(null)

    const result = await deleteStore(selectedStore.id)

    if (result.success) {
      setIsDeleteModalOpen(false)
      setSelectedStore(null)
      fetchStores()
    } else {
      setActionError(result.error)
    }

    setIsSubmitting(false)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage store locations for attendance clock-in
          </p>
        </div>
        <Button variant="cta" onClick={handleCreateClick}>
          <Plus className="w-5 h-5 mr-2" />
          Add Store
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardBody>
      </Card>

      {/* Error */}
      {error && (
        <Alert status="error">{error}</Alert>
      )}

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Cooldown</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.length === 0 ? (
                  <TableEmpty
                    title="No stores found"
                    description="Create a store to get started with attendance tracking"
                    colSpan={5}
                  />
                ) : (
                  stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>
                        {store.qr_code ? (
                          <button
                            onClick={() => handleQRClick(store)}
                            className="text-primary-600 hover:text-primary-800 font-mono text-sm"
                          >
                            {store.qr_code}
                          </button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateQR(store)}
                          >
                            <QrCode className="w-4 h-4 mr-1" />
                            Generate
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {store.cooldown_minutes} min
                      </TableCell>
                      <TableCell>
                        <Badge colorScheme={store.is_active ? 'success' : 'secondary'}>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(store)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(store)}
                            title="Delete"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardBody>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Form Modal */}
      <StoreFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        store={selectedStore}
        isSubmitting={isSubmitting}
      />

      {/* QR Code Modal */}
      <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} size="md">
        <ModalHeader showCloseButton onClose={() => setIsQRModalOpen(false)}>
          Store QR Code
        </ModalHeader>
        <ModalBody>
          {selectedStore && <StoreQRCard store={selectedStore} />}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsQRModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} size="sm">
        <ModalHeader showCloseButton onClose={() => setIsDeleteModalOpen(false)}>
          Delete Store
        </ModalHeader>
        <ModalBody>
          {actionError && (
            <Alert status="error" className="mb-4">{actionError}</Alert>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedStore?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone. Stores with attendance records cannot be deleted.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isSubmitting}
          >
            Delete Store
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
