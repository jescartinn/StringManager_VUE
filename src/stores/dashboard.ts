import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/apiService'

// Define dashboard data types
interface DashboardStats {
  pendingJobs: number
  inProgressJobs: number
  completedJobsToday: number
  highPriorityJobs: number
  currentTournament: CurrentTournament | null
  topStringers: TopStringer[]
  topPlayers: TopPlayer[]
  topStrings: TopString[]
}

interface CurrentTournament {
  id: number
  name: string
  remainingDays: number
}

interface TopStringer {
  stringerId: number
  stringerName: string
  completedJobs: number
}

interface TopPlayer {
  playerId: number
  playerName: string
  totalJobs: number
}

interface TopString {
  stringId: number
  stringName: string
  totalUses: number
}

interface DistributionStats {
  statusDistribution: StatusDistribution[]
  tensionDistribution: TensionDistribution[]
  stringBrandDistribution: StringBrandDistribution[]
}

interface StatusDistribution {
  status: string
  count: number
}

interface TensionDistribution {
  range: string
  count: number
}

interface StringBrandDistribution {
  brand: string
  count: number
}

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const dashboardStats = ref<DashboardStats | null>(null)
  const distributionStats = ref<DistributionStats | null>(null)
  const currentTournamentDistribution = ref<DistributionStats | null>(null)
  const loading = ref(false)
  const distributionLoading = ref(false)
  const error = ref<string | null>(null)
  const distributionError = ref<string | null>(null)
  const lastFetchTime = ref<Date | null>(null)
  const lastDistributionFetchTime = ref<Date | null>(null)

  // Actions
  async function fetchDashboardStats(forceRefresh = false) {
    // If we have recent data and force refresh is not requested, return cached data
    const now = new Date()
    if (!forceRefresh && dashboardStats.value && lastFetchTime.value) {
      const timeDiff = now.getTime() - lastFetchTime.value.getTime()
      // Return cached data if it's less than 5 minutes old
      if (timeDiff < 5 * 60 * 1000) {
        return dashboardStats.value
      }
    }
    
    loading.value = true
    error.value = null
    
    try {
      const stats = await api.dashboard.getStats()
      dashboardStats.value = stats
      lastFetchTime.value = now
      return stats
    } catch (e) {
      console.error('Error fetching dashboard stats:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch dashboard statistics'
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchDistributionStats(tournamentId?: number, forceRefresh = false) {
    // If requesting specific tournament data, always fetch fresh
    // Otherwise check if we have recent data
    const now = new Date()
    if (!tournamentId && !forceRefresh && distributionStats.value && lastDistributionFetchTime.value) {
      const timeDiff = now.getTime() - lastDistributionFetchTime.value.getTime()
      // Return cached data if it's less than 5 minutes old
      if (timeDiff < 5 * 60 * 1000) {
        return distributionStats.value
      }
    }
    
    // If requesting current tournament data and we have it cached
    if (tournamentId && !forceRefresh && currentTournamentDistribution.value && 
        dashboardStats.value?.currentTournament?.id === tournamentId) {
      return currentTournamentDistribution.value
    }
    
    distributionLoading.value = true
    distributionError.value = null
    
    try {
      const stats = await api.dashboard.getDistribution(tournamentId)
      
      if (tournamentId) {
        // Store tournament-specific distribution
        currentTournamentDistribution.value = stats
      } else {
        // Store overall distribution
        distributionStats.value = stats
        lastDistributionFetchTime.value = now
      }
      
      return stats
    } catch (e) {
      console.error('Error fetching distribution stats:', e)
      distributionError.value = e instanceof Error ? e.message : 'Failed to fetch distribution statistics'
      return null
    } finally {
      distributionLoading.value = false
    }
  }

  // Helper to transform distribution data for charts
  function getStatusDistributionForChart() {
    if (!distributionStats.value?.statusDistribution) return []
    
    return distributionStats.value.statusDistribution.map(item => ({
      name: item.status,
      value: item.count
    }))
  }

  function getTensionDistributionForChart() {
    if (!distributionStats.value?.tensionDistribution) return []
    
    return distributionStats.value.tensionDistribution.map(item => ({
      name: item.range,
      value: item.count
    }))
  }

  function getStringBrandDistributionForChart() {
    if (!distributionStats.value?.stringBrandDistribution) return []
    
    return distributionStats.value.stringBrandDistribution.map(item => ({
      name: item.brand,
      value: item.count
    }))
  }

  // Refresh all dashboard data
  async function refreshAllData() {
    await Promise.all([
      fetchDashboardStats(true),
      fetchDistributionStats(undefined, true)
    ])
  }

  // Reset store state
  function reset() {
    dashboardStats.value = null
    distributionStats.value = null
    currentTournamentDistribution.value = null
    loading.value = false
    distributionLoading.value = false
    error.value = null
    distributionError.value = null
    lastFetchTime.value = null
    lastDistributionFetchTime.value = null
  }

  return {
    // State
    dashboardStats,
    distributionStats,
    currentTournamentDistribution,
    loading,
    distributionLoading,
    error,
    distributionError,
    lastFetchTime,
    lastDistributionFetchTime,
    
    // Actions
    fetchDashboardStats,
    fetchDistributionStats,
    getStatusDistributionForChart,
    getTensionDistributionForChart,
    getStringBrandDistributionForChart,
    refreshAllData,
    reset
  }
})