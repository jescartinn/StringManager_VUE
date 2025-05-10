import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

interface Stringer {
  id: number
  name: string
  lastName: string
  email?: string
  phoneNumber?: string
}

interface CreateStringerDTO {
  name: string
  lastName: string
  email?: string
  phoneNumber?: string
}

interface UpdateStringerDTO {
  name: string
  lastName: string
  email?: string
  phoneNumber?: string
}

export const useStringerStore = defineStore('stringer', () => {
  const stringers = ref<Stringer[]>([])
  const currentStringer = ref<Stringer | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const stringerCount = computed(() => stringers.value.length)

  const stringerOptions = computed(() => {
    return stringers.value.map(stringer => ({
      value: stringer.id,
      text: `${stringer.name} ${stringer.lastName}`,
      stringer
    }))
  })

  const getStringerById = (id: number) => {
    return stringers.value.find(stringer => stringer.id === id) || null
  }

  const getStringerFullName = (id: number) => {
    const stringer = getStringerById(id)
    return stringer ? `${stringer.name} ${stringer.lastName}` : 'Unknown'
  }

  async function fetchAllStringers() {
    if (stringers.value.length > 0 && initialized.value) {
      return stringers.value
    }

    loading.value = true
    error.value = null

    try {
      stringers.value = await api.stringers.getAll()
      initialized.value = true
      return stringers.value
    } catch (e) {
      console.error('Error fetching stringers:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch stringers'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchStringerById(id: number, forceRefresh = false) {
    if (!forceRefresh) {
      const existingStringer = getStringerById(id)
      if (existingStringer) {
        currentStringer.value = existingStringer
        return existingStringer
      }
    }

    loading.value = true
    error.value = null

    try {
      const stringer = await api.stringers.getById(id)
      currentStringer.value = stringer

      const index = stringers.value.findIndex(s => s.id === id)
      if (index !== -1) {
        stringers.value[index] = stringer
      } else {
        stringers.value.push(stringer)
      }

      return stringer
    } catch (e) {
      console.error(`Error fetching stringer ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch stringer #${id}`
      return null
    } finally {
      loading.value = false
    }
  }

  async function createStringer(stringerData: CreateStringerDTO) {
    loading.value = true
    error.value = null

    try {
      const newStringer = await api.stringers.create(stringerData)
      stringers.value.push(newStringer)
      return newStringer
    } catch (e) {
      console.error('Error creating stringer:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create stringer'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateStringer(id: number, stringerData: UpdateStringerDTO) {
    loading.value = true
    error.value = null

    try {
      await api.stringers.update(id, stringerData)

      const index = stringers.value.findIndex(stringer => stringer.id === id)
      if (index !== -1) {
        stringers.value[index] = { ...stringers.value[index], ...stringerData }
      }

      if (currentStringer.value && currentStringer.value.id === id) {
        currentStringer.value = { ...currentStringer.value, ...stringerData }
      }

      return true
    } catch (e) {
      console.error(`Error updating stringer ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to update stringer #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteStringer(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.stringers.delete(id)

      stringers.value = stringers.value.filter(stringer => stringer.id !== id)

      if (currentStringer.value && currentStringer.value.id === id) {
        currentStringer.value = null
      }

      return true
    } catch (e) {
      console.error(`Error deleting stringer ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to delete stringer #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  function clearCurrentStringer() {
    currentStringer.value = null
  }

  function reset() {
    stringers.value = []
    currentStringer.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    stringers,
    currentStringer,
    loading,
    error,
    initialized,
    stringerCount,
    stringerOptions,

    getStringerById,
    getStringerFullName,
    fetchAllStringers,
    fetchStringerById,
    createStringer,
    updateStringer,
    deleteStringer,
    clearCurrentStringer,
    reset
  }
})