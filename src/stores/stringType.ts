import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

// Define types
interface StringType {
  id: number
  brand: string
  model: string
  gauge?: string
  material?: string
  color?: string
}

interface CreateStringTypeDTO {
  brand: string
  model: string
  gauge?: string
  material?: string
  color?: string
}

interface UpdateStringTypeDTO {
  brand: string
  model: string
  gauge?: string
  material?: string
  color?: string
}

export const useStringTypeStore = defineStore('stringType', () => {
  // State
  const stringTypes = ref<StringType[]>([])
  const currentStringType = ref<StringType | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Computed properties
  const stringTypeCount = computed(() => stringTypes.value.length)
  
  const stringsByBrand = computed(() => {
    const brands: Record<string, StringType[]> = {}
    stringTypes.value.forEach(string => {
      if (!brands[string.brand]) {
        brands[string.brand] = []
      }
      brands[string.brand].push(string)
    })
    return brands
  })
  
  const stringTypeOptions = computed(() => {
    return stringTypes.value.map(string => ({
      value: string.id,
      text: `${string.brand} ${string.model} ${string.gauge || ''}`,
      stringType: string
    }))
  })

  // Get string type by id directly from store
  const getStringTypeById = (id: number) => {
    return stringTypes.value.find(string => string.id === id) || null
  }
  
  // Get string type description
  const getStringTypeDescription = (id: number) => {
    const stringType = getStringTypeById(id)
    if (!stringType) return 'Unknown'
    
    let description = `${stringType.brand} ${stringType.model}`
    if (stringType.gauge) description += ` ${stringType.gauge}`
    if (stringType.color) description += ` (${stringType.color})`
    return description
  }

  // Actions
  async function fetchAllStringTypes() {
    if (stringTypes.value.length > 0 && initialized.value) {
      return stringTypes.value // Return cached data if already fetched
    }
    
    loading.value = true
    error.value = null
    
    try {
      stringTypes.value = await api.stringTypes.getAll()
      initialized.value = true
      return stringTypes.value
    } catch (e) {
      console.error('Error fetching string types:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch string types'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchStringTypeById(id: number, forceRefresh = false) {
    // If we already have the string type and aren't forcing a refresh, return the cached version
    if (!forceRefresh) {
      const existingStringType = getStringTypeById(id)
      if (existingStringType) {
        currentStringType.value = existingStringType
        return existingStringType
      }
    }
    
    loading.value = true
    error.value = null
    
    try {
      const stringType = await api.stringTypes.getById(id)
      currentStringType.value = stringType
      
      // Update the string type in our local cache
      const index = stringTypes.value.findIndex(s => s.id === id)
      if (index !== -1) {
        stringTypes.value[index] = stringType
      } else {
        stringTypes.value.push(stringType)
      }
      
      return stringType
    } catch (e) {
      console.error(`Error fetching string type ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch string type #${id}`
      return null
    } finally {
      loading.value = false
    }
  }

  async function createStringType(stringTypeData: CreateStringTypeDTO) {
    loading.value = true
    error.value = null
    
    try {
      const newStringType = await api.stringTypes.create(stringTypeData)
      stringTypes.value.push(newStringType)
      return newStringType
    } catch (e) {
      console.error('Error creating string type:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create string type'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateStringType(id: number, stringTypeData: UpdateStringTypeDTO) {
    loading.value = true
    error.value = null
    
    try {
      await api.stringTypes.update(id, stringTypeData)
      
      // Update the string type in the local state
      const index = stringTypes.value.findIndex(string => string.id === id)
      if (index !== -1) {
        stringTypes.value[index] = { ...stringTypes.value[index], ...stringTypeData }
      }
      
      // Also update currentStringType if it's the one being updated
      if (currentStringType.value && currentStringType.value.id === id) {
        currentStringType.value = { ...currentStringType.value, ...stringTypeData }
      }
      
      return true
    } catch (e) {
      console.error(`Error updating string type ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to update string type #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteStringType(id: number) {
    loading.value = true
    error.value = null
    
    try {
      await api.stringTypes.delete(id)
      
      // Remove the string type from the local state
      stringTypes.value = stringTypes.value.filter(string => string.id !== id)
      
      // Clear currentStringType if it's the one being deleted
      if (currentStringType.value && currentStringType.value.id === id) {
        currentStringType.value = null
      }
      
      return true
    } catch (e) {
      console.error(`Error deleting string type ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to delete string type #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  // Clear the current string type selection
  function clearCurrentStringType() {
    currentStringType.value = null
  }

  // Reset store state
  function reset() {
    stringTypes.value = []
    currentStringType.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    // State
    stringTypes,
    currentStringType,
    loading,
    error,
    initialized,
    
    // Getters/Computed
    stringTypeCount,
    stringsByBrand,
    stringTypeOptions,
    getStringTypeById,
    getStringTypeDescription,
    
    // Actions
    fetchAllStringTypes,
    fetchStringTypeById,
    createStringType,
    updateStringType,
    deleteStringType,
    clearCurrentStringType,
    reset
  }
})