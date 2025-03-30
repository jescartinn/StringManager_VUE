import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

// Define types
interface Tournament {
  id: number
  name: string
  startDate: string
  endDate: string
  location?: string
  category?: string
}

interface CreateTournamentDTO {
  name: string
  startDate: string
  endDate: string
  location?: string
  category?: string
}

interface UpdateTournamentDTO {
  name: string
  startDate: string
  endDate: string
  location?: string
  category?: string
}

export const useTournamentStore = defineStore('tournament', () => {
  // State
  const tournaments = ref<Tournament[]>([])
  const currentTournament = ref<Tournament | null>(null)
  const activeTournament = ref<Tournament | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Computed
  const tournamentCount = computed(() => tournaments.value.length)

  const upcomingTournaments = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tournaments.value.filter(tournament => tournament.startDate > today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  })

  const pastTournaments = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tournaments.value.filter(tournament => tournament.endDate < today)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  })

  const tournamentOptions = computed(() => {
    return tournaments.value.map(tournament => ({
      value: tournament.id,
      text: tournament.name,
      tournament
    }))
  })

  // Get tournament by id directly from store
  const getTournamentById = (id: number) => {
    return tournaments.value.find(tournament => tournament.id === id) || null
  }

  // Actions
  async function fetchAllTournaments() {
    if (tournaments.value.length > 0 && initialized.value) {
      return tournaments.value // Return cached data if already fetched
    }

    loading.value = true
    error.value = null

    try {
      tournaments.value = await api.tournaments.getAll()
      initialized.value = true
      return tournaments.value
    } catch (e) {
      console.error('Error fetching tournaments:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch tournaments'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentTournament() {
    loading.value = true
    error.value = null

    try {
      const tournament = await api.tournaments.getCurrent()
      activeTournament.value = tournament || null

      // If the tournament isn't in our list and it exists, add it
      if (tournament && !tournaments.value.find(t => t.id === tournament.id)) {
        tournaments.value.push(tournament)
      }

      return tournament
    } catch (e) {
      console.error('Error fetching current tournament:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch current tournament'
      // Set activeTournament to null when there's an error
      activeTournament.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchTournamentById(id: number, forceRefresh = false) {
    // If we already have the tournament and aren't forcing a refresh, return the cached version
    if (!forceRefresh) {
      const existingTournament = getTournamentById(id)
      if (existingTournament) {
        currentTournament.value = existingTournament
        return existingTournament
      }
    }

    loading.value = true
    error.value = null

    try {
      const tournament = await api.tournaments.getById(id)
      currentTournament.value = tournament

      // Update the tournament in our local cache
      const index = tournaments.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tournaments.value[index] = tournament
      } else {
        tournaments.value.push(tournament)
      }

      return tournament
    } catch (e) {
      console.error(`Error fetching tournament ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch tournament #${id}`
      return null
    } finally {
      loading.value = false
    }
  }

  async function createTournament(tournamentData: CreateTournamentDTO) {
    loading.value = true
    error.value = null

    try {
      const newTournament = await api.tournaments.create(tournamentData)
      tournaments.value.push(newTournament)

      // Check if this is now the current tournament based on dates
      const now = new Date()
      const startDate = new Date(newTournament.startDate)
      const endDate = new Date(newTournament.endDate)

      if (now >= startDate && now <= endDate) {
        activeTournament.value = newTournament
      }

      return newTournament
    } catch (e) {
      console.error('Error creating tournament:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create tournament'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateTournament(id: number, tournamentData: UpdateTournamentDTO) {
    loading.value = true
    error.value = null

    try {
      await api.tournaments.update(id, tournamentData)

      // Update the tournament in the local state
      const index = tournaments.value.findIndex(tournament => tournament.id === id)
      if (index !== -1) {
        tournaments.value[index] = { ...tournaments.value[index], ...tournamentData }
      }

      // Also update currentTournament if it's the one being updated
      if (currentTournament.value && currentTournament.value.id === id) {
        currentTournament.value = { ...currentTournament.value, ...tournamentData }
      }

      // Also update activeTournament if it's the one being updated
      if (activeTournament.value && activeTournament.value.id === id) {
        activeTournament.value = { ...activeTournament.value, ...tournamentData }
      }

      // Re-fetch current tournament in case the dates changed and this affects which tournament is current
      const now = new Date()
      const startDate = new Date(tournamentData.startDate)
      const endDate = new Date(tournamentData.endDate)

      // If the tournament was current but dates changed so it's no longer current
      if (activeTournament.value && activeTournament.value.id === id &&
        (now < startDate || now > endDate)) {
        await fetchCurrentTournament()
      }
      // If the tournament wasn't current but dates changed so it's now current
      else if ((!activeTournament.value || activeTournament.value.id !== id) &&
        now >= startDate && now <= endDate) {
        await fetchCurrentTournament()
      }

      return true
    } catch (e) {
      console.error(`Error updating tournament ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to update tournament #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteTournament(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.tournaments.delete(id)

      // Remove the tournament from the local state
      tournaments.value = tournaments.value.filter(tournament => tournament.id !== id)

      // Clear currentTournament if it's the one being deleted
      if (currentTournament.value && currentTournament.value.id === id) {
        currentTournament.value = null
      }

      // Clear activeTournament if it's the one being deleted
      if (activeTournament.value && activeTournament.value.id === id) {
        activeTournament.value = null
        // Fetch the new current tournament
        await fetchCurrentTournament()
      }

      return true
    } catch (e) {
      console.error(`Error deleting tournament ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to delete tournament #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  // Check if a date range overlaps with any existing tournament
  function hasDateConflict(startDate: string, endDate: string, excludeId?: number): boolean {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()

    return tournaments.value.some(tournament => {
      if (excludeId && tournament.id === excludeId) return false

      const tournamentStart = new Date(tournament.startDate).getTime()
      const tournamentEnd = new Date(tournament.endDate).getTime()

      // Check for overlap
      return (start <= tournamentEnd && end >= tournamentStart)
    })
  }

  // Get remaining days for a tournament
  function getRemainingDays(tournamentId: number): number {
    const tournament = getTournamentById(tournamentId)
    if (!tournament) return 0

    const endDate = new Date(tournament.endDate)
    const today = new Date()

    // Set time to midnight for accurate day calculation
    endDate.setHours(23, 59, 59, 999)
    today.setHours(0, 0, 0, 0)

    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
  }

  // Clear the current tournament selection
  function clearCurrentTournament() {
    currentTournament.value = null
  }

  // Reset store state
  function reset() {
    tournaments.value = []
    currentTournament.value = null
    activeTournament.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    // State
    tournaments,
    currentTournament,
    activeTournament,
    loading,
    error,
    initialized,

    // Getters/Computed
    tournamentCount,
    upcomingTournaments,
    pastTournaments,
    tournamentOptions,
    getTournamentById,

    // Actions
    fetchAllTournaments,
    fetchCurrentTournament,
    fetchTournamentById,
    createTournament,
    updateTournament,
    deleteTournament,
    hasDateConflict,
    getRemainingDays,
    clearCurrentTournament,
    reset
  }
})