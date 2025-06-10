import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'

interface StringJob {
  id: number
  playerId: number
  player?: Player
  racquetId: number
  racquet?: Racquet
  mainStringId?: number
  mainString?: StringType
  crossStringId?: number
  crossString?: StringType
  stringerId?: number
  stringer?: Stringer
  tournamentId?: number
  tournament?: Tournament
  createdAt: string
  completedAt?: string
  dueDate?: string
  mainTension: number
  crossTension?: number
  isTensionInKg: boolean
  logo?: string
  status: string
  notes?: string
  priority?: number
  price?: number
  isPaid: boolean
}

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
}

interface StringType {
  id: number
  brand: string
  model: string
  gauge?: string
  material?: string
  color?: string
}

interface Stringer {
  id: number
  name: string
  lastName: string
  email?: string
  phoneNumber?: string
}

interface Tournament {
  id: number
  name: string
  startDate: string
  endDate: string
  location?: string
  category?: string
}

interface CreateStringJobDTO {
  playerId: number
  racquetId: number
  mainStringId?: number
  crossStringId?: number
  stringerId?: number
  tournamentId?: number
  mainTension: number
  crossTension?: number
  isTensionInKg: boolean
  logo?: string
  dueDate?: string
  notes?: string
  price?: number
  priority?: number
}

interface UpdateStringJobDTO {
  mainStringId?: number
  crossStringId?: number
  stringerId?: number
  mainTension: number
  crossTension?: number
  isTensionInKg: boolean
  logo?: string
  dueDate?: string
  status: string
  notes?: string
  priority?: number
  price?: number
}

interface CompleteStringJobDTO {
  completedAt: string
  notes?: string
}

