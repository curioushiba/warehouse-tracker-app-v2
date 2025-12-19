'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { getRecordsPaginated } from '@/lib/actions/attendance/records'
import { getAllStores } from '@/lib/actions/attendance/stores'
import { getAllEmployees } from '@/lib/actions/attendance/employees'
import type { AttRecordWithDetails, AttStore, AttEmployee } from '@/lib/supabase/attendance-types'

export default function RecordsPage() {
  // Data state
  const [records, setRecords] = useState<AttRecordWithDetails[]>([])
  const [stores, setStores] = useState<AttStore[]>([])
  const [employees, setEmployees] = useState<AttEmployee[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [storeId, setStoreId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Load filter options on mount
  useEffect(() => {
    const loadOptions = async () => {
      const [storesResult, employeesResult] = await Promise.all([
        getAllStores(),
        getAllEmployees(),
      ])

      if (storesResult.success) {
        setStores(storesResult.data)
      }
      if (employeesResult.success) {
        setEmployees(employeesResult.data)
      }
    }

    loadOptions()
  }, [])

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getRecordsPaginated({
      page,
      pageSize,
      storeId: storeId || undefined,
      employeeId: employeeId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })

    if (result.success) {
      setRecords(result.data.data)
      setTotalCount(result.data.totalCount)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [page, pageSize, storeId, employeeId, dateFrom, dateTo])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleClearFilters = () => {
    setStoreId('')
    setEmployeeId('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasFilters = storeId || employeeId || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
        <p className="text-sm text-gray-500 mt-1">
          View employee clock-in history
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store
              </label>
              <Select
                value={storeId}
                placeholder="All Stores"
                isClearable
                options={stores.map((store) => ({
                  value: store.id,
                  label: store.name,
                }))}
                onChange={(value) => {
                  setStoreId(value)
                  setPage(1)
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <Select
                value={employeeId}
                placeholder="All Employees"
                isClearable
                options={employees.map((emp) => ({
                  value: emp.id,
                  label: emp.display_name,
                }))}
                onChange={(value) => {
                  setEmployeeId(value)
                  setPage(1)
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="flex items-end">
              {hasFilters && (
                <Button variant="ghost" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error */}
      {error && (
        <Alert status="error">{error}</Alert>
      )}

      {/* Summary */}
      <div className="text-sm text-gray-500">
        {totalCount} record{totalCount !== 1 ? 's' : ''} found
      </div>

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
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Store</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableEmpty
                    title="No records found"
                    description={hasFilters ? 'Try adjusting your filters' : 'No attendance records yet'}
                    colSpan={3}
                  />
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {formatDateTime(record.recorded_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.employee.display_name}</div>
                          <div className="text-sm text-gray-500 font-mono">
                            {record.employee.username}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{record.store.name}</div>
                          {record.store.qr_code && (
                            <div className="text-sm text-gray-500 font-mono">
                              {record.store.qr_code}
                            </div>
                          )}
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
    </div>
  )
}
