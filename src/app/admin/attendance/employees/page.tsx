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
import { EmployeeFormModal } from '@/components/attendance/EmployeeFormModal'
import {
  getEmployeesPaginated,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeActive,
} from '@/lib/actions/attendance/employees'
import type { AttEmployee, AttEmployeeInsert, AttEmployeeUpdate } from '@/lib/supabase/attendance-types'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react'

export default function EmployeesPage() {
  // Data state
  const [employees, setEmployees] = useState<AttEmployee[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<AttEmployee | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getEmployeesPaginated({
      page,
      pageSize,
      search: search || undefined,
    })

    if (result.success) {
      setEmployees(result.data.data)
      setTotalCount(result.data.totalCount)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [page, pageSize, search])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchEmployees()
    }, 300)

    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleCreateClick = () => {
    setSelectedEmployee(null)
    setActionError(null)
    setIsFormModalOpen(true)
  }

  const handleEditClick = (employee: AttEmployee) => {
    setSelectedEmployee(employee)
    setActionError(null)
    setIsFormModalOpen(true)
  }

  const handleDeleteClick = (employee: AttEmployee) => {
    setSelectedEmployee(employee)
    setActionError(null)
    setIsDeleteModalOpen(true)
  }

  const handleToggleActive = async (employee: AttEmployee) => {
    const result = await toggleEmployeeActive(employee.id)
    if (result.success) {
      fetchEmployees()
    }
  }

  const handleFormSubmit = async (data: AttEmployeeInsert | AttEmployeeUpdate) => {
    setIsSubmitting(true)
    setActionError(null)

    const result = selectedEmployee
      ? await updateEmployee(selectedEmployee.id, data)
      : await createEmployee(data as AttEmployeeInsert)

    if (result.success) {
      setIsFormModalOpen(false)
      setSelectedEmployee(null)
      fetchEmployees()
    } else {
      setActionError(result.error)
    }

    setIsSubmitting(false)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee) return

    setIsSubmitting(true)
    setActionError(null)

    const result = await deleteEmployee(selectedEmployee.id)

    if (result.success) {
      setIsDeleteModalOpen(false)
      setSelectedEmployee(null)
      fetchEmployees()
    } else {
      setActionError(result.error)
    }

    setIsSubmitting(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Employees</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee accounts for attendance clock-in
          </p>
        </div>
        <Button variant="cta" onClick={handleCreateClick}>
          <Plus className="w-5 h-5 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by username or name..."
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
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableEmpty
                    title="No employees found"
                    description="Create an employee account to enable attendance clock-in"
                    colSpan={6}
                  />
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm">{emp.username}</TableCell>
                      <TableCell className="font-medium">{emp.display_name}</TableCell>
                      <TableCell>
                        <button onClick={() => handleToggleActive(emp)}>
                          <Badge colorScheme={emp.is_active ? 'success' : 'secondary'}>
                            {emp.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(emp.last_login_at)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(emp.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(emp)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(emp)}
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
      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        employee={selectedEmployee}
        isSubmitting={isSubmitting}
        serverError={actionError}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} size="sm">
        <ModalHeader showCloseButton onClose={() => setIsDeleteModalOpen(false)}>
          Delete Employee
        </ModalHeader>
        <ModalBody>
          {actionError && (
            <Alert status="error" className="mb-4">{actionError}</Alert>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedEmployee?.display_name}</strong>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone. Employees with attendance records cannot be deleted.
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
            Delete Employee
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