export const useStringJobStore = defineStore('stringJob', () => {
  const stringJobs = ref<StringJob[]>([])
  const currentJob = ref<StringJob | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchType = ref<'all' | 'status' | 'tournament' | 'player' | 'stringer' | 'player-unpaid' | null>(null)
  const lastFetchValue = ref<string | number | null>(null)

  const pendingJobs = computed(() => stringJobs.value.filter(job => job.status === 'Pending'))
  const inProgressJobs = computed(() => stringJobs.value.filter(job => job.status === 'InProgress'))
  const completedJobs = computed(() => stringJobs.value.filter(job => job.status === 'Completed'))
  const cancelledJobs = computed(() => stringJobs.value.filter(job => job.status === 'Cancelled'))

  const highPriorityJobs = computed(() =>
    stringJobs.value.filter(job =>
      (job.status === 'Pending' || job.status === 'InProgress') && job.priority === 1
    )
  )

  const todayCompletedJobs = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return completedJobs.value.filter(job =>
      job.completedAt && job.completedAt.startsWith(today)
    )
  })

  async function fetchAllJobs() {
    loading.value = true
    error.value = null

    try {
      stringJobs.value = await api.stringJobs.getAll()
      lastFetchType.value = 'all'
      lastFetchValue.value = null
      return stringJobs.value
    } catch (e) {
      console.error('Error fetching all string jobs:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch string jobs'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchJobsByStatus(status: string) {
    loading.value = true
    error.value = null

    try {
      stringJobs.value = await api.stringJobs.getByStatus(status)
      lastFetchType.value = 'status'
      lastFetchValue.value = status
      return stringJobs.value
    } catch (e) {
      console.error(`Error fetching ${status} string jobs:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch ${status} string jobs`
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchJobsByTournament(tournamentId: number) {
    loading.value = true
    error.value = null

    try {
      stringJobs.value = await api.stringJobs.getByTournament(tournamentId)
      lastFetchType.value = 'tournament'
      lastFetchValue.value = tournamentId
      return stringJobs.value
    } catch (e) {
      console.error(`Error fetching string jobs for tournament ${tournamentId}:`, e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch tournament string jobs'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchJobsByPlayer(playerId: number) {
    loading.value = true
    error.value = null

    try {
      const jobs = await api.stringJobs.getByPlayer(playerId)

      stringJobs.value = jobs
      lastFetchType.value = 'player'
      lastFetchValue.value = playerId

      return stringJobs.value
    } catch (e) {
      console.error(`Error fetching string jobs for player ${playerId}:`, e)

      error.value = e instanceof Error
        ? e.message
        : `No se pudieron cargar los trabajos del jugador #${playerId}. El jugador puede no existir.`

      stringJobs.value = []

      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchJobsByStringer(stringerId: number) {
    loading.value = true
    error.value = null

    try {
      stringJobs.value = await api.stringJobs.getByStringer(stringerId)
      lastFetchType.value = 'stringer'
      lastFetchValue.value = stringerId
      return stringJobs.value
    } catch (e) {
      console.error(`Error fetching string jobs for stringer ${stringerId}:`, e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch stringer string jobs'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchJobById(id: number) {
    loading.value = true
    error.value = null

    try {
      const job = await api.stringJobs.getById(id)
      currentJob.value = job
      return job
    } catch (e) {
      console.error(`Error fetching string job ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch string job #${id}`
      return null
    } finally {
      loading.value = false
    }
  }

  async function createJob(jobData: CreateStringJobDTO) {
    loading.value = true
    error.value = null

    try {
      const newJob = await api.stringJobs.create(jobData)
      if (shouldAddJobToCurrentList(newJob)) {
        stringJobs.value = [...stringJobs.value, newJob]
      }
      return newJob
    } catch (e) {
      console.error('Error creating string job:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create string job'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateJob(id: number, jobData: UpdateStringJobDTO) {
    loading.value = true
    error.value = null

    try {
      await api.stringJobs.update(id, jobData)

      const index = stringJobs.value.findIndex(job => job.id === id)
      if (index !== -1) {
        stringJobs.value[index] = { ...stringJobs.value[index], ...jobData }
      }

      if (currentJob.value && currentJob.value.id === id) {
        currentJob.value = { ...currentJob.value, ...jobData }
      }

      await fetchJobById(id)

      if (jobData.status && lastFetchType.value === 'status') {
        refreshCurrentJobList()
      }

      return true
    } catch (e) {
      console.error(`Error updating string job ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to update string job #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function completeJob(id: number, completeData: CompleteStringJobDTO) {
    loading.value = true
    error.value = null

    try {
      await api.stringJobs.complete(id, completeData)

      const index = stringJobs.value.findIndex(job => job.id === id)
      if (index !== -1) {
        stringJobs.value[index] = {
          ...stringJobs.value[index],
          status: 'Completed',
          completedAt: completeData.completedAt,
          notes: completeData.notes
            ? `${stringJobs.value[index].notes || ''}\n${completeData.notes}`.trim()
            : stringJobs.value[index].notes
        }
      }

      if (currentJob.value && currentJob.value.id === id) {
        currentJob.value = {
          ...currentJob.value,
          status: 'Completed',
          completedAt: completeData.completedAt,
          notes: completeData.notes
            ? `${currentJob.value.notes || ''}\n${completeData.notes}`.trim()
            : currentJob.value.notes
        }
      }

      if (lastFetchType.value === 'status') {
        refreshCurrentJobList()
      }

      return true
    } catch (e) {
      console.error(`Error completing string job ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to complete string job #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function cancelJob(id: number, cancelReason?: string) {
    loading.value = true
    error.value = null

    try {
      await api.stringJobs.cancel(id, cancelReason || '')

      const index = stringJobs.value.findIndex(job => job.id === id)
      if (index !== -1) {
        stringJobs.value[index] = {
          ...stringJobs.value[index],
          status: 'Cancelled',
          notes: cancelReason
            ? `${stringJobs.value[index].notes || ''}\nCancelled: ${cancelReason}`.trim()
            : stringJobs.value[index].notes
        }
      }

      if (currentJob.value && currentJob.value.id === id) {
        currentJob.value = {
          ...currentJob.value,
          status: 'Cancelled',
          notes: cancelReason
            ? `${currentJob.value.notes || ''}\nCancelled: ${cancelReason}`.trim()
            : currentJob.value.notes
        }
      }

      if (lastFetchType.value === 'status') {
        refreshCurrentJobList()
      }

      return true
    } catch (e) {
      console.error(`Error cancelling string job ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to cancel string job #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function startJob(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.stringJobs.start(id)

      const index = stringJobs.value.findIndex(job => job.id === id)
      if (index !== -1) {
        stringJobs.value[index] = { ...stringJobs.value[index], status: 'InProgress' }
      }

      if (currentJob.value && currentJob.value.id === id) {
        currentJob.value = { ...currentJob.value, status: 'InProgress' }
      }

      if (lastFetchType.value === 'status') {
        refreshCurrentJobList()
      }

      return true
    } catch (e) {
      console.error(`Error starting string job ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to start string job #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteJob(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.stringJobs.delete(id)

      stringJobs.value = stringJobs.value.filter(job => job.id !== id)

      if (currentJob.value && currentJob.value.id === id) {
        currentJob.value = null
      }

      return true
    } catch (e) {
      console.error(`Error deleting string job ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to delete string job #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchUnpaidJobsByPlayer(playerId: number) {
    loading.value = true
    error.value = null

    try {
      stringJobs.value = await api.stringJobs.getUnpaidByPlayer(playerId)
      lastFetchType.value = 'player-unpaid'
      lastFetchValue.value = playerId
      return stringJobs.value
    } catch (e) {
      console.error(`Error fetching unpaid string jobs for player ${playerId}:`, e)
      error.value = e instanceof Error
        ? e.message
        : `No se pudieron cargar los trabajos pendientes de pago del jugador #${playerId}.`

      stringJobs.value = []

      return []
    } finally {
      loading.value = false
    }
  }

  async function markJobAsPaid(id: number) {
    loading.value = true
    error.value = null

    try {
      await api.stringJobs.markAsPaid(id)

      const index = stringJobs.value.findIndex(job => job.id === id)
      if (index !== -1) {
        stringJobs.value[index] = { ...stringJobs.value[index], isPaid: true }

        if (lastFetchType.value === 'player-unpaid') {
          stringJobs.value = stringJobs.value.filter(job => job.id !== id)
        }
      }

      if (currentJob.value && currentJob.value.id === id) {
        currentJob.value = { ...currentJob.value, isPaid: true }
      }

      return true
    } catch (e) {
      console.error(`Error marking string job ${id} as paid:`, e)
      error.value = e instanceof Error ? e.message : `Failed to mark job #${id} as paid`
      return false
    } finally {
      loading.value = false
    }
  }

  function shouldAddJobToCurrentList(job: StringJob): boolean {
    if (!lastFetchType.value) return false

    switch (lastFetchType.value) {
      case 'all':
        return true
      case 'status':
        return job.status === lastFetchValue.value
      case 'tournament':
        return job.tournamentId === lastFetchValue.value
      case 'player':
        return job.playerId === lastFetchValue.value
      case 'stringer':
        return job.stringerId === lastFetchValue.value
      default:
        return false
    }
  }

  async function refreshCurrentJobList() {
    if (!lastFetchType.value) return

    switch (lastFetchType.value) {
      case 'all':
        await fetchAllJobs()
        break
      case 'status':
        await fetchJobsByStatus(lastFetchValue.value as string)
        break
      case 'tournament':
        await fetchJobsByTournament(lastFetchValue.value as number)
        break
      case 'player':
        await fetchJobsByPlayer(lastFetchValue.value as number)
        break
      case 'stringer':
        await fetchJobsByStringer(lastFetchValue.value as number)
        break
    }
  }

  function clearCurrentJob() {
    currentJob.value = null
  }

  return {
    stringJobs,
    currentJob,
    loading,
    error,
    pendingJobs,
    inProgressJobs,
    completedJobs,
    cancelledJobs,
    highPriorityJobs,
    todayCompletedJobs,

    fetchAllJobs,
    fetchJobsByStatus,
    fetchJobsByTournament,
    fetchJobsByPlayer,
    fetchJobsByStringer,
    fetchJobById,
    createJob,
    updateJob,
    completeJob,
    cancelJob,
    startJob,
    deleteJob,
    refreshCurrentJobList,
    clearCurrentJob,
    fetchUnpaidJobsByPlayer,
    markJobAsPaid,

    clearJobs: () => {
      stringJobs.value = []
      lastFetchType.value = null
      lastFetchValue.value = null
    }
  }
})