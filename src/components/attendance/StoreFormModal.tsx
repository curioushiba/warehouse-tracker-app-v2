'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormControl, FormLabel, FormErrorMessage, FormHelperText } from '@/components/ui/Form'
import { Switch } from '@/components/ui/Switch'
import type { AttStore, AttStoreInsert, AttStoreUpdate } from '@/lib/supabase/attendance-types'

interface StoreFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AttStoreInsert | AttStoreUpdate) => Promise<void>
  store?: AttStore | null // If provided, we're editing
  isSubmitting?: boolean
}

interface FormData {
  name: string
  cooldown_minutes: number
  is_active: boolean
}

interface FormErrors {
  name?: string
  cooldown_minutes?: string
}

export function StoreFormModal({
  isOpen,
  onClose,
  onSubmit,
  store,
  isSubmitting = false,
}: StoreFormModalProps) {
  const isEditing = !!store

  const [formData, setFormData] = useState<FormData>({
    name: '',
    cooldown_minutes: 240,
    is_active: true,
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Reset form when modal opens/closes or store changes
  useEffect(() => {
    if (isOpen) {
      if (store) {
        setFormData({
          name: store.name,
          cooldown_minutes: store.cooldown_minutes,
          is_active: store.is_active,
        })
      } else {
        setFormData({
          name: '',
          cooldown_minutes: 240,
          is_active: true,
        })
      }
      setErrors({})
    }
  }, [isOpen, store])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Store name is required'
    }

    if (formData.cooldown_minutes < 0) {
      newErrors.cooldown_minutes = 'Cooldown must be 0 or greater'
    }

    if (formData.cooldown_minutes > 1440) {
      newErrors.cooldown_minutes = 'Cooldown cannot exceed 24 hours (1440 minutes)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const data: AttStoreInsert | AttStoreUpdate = {
      name: formData.name.trim(),
      cooldown_minutes: formData.cooldown_minutes,
      is_active: formData.is_active,
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
          {isEditing ? 'Edit Store' : 'Create Store'}
        </ModalHeader>

        <ModalBody className="space-y-4">
          <FormControl isRequired isInvalid={!!errors.name}>
            <FormLabel>Store Name</FormLabel>
            <Input
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Downtown Branch"
              autoFocus
            />
            {errors.name && <FormErrorMessage>{errors.name}</FormErrorMessage>}
          </FormControl>

          <FormControl isInvalid={!!errors.cooldown_minutes}>
            <FormLabel>Cooldown Period (minutes)</FormLabel>
            <Input
              type="number"
              value={formData.cooldown_minutes}
              onChange={(e) => updateField('cooldown_minutes', parseInt(e.target.value) || 0)}
              min={0}
              max={1440}
            />
            <FormHelperText>
              Time before the same employee can clock in again. Default: 240 (4 hours)
            </FormHelperText>
            {errors.cooldown_minutes && (
              <FormErrorMessage>{errors.cooldown_minutes}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl>
            <div className="flex items-center justify-between">
              <div>
                <FormLabel className="mb-0">Active</FormLabel>
                <p className="text-sm text-gray-500">
                  Inactive stores cannot be used for clock-in
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
            {isEditing ? 'Save Changes' : 'Create Store'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
