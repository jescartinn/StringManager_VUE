import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

// Define interfaces
interface Player {
  id: number
  name: string
  lastName: string
  countryCode?: string
}

interface Racquet {
  id: number
  playerId: number
  brand: string
  model: string
  serialNumber?: string
  headSize?: number
  notes?: string
  player?: Player
}

interface CreateRacquetDTO {
  playerId: number
  brand: string
  model: string
  serialNumber?: string
  headSize?: number
  notes?: string
}

interface UpdateRacquetDTO {
  brand: string
  model: string
  serialNumber?: string
  headSize?: number
  notes?: string
}

export const useRacquetStore = defineStore('racquet', () => {
  // State
  const racquets = ref<Racquet[]>([])
  const playerRacquets = ref<Record<number, Racquet[]>>({}) // Indexed by playerId for quick access
  const currentRacquet = ref<Racquet | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Computed
  const racquetCount = computed(() => racquets.value.length)

  const racquetsByBrand = computed(() => {
    const brands: Record<string, Racquet[]> = {}
    racquets.value.forEach(racquet => {
      if (!brands[racquet.brand]) {
        brands[racquet.brand] = []
      }
      brands[racquet.brand].push(racquet)
    })
    return brands
  })

  const racquetOptions = computed(() => {
    return racquets.value.map(racquet => ({
      value: racquet.id,
      text: `${racquet.brand} ${racquet.model}${racquet.serialNumber ? ` (${racquet.serialNumber})` : ''}`,
      racquet
    }))
  })

  // Helper to get racquet by id directly from store
  const getRacquetById = (id: number) => {
    return racquets.value.find(racquet => racquet.id === id) || null
  }

  // Helper to get racquet description
  const getRacquetDescription = (id: number) => {
    const racquet = getRacquetById(id)
    return racquet ? `${racquet.brand} ${racquet.model}${racquet.serialNumber ? ` (${racquet.serialNumber})` : ''}` : 'Unknown'
  }

  // Actions
  async function fetchAllRacquets() {
    if (racquets.value.length > 0 && initialized.value) {
      return racquets.value // Return cached data if already fetched
    }

    loading.value = true
    error.value = null

    try {
      racquets.value = await api.racquets.getAll()

      // Update the playerRacquets map for quick access by player
      racquets.value.forEach(racquet => {
        if (!playerRacquets.value[racquet.playerId]) {
          playerRacquets.value[racquet.playerId] = []
        }
        // Avoid duplicates
        if (!playerRacquets.value[racquet.playerId].find(r => r.id === racquet.id)) {
          playerRacquets.value[racquet.playerId].push(racquet)
        }
      })

      initialized.value = true
      return racquets.value
    } catch (e) {
      console.error('Error fetching racquets:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch racquets'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchRacquetsByPlayer(playerId: number, forceRefresh = false) {
    // If we already have racquets for this player and aren't forcing a refresh, return the cached version
    if (!forceRefresh && playerRacquets.value[playerId]?.length > 0) {
      return playerRacquets.value[playerId]
    }

    loading.value = true
    error.value = null

    try {
      const playerRacquetsList: Racquet[] = await api.racquets.getByPlayer(playerId)

      // Update the player's racquets in our cache
      playerRacquets.value[playerId] = playerRacquetsList

      // Also update the main racquets list
      playerRacquetsList.forEach((racquet: Racquet) => {
        const index = racquets.value.findIndex(r => r.id === racquet.id)
        if (index !== -1) {
          racquets.value[index] = racquet
        } else {
          racquets.value.push(racquet)
        }
      })

      return playerRacquetsList
    } catch (e) {
      console.error(`Error fetching racquets for player ${playerId}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch racquets for player #${playerId}`
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchRacquetById(id: number, forceRefresh = false) {
    // If we already have the racquet and aren't forcing a refresh, return the cached version
    if (!forceRefresh) {
      const existingRacquet = getRacquetById(id)
      if (existingRacquet) {
        currentRacquet.value = existingRacquet
        return existingRacquet
      }
    }

    loading.value = true
    error.value = null

    try {
      const racquet = await api.racquets.getById(id)

      // Check if racquet exists (could be null for 404 response)
      if (!racquet) {
        currentRacquet.value = null
        return null
      }

      currentRacquet.value = racquet

      // Update the racquet in our local cache
      const index = racquets.value.findIndex(r => r.id === id)
      if (index !== -1) {
        racquets.value[index] = racquet
      } else {
        racquets.value.push(racquet)
      }

      // Also update the player's racquets map
      if (racquet.playerId) {
        if (!playerRacquets.value[racquet.playerId]) {
          playerRacquets.value[racquet.playerId] = []
        }

        const playerRacquetIndex = playerRacquets.value[racquet.playerId].findIndex(r => r.id === id)
        if (playerRacquetIndex !== -1) {
          playerRacquets.value[racquet.playerId][playerRacquetIndex] = racquet
        } else {
          playerRacquets.value[racquet.playerId].push(racquet)
        }
      }

      return racquet
    } catch (e) {
      console.error(`Error fetching racquet ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch racquet #${id}`
      currentRacquet.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function createRacquet(racquetData: CreateRacquetDTO) {
    loading.value = true
    error.value = null

    try {
      const newRacquet = await api.racquets.create(racquetData)

      // Add to our main list of racquets
      racquets.value.push(newRacquet)

      // Add to the player's racquets list
      if (!playerRacquets.value[newRacquet.playerId]) {
        playerRacquets.value[newRacquet.playerId] = []
      }
      playerRacquets.value[newRacquet.playerId].push(newRacquet)

      return newRacquet
    } catch (e) {
      console.error('Error creating racquet:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create racquet'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateRacquet(id: number, racquetData: UpdateRacquetDTO) {
    loading.value = true
    error.value = null

    try {
      await api.racquets.update(id, racquetData)

      // Find the racquet to update
      const racquet = getRacquetById(id)
      if (!racquet) {
        // If we don't have it in the store, fetch it
        await fetchRacquetById(id, true)
        return true
      }

      // Update in main racquets array
      const index = racquets.value.findIndex(r => r.id === id)
      if (index !== -1) {
        racquets.value[index] = { ...racquets.value[index], ...racquetData }
      }

      // Update in player racquets map
      const playerId = racquet.playerId
      if (playerRacquets.value[playerId]) {
        const playerRacquetIndex = playerRacquets.value[playerId].findIndex(r => r.id === id)
        if (playerRacquetIndex !== -1) {
          playerRacquets.value[playerId][playerRacquetIndex] = {
            ...playerRacquets.value[playerId][playerRacquetIndex],
            ...racquetData
          }
        }
      }

      // Update currentRacquet if it's the one being updated
      if (currentRacquet.value && currentRacquet.value.id === id) {
        currentRacquet.value = { ...currentRacquet.value, ...racquetData }
      }

      return true
    } catch (e) {
      console.error(`Error updating racquet ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to update racquet #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteRacquet(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.racquets.delete(id)

      // Find the racquet to get its playerId before removing it
      const racquet = getRacquetById(id)
      const playerId = racquet?.playerId

      // Remove from main racquets array
      racquets.value = racquets.value.filter(r => r.id !== id)

      // Remove from player racquets map if we have the playerId
      if (playerId && playerRacquets.value[playerId]) {
        playerRacquets.value[playerId] = playerRacquets.value[playerId].filter(r => r.id !== id)
      }

      // Clear currentRacquet if it's the one being deleted
      if (currentRacquet.value && currentRacquet.value.id === id) {
        currentRacquet.value = null
      }

      return true
    } catch (e) {
      console.error(`Error deleting racquet ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to delete racquet #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  // Clear the current racquet selection
  function clearCurrentRacquet() {
    currentRacquet.value = null
  }

  // Reset store state
  function reset() {
    racquets.value = []
    playerRacquets.value = {}
    currentRacquet.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    // State
    racquets,
    playerRacquets,
    currentRacquet,
    loading,
    error,
    initialized,

    // Getters/Computed
    racquetCount,
    racquetsByBrand,
    racquetOptions,
    getRacquetById,
    getRacquetDescription,

    // Actions
    fetchAllRacquets,
    fetchRacquetsByPlayer,
    fetchRacquetById,
    createRacquet,
    updateRacquet,
    deleteRacquet,
    clearCurrentRacquet,
    reset
  }
})