'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormControl, FormLabel, FormErrorMessage, FormHelperText } from '@/components/ui/Form'
import { Switch } from '@/components/ui/Switch'
import type { AttEmployee, AttEmployeeInsert, AttEmployeeUpdate } from '@/lib/supabase/attendance-types'

interface EmployeeFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AttEmployeeInsert | AttEmployeeUpdate) => Promise<void>
  employee?: AttEmployee | null
  isSubmitting?: boolean
}

interface FormData {
  username: string
  display_name: string
  password: string
  confirm_password: string
  is_active: boolean
}

interface FormErrors {
  username?: string
  display_name?: string
  password?: string
  confirm_password?: string
}

export function EmployeeFormModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isSubmitting = false,
}: EmployeeFormModalProps) {
  const isEditing = !!employee

  const [formData, setFormData] = useState<FormData>({
    username: '',
    display_name: '',
    password: '',
    confirm_password: '',
    is_active: true,
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Reset form when modal opens/closes or employee changes
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setFormData({
          username: employee.username,
          display_name: employee.display_name,
          password: '',
          confirm_password: '',
          is_active: employee.is_active,
        })
      } else {
        setFormData({
          username: '',
          display_name: '',
          password: '',
          confirm_password: '',
          is_active: true,
        })
      }
      setErrors({})
    }
  }, [isOpen, employee])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }

    // Password required for new employees
    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }
    }

    // If password provided (editing), validate it
    if (isEditing && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Confirm password if password is provided
    if (formData.password && formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const data: AttEmployeeInsert | AttEmployeeUpdate = {
      username: formData.username.trim().toLowerCase(),
      display_name: formData.display_name.trim(),
      is_active: formData.is_active,
    }

    // Include password if provided
    if (formData.password) {
      (data as AttEmployeeInsert).password = formData.password
    }

    await onSubmit(data)
  }

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader showCloseButton onClose={onClose}>
          {isEditing ? 'Edit Employee' : 'Create Employee'}
        </ModalHeader>

        <ModalBody className="space-y-4">
          <FormControl isRequired isInvalid={!!errors.username}>
            <FormLabel>Username</FormLabel>
            <Input
              value={formData.username}
              onChange={(e) => updateField('username', e.target.value)}
              placeholder="e.g., john_doe"
              autoComplete="off"
              autoFocus
            />
            <FormHelperText>
              Used for login. Letters, numbers, and underscores only.
            </FormHelperText>
            {errors.username && <FormErrorMessage>{errors.username}</FormErrorMessage>}
          </FormControl>

          <FormControl isRequired isInvalid={!!errors.display_name}>
            <FormLabel>Display Name</FormLabel>
            <Input
              value={formData.display_name}
              onChange={(e) => updateField('display_name', e.target.value)}
              placeholder="e.g., John Doe"
            />
            {errors.display_name && <FormErrorMessage>{errors.display_name}</FormErrorMessage>}
          </FormControl>

          <FormControl isRequired={!isEditing} isInvalid={!!errors.password}>
            <FormLabel>
              {isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
            </FormLabel>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder={isEditing ? 'Enter new password' : 'Enter password'}
              autoComplete="new-password"
            />
            <FormHelperText>
              Minimum 6 characters
            </FormHelperText>
            {errors.password && <FormErrorMessage>{errors.password}</FormErrorMessage>}
          </FormControl>

          {(formData.password || !isEditing) && (
            <FormControl isRequired={!isEditing} isInvalid={!!errors.confirm_password}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => updateField('confirm_password', e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
              {errors.confirm_password && (
                <FormErrorMessage>{errors.confirm_password}</FormErrorMessage>
              )}
            </FormControl>
          )}

          <FormControl>
            <div className="flex items-center justify-between">
              <div>
                <FormLabel className="mb-0">Active</FormLabel>
                <p className="text-sm text-gray-500">
                  Inactive employees cannot clock in
                </p>
              </div>
              <Switch
                isChecked={formData.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
              />
            </div>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="cta" type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Employee'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
