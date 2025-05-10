import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

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
  const stringTypes = ref<StringType[]>([])
  const currentStringType = ref<StringType | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

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

  const getStringTypeById = (id: number) => {
    return stringTypes.value.find(string => string.id === id) || null
  }

  const getStringTypeDescription = (id: number) => {
    const stringType = getStringTypeById(id)
    if (!stringType) return 'Unknown'

    let description = `${stringType.brand} ${stringType.model}`
    if (stringType.gauge) description += ` ${stringType.gauge}`
    if (stringType.color) description += ` (${stringType.color})`
    return description
  }

  async function fetchAllStringTypes() {
    if (stringTypes.value.length > 0 && initialized.value) {
      return stringTypes.value
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

      const index = stringTypes.value.findIndex(string => string.id === id)
      if (index !== -1) {
        stringTypes.value[index] = { ...stringTypes.value[index], ...stringTypeData }
      }

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

      stringTypes.value = stringTypes.value.filter(string => string.id !== id)

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

  function clearCurrentStringType() {
    currentStringType.value = null
  }

  function reset() {
    stringTypes.value = []
    currentStringType.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    stringTypes,
    currentStringType,
    loading,
    error,
    initialized,
    stringTypeCount,
    stringsByBrand,
    stringTypeOptions,
    getStringTypeById,
    getStringTypeDescription,
    fetchAllStringTypes,
    fetchStringTypeById,
    createStringType,
    updateStringType,
    deleteStringType,
    clearCurrentStringType,
    reset
  }
})