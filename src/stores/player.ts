import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

interface Player {
  id: number
  name: string
  lastName: string
  countryCode?: string
}

interface CreatePlayerDTO {
  name: string
  lastName: string
  countryCode?: string
}

interface UpdatePlayerDTO {
  name: string
  lastName: string
  countryCode?: string
}

export const usePlayerStore = defineStore('player', () => {
  const players = ref<Player[]>([])
  const currentPlayer = ref<Player | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const playerCount = computed(() => players.value.length)

  const playerOptions = computed(() => {
    return players.value.map(player => ({
      value: player.id,
      text: `${player.name} ${player.lastName}`,
      player
    }))
  })

  const getPlayerById = (id: number) => {
    return players.value.find(player => player.id === id) || null
  }

  const getPlayerFullName = (id: number) => {
    const player = getPlayerById(id)
    return player ? `${player.name} ${player.lastName}` : 'Unknown'
  }

  async function fetchPlayers() {
    if (players.value.length > 0 && initialized.value) {
      return players.value
    }

    loading.value = true
    error.value = null

    try {
      players.value = await api.players.getAll()
      initialized.value = true
      return players.value
    } catch (e) {
      console.error('Error fetching players:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch players'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchPlayerById(id: number, forceRefresh = false) {
    if (!forceRefresh) {
      const existingPlayer = getPlayerById(id)
      if (existingPlayer) {
        currentPlayer.value = existingPlayer
        return existingPlayer
      }
    }

    loading.value = true
    error.value = null

    try {
      const player = await api.players.getById(id)

      if (!player) {
        currentPlayer.value = null
        return null
      }

      currentPlayer.value = player

      const index = players.value.findIndex(p => p.id === id)
      if (index !== -1) {
        players.value[index] = player
      } else {
        players.value.push(player)
      }

      return player
    } catch (e) {
      console.error(`Error fetching player ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch player #${id}`
      return null
    } finally {
      loading.value = false
    }
  }

  async function createPlayer(playerData: CreatePlayerDTO) {
    loading.value = true
    error.value = null

    try {
      const newPlayer = await api.players.create(playerData)
      players.value.push(newPlayer)
      return newPlayer
    } catch (e) {
      console.error('Error creating player:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create player'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePlayer(id: number, playerData: UpdatePlayerDTO) {
    loading.value = true
    error.value = null

    try {
      await api.players.update(id, playerData)

      const index = players.value.findIndex(player => player.id === id)
      if (index !== -1) {
        players.value[index] = { ...players.value[index], ...playerData }
      }

      if (currentPlayer.value && currentPlayer.value.id === id) {
        currentPlayer.value = { ...currentPlayer.value, ...playerData }
      }

      return true
    } catch (e) {
      console.error(`Error updating player ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to update player #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function deletePlayer(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.players.delete(id)

      players.value = players.value.filter(player => player.id !== id)

      if (currentPlayer.value && currentPlayer.value.id === id) {
        currentPlayer.value = null
      }

      return true
    } catch (e) {
      console.error(`Error deleting player ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to delete player #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  function clearCurrentPlayer() {
    currentPlayer.value = null
  }

  function reset() {
    players.value = []
    currentPlayer.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    players,
    currentPlayer,
    loading,
    error,
    initialized,
    playerCount,
    playerOptions,

    getPlayerById,
    getPlayerFullName,
    fetchPlayers,
    fetchPlayerById,
    createPlayer,
    updatePlayer,
    deletePlayer,
    clearCurrentPlayer,
    reset
  }
})