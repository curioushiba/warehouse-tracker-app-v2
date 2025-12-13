import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getLocations,
  getLocationById,
  getLocationByCode,
  createLocation,
  updateLocation,
  deactivateLocation,
  activateLocation,
} from './locations'
import type { Location, LocationInsert, LocationUpdate } from '@/lib/supabase/types'

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Locations Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLocations', () => {
    const mockLocations: Location[] = [
      { id: '1', name: 'Main Warehouse', code: 'WH-001', type: 'warehouse', address: '123 Storage St', is_active: true, created_at: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Downtown Store', code: 'ST-001', type: 'storefront', address: '456 Main St', is_active: true, created_at: '2024-01-01T00:00:00Z' },
      { id: '3', name: 'Old Storage', code: 'OS-001', type: 'storage', address: '789 Old Rd', is_active: false, created_at: '2024-01-01T00:00:00Z' },
    ]

    it('should return all locations ordered by name when no filter provided', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: mockLocations, error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocations()

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(result).toEqual({ data: mockLocations, error: null })
    })

    it('should return only active locations when activeOnly is true', async () => {
      const activeLocations = mockLocations.filter(l => l.is_active)
      const mockOrder = vi.fn().mockResolvedValue({ data: activeLocations, error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocations(true)

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual({ data: activeLocations, error: null })
    })

    it('should return all locations when activeOnly is false', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: mockLocations, error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocations(false)

      expect(result).toEqual({ data: mockLocations, error: null })
    })

    it('should return error when database query fails', async () => {
      const mockError = { message: 'Database error', code: 'PGRST301' }
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocations()

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('getLocationById', () => {
    it('should return a single location by id', async () => {
      const mockLocation: Location = {
        id: '1',
        name: 'Main Warehouse',
        code: 'WH-001',
        type: 'warehouse',
        address: '123 Storage St',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockLocation, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocationById('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual({ data: mockLocation, error: null })
    })

    it('should return error when location not found', async () => {
      const mockError = { message: 'Location not found', code: 'PGRST116' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocationById('nonexistent')

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('getLocationByCode', () => {
    it('should return a single location by code', async () => {
      const mockLocation: Location = {
        id: '1',
        name: 'Main Warehouse',
        code: 'WH-001',
        type: 'warehouse',
        address: '123 Storage St',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockLocation, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocationByCode('WH-001')

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(mockEq).toHaveBeenCalledWith('code', 'WH-001')
      expect(result).toEqual({ data: mockLocation, error: null })
    })

    it('should return error when location code not found', async () => {
      const mockError = { message: 'Location not found', code: 'PGRST116' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getLocationByCode('INVALID')

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('createLocation', () => {
    it('should create a new location and revalidate path', async () => {
      const locationData: LocationInsert = {
        name: 'New Warehouse',
        code: 'WH-002',
        type: 'warehouse',
        address: '999 New St',
      }
      const mockCreatedLocation: Location = {
        id: '4',
        name: 'New Warehouse',
        code: 'WH-002',
        type: 'warehouse',
        address: '999 New St',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedLocation, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const result = await createLocation(locationData)

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(mockInsert).toHaveBeenCalledWith(locationData)
      expect(result).toEqual({ data: mockCreatedLocation, error: null })
    })

    it('should return error when creation fails due to duplicate code', async () => {
      const locationData: LocationInsert = {
        name: 'Duplicate Warehouse',
        code: 'WH-001',
        type: 'warehouse',
      }
      const mockError = { message: 'Duplicate location code', code: '23505' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const result = await createLocation(locationData)

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('updateLocation', () => {
    it('should update a location and revalidate path', async () => {
      const updateData: LocationUpdate = {
        name: 'Updated Warehouse',
        address: 'Updated Address',
      }
      const mockUpdatedLocation: Location = {
        id: '1',
        name: 'Updated Warehouse',
        code: 'WH-001',
        type: 'warehouse',
        address: 'Updated Address',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedLocation, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await updateLocation('1', updateData)

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(mockUpdate).toHaveBeenCalledWith(updateData)
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual({ data: mockUpdatedLocation, error: null })
    })

    it('should return error when update fails', async () => {
      const updateData: LocationUpdate = {
        name: 'Updated Warehouse',
      }
      const mockError = { message: 'Update failed', code: 'PGRST301' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await updateLocation('1', updateData)

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('deactivateLocation', () => {
    it('should deactivate a location (soft delete) and revalidate path', async () => {
      const mockDeactivatedLocation: Location = {
        id: '1',
        name: 'Main Warehouse',
        code: 'WH-001',
        type: 'warehouse',
        address: '123 Storage St',
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockDeactivatedLocation, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await deactivateLocation('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual({ data: mockDeactivatedLocation, error: null })
    })

    it('should return error when deactivation fails', async () => {
      const mockError = { message: 'Deactivation failed', code: 'PGRST301' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await deactivateLocation('1')

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('activateLocation', () => {
    it('should activate a location and revalidate path', async () => {
      const mockActivatedLocation: Location = {
        id: '3',
        name: 'Old Storage',
        code: 'OS-001',
        type: 'storage',
        address: '789 Old Rd',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockActivatedLocation, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await activateLocation('3')

      expect(mockSupabase.from).toHaveBeenCalledWith('locations')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: true })
      expect(mockEq).toHaveBeenCalledWith('id', '3')
      expect(result).toEqual({ data: mockActivatedLocation, error: null })
    })

    it('should return error when activation fails', async () => {
      const mockError = { message: 'Activation failed', code: 'PGRST301' }

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const result = await activateLocation('3')

      expect(result).toEqual({ data: null, error: mockError })
    })
  })
})
