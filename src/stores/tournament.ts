import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

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
  const tournaments = ref<Tournament[]>([])
  const currentTournament = ref<Tournament | null>(null)
  const activeTournament = ref<Tournament | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

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

  const getTournamentById = (id: number) => {
    return tournaments.value.find(tournament => tournament.id === id) || null
  }

  async function fetchAllTournaments() {
    if (tournaments.value.length > 0 && initialized.value) {
      return tournaments.value
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

      if (tournament && !tournaments.value.find(t => t.id === tournament.id)) {
        tournaments.value.push(tournament)
      }

      return tournament
    } catch (e) {
      console.error('Error fetching current tournament:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch current tournament'
      activeTournament.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchTournamentById(id: number, forceRefresh = false) {
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

      const index = tournaments.value.findIndex(tournament => tournament.id === id)
      if (index !== -1) {
        tournaments.value[index] = { ...tournaments.value[index], ...tournamentData }
      }

      if (currentTournament.value && currentTournament.value.id === id) {
        currentTournament.value = { ...currentTournament.value, ...tournamentData }
      }

      if (activeTournament.value && activeTournament.value.id === id) {
        activeTournament.value = { ...activeTournament.value, ...tournamentData }
      }

      const now = new Date()
      const startDate = new Date(tournamentData.startDate)
      const endDate = new Date(tournamentData.endDate)

      if (activeTournament.value && activeTournament.value.id === id &&
        (now < startDate || now > endDate)) {
        await fetchCurrentTournament()
      }
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

      tournaments.value = tournaments.value.filter(tournament => tournament.id !== id)

      if (currentTournament.value && currentTournament.value.id === id) {
        currentTournament.value = null
      }

      if (activeTournament.value && activeTournament.value.id === id) {
        activeTournament.value = null
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

  function hasDateConflict(startDate: string, endDate: string, excludeId?: number): boolean {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()

    return tournaments.value.some(tournament => {
      if (excludeId && tournament.id === excludeId) return false

      const tournamentStart = new Date(tournament.startDate).getTime()
      const tournamentEnd = new Date(tournament.endDate).getTime()

      return (start <= tournamentEnd && end >= tournamentStart)
    })
  }

  function getRemainingDays(tournamentId: number): number {
    const tournament = getTournamentById(tournamentId)
    if (!tournament) return 0

    const endDate = new Date(tournament.endDate)
    const today = new Date()

    endDate.setHours(23, 59, 59, 999)
    today.setHours(0, 0, 0, 0)

    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
  }

  function clearCurrentTournament() {
    currentTournament.value = null
  }

  function reset() {
    tournaments.value = []
    currentTournament.value = null
    activeTournament.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    tournaments,
    currentTournament,
    activeTournament,
    loading,
    error,
    initialized,
    tournamentCount,
    upcomingTournaments,
    pastTournaments,
    tournamentOptions,
    
    getTournamentById,
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