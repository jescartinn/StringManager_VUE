<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTournamentStore, useStringJobStore, useAuthStore } from '../stores'
import { getTournamentDateInfo, formatDate as formatDateUtil } from '../utils/dateUtils'

const tournamentStore = useTournamentStore()
const stringJobStore = useStringJobStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const jobsLoading = ref(true)
const showEditTournamentDialog = ref(false)
const showDeleteConfirmation = ref(false)

const tournamentId = computed(() => {
  return route.params.id ? parseInt(route.params.id as string) : null
})

const tournament = computed(() => tournamentStore.currentTournament)

const tournamentForm = ref({
  id: null as number | null,
  name: '',
  startDate: '',
  endDate: '',
  location: '',
  category: ''
})

const formErrors = ref({
  name: '',
  startDate: '',
  endDate: '',
  location: '',
  category: ''
})

const tournamentCategories = ref([
  'Grand Slam',
  'ATP 1000',
  'ATP 500',
  'ATP 250',
  'WTA 1000',
  'WTA 500',
  'WTA 250',
  'ATP 1000/WTA 1000',
  'ATP 500/WTA 500',
  'ATP 250/WTA 250',
  'Challenger 125',
  'Challenger 100',
  'Challenger 75',
  'Challenger 50',
  'ITF',
  'Exhibition',
  'Other'
])

const canManageTournaments = computed(() => {
  return authStore.isAdmin
})

const isCurrentTournament = computed(() => {
  if (!tournament.value || !tournamentStore.activeTournament) return false
  return tournament.value.id === tournamentStore.activeTournament.id
})

onMounted(async () => {
  if (tournamentId.value) {
    try {
      await tournamentStore.fetchTournamentById(tournamentId.value)
      jobsLoading.value = true
      await stringJobStore.fetchJobsByTournament(tournamentId.value)
      jobsLoading.value = false
    } catch (error) {
      console.error('Error loading tournament details:', error)
    } finally {
      loading.value = false
    }
  } else {
    router.replace('/tournaments')
  }
})

watch(() => tournamentId.value, async (newTournamentId) => {
  if (newTournamentId) {
    loading.value = true
    jobsLoading.value = true

    try {
      await tournamentStore.fetchTournamentById(newTournamentId)
      await stringJobStore.fetchJobsByTournament(newTournamentId)
    } catch (error) {
      console.error('Error loading tournament details:', error)
    } finally {
      loading.value = false
      jobsLoading.value = false
    }
  }
})

const sortedJobs = computed(() => {
  return [...stringJobStore.stringJobs].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const formatDate = (dateString: string) => {
  return formatDateUtil(dateString)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return 'warning'
    case 'InProgress': return 'info'
    case 'Completed': return 'success'
    case 'Cancelled': return 'error'
    default: return 'grey'
  }
}

const getTournamentStatus = () => {
  if (!tournament.value) return { text: 'Unknown', color: 'grey' }

  const dateInfo = getTournamentDateInfo(tournament.value.startDate, tournament.value.endDate)
  return {
    text: dateInfo.statusText,
    color: dateInfo.statusColor
  }
}

const getDateInfo = () => {
  if (!tournament.value) return { text: '', days: 0 }

  const dateInfo = getTournamentDateInfo(tournament.value.startDate, tournament.value.endDate)
  return {
    text: dateInfo.daysText,
    days: dateInfo.daysValue
  }
}

const goBack = () => {
  router.back()
}

const returnToTournamentsList = () => {
  router.push('/tournaments')
}

const openEditTournamentDialog = () => {
  if (!tournament.value) return

  tournamentForm.value = {
    id: tournament.value.id,
    name: tournament.value.name,
    startDate: tournament.value.startDate.split('T')[0],
    endDate: tournament.value.endDate.split('T')[0],
    location: tournament.value.location || '',
    category: tournament.value.category || ''
  }

  formErrors.value = {
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    category: ''
  }

  showEditTournamentDialog.value = true
}

const openDeleteDialog = () => {
  showDeleteConfirmation.value = true
}

const validateTournamentForm = () => {
  let isValid = true

  if (!tournamentForm.value.name.trim()) {
    formErrors.value.name = 'Tournament name is required'
    isValid = false
  } else {
    formErrors.value.name = ''
  }

  if (!tournamentForm.value.startDate) {
    formErrors.value.startDate = 'Start date is required'
    isValid = false
  } else {
    formErrors.value.startDate = ''
  }

  if (!tournamentForm.value.endDate) {
    formErrors.value.endDate = 'End date is required'
    isValid = false
  } else {
    const startDate = new Date(tournamentForm.value.startDate)
    const endDate = new Date(tournamentForm.value.endDate)

    if (endDate < startDate) {
      formErrors.value.endDate = 'End date must be after start date'
      isValid = false
    } else {
      formErrors.value.endDate = ''
    }
  }

  if (isValid) {
    const hasConflict = tournamentStore.hasDateConflict(
      tournamentForm.value.startDate,
      tournamentForm.value.endDate,
      tournamentForm.value.id || undefined
    )

    if (hasConflict) {
      formErrors.value.startDate = 'Tournament dates conflict with another tournament'
      formErrors.value.endDate = 'Tournament dates conflict with another tournament'
      isValid = false
    }
  }

  return isValid
}

const submitEditTournament = async () => {
  if (!validateTournamentForm() || !tournamentForm.value.id) return

  try {
    await tournamentStore.updateTournament(tournamentForm.value.id, {
      name: tournamentForm.value.name,
      startDate: tournamentForm.value.startDate,
      endDate: tournamentForm.value.endDate,
      location: tournamentForm.value.location || undefined,
      category: tournamentForm.value.category || undefined
    })

    showEditTournamentDialog.value = false

    await tournamentStore.fetchCurrentTournament()
  } catch (error) {
    console.error('Error updating tournament:', error)
  }
}

const deleteTournament = async () => {
  if (!tournament.value) return

  try {
    await tournamentStore.deleteTournament(tournament.value.id)
    showDeleteConfirmation.value = false

    router.push('/tournaments')

    await tournamentStore.fetchCurrentTournament()
  } catch (error) {
    console.error('Error deleting tournament:', error)
  }
}

const createNewStringJob = () => {
  if (!tournament.value) return
  router.push(`/jobs/new?tournamentId=${tournament.value.id}`)
}

const viewStringJob = (jobId: number) => {
  router.push(`/jobs/${jobId}`)
}

const jobStatistics = computed(() => {
  if (stringJobStore.stringJobs.length === 0) return { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 }

  return {
    total: stringJobStore.stringJobs.length,
    pending: stringJobStore.stringJobs.filter(job => job.status === 'Pending').length,
    inProgress: stringJobStore.stringJobs.filter(job => job.status === 'InProgress').length,
    completed: stringJobStore.stringJobs.filter(job => job.status === 'Completed').length,
    cancelled: stringJobStore.stringJobs.filter(job => job.status === 'Cancelled').length
  }
})

const isTournamentEnded = computed(() => {
  if (!tournament.value) return false
  const endDate = new Date(tournament.value.endDate)
  const today = new Date()
  return today > endDate
})

const isTournamentStarted = computed(() => {
  if (!tournament.value) return false
  const startDate = new Date(tournament.value.startDate)
  const today = new Date()
  return today >= startDate
})
</script>

<template>
  <div class="tournament-details">
    <v-container class="tournament-details__container">

      <!-- Page Header with Navigation -->
      <v-row>
        <v-col cols="12" sm="8">
          <div class="d-flex align-center">
            <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-2"></v-btn>
            <h1 class="tournament-details__title" v-if="tournament">
              {{ tournament.name }}
            </h1>
          </div>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn color="primary" prepend-icon="mdi-format-list-bulleted" @click="returnToTournamentsList">
            All Tournaments
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error Alert -->
      <v-row class="mb-3" v-if="tournamentStore.error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable>
            {{ tournamentStore.error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <!-- Tournament Not Found -->
      <v-card v-else-if="!tournament" class="text-center pa-8 mb-6 mt-6">
        <v-icon icon="mdi-alert-circle" size="64" color="warning" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">Tournament Not Found</h3>
        <p class="mb-6">The requested tournament could not be found or you don't have permission to view it.</p>
        <v-btn color="primary" @click="returnToTournamentsList">Return to Tournaments List</v-btn>
      </v-card>

      <!-- Tournament Details Content -->
      <div v-else class="tournament-details__content">

        <!-- Tournament Information Card -->
        <v-card class="mb-6">
          <v-card-title class="tournament-details__section-title">
            <v-icon start>mdi-trophy</v-icon>
            Tournament Information

            <!-- Current Tournament Badge -->
            <v-chip v-if="isCurrentTournament" color="success" size="small" class="ml-2">Current</v-chip>
          </v-card-title>

          <v-card-text class="pa-4">
            <v-row>

              <!-- Tournament Info -->
              <v-col cols="12" md="6">
                <div class="tournament-details__info-section">
                  <div class="tournament-details__info-item">
                    <span class="tournament-details__info-label">Name:</span>
                    <span class="tournament-details__info-value">{{ tournament.name }}</span>
                  </div>

                  <div class="tournament-details__info-item">
                    <span class="tournament-details__info-label">Dates:</span>
                    <span class="tournament-details__info-value">
                      {{ formatDate(tournament.startDate) }} to {{ formatDate(tournament.endDate) }}
                    </span>
                  </div>

                  <div class="tournament-details__info-item" v-if="tournament.location">
                    <span class="tournament-details__info-label">Location:</span>
                    <span class="tournament-details__info-value">{{ tournament.location }}</span>
                  </div>

                  <div class="tournament-details__info-item" v-if="tournament.category">
                    <span class="tournament-details__info-label">Category:</span>
                    <span class="tournament-details__info-value">{{ tournament.category }}</span>
                  </div>
                </div>
              </v-col>

              <!-- Status Info -->
              <v-col cols="12" md="6">
                <div class="tournament-details__status-card">
                  <div class="tournament-details__status-header">
                    <v-chip :color="getTournamentStatus().color" size="large">
                      {{ getTournamentStatus().text }}
                    </v-chip>
                  </div>

                  <div class="tournament-details__status-info">
                    <div class="tournament-details__status-days">
                      <span class="tournament-details__info-label">{{ getDateInfo().text }}:</span>
                      <span class="tournament-details__info-value tournament-details__days-value">
                        {{ getDateInfo().days }}
                      </span>
                    </div>

                    <div class="tournament-details__status-progress" v-if="isTournamentStarted && !isTournamentEnded">
                      <span class="tournament-details__info-label">Progress:</span>
                      <v-progress-linear color="primary" height="12" rounded
                        :model-value="tournamentStore.getRemainingDays(tournament.id) / 100">
                      </v-progress-linear>
                    </div>
                  </div>
                </div>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex justify-end" v-if="canManageTournaments">
              <v-btn color="primary" variant="text" prepend-icon="mdi-pencil" class="mr-2"
                @click="openEditTournamentDialog">
                Edit
              </v-btn>
              <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="openDeleteDialog">
                Delete
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Tournament Statistics -->
        <v-card class="mb-6">
          <v-card-title class="tournament-details__section-title">
            <v-icon start>mdi-chart-bar</v-icon>
            Tournament Statistics
          </v-card-title>

          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="6" sm="3">
                <div class="tournament-details__stat-card">
                  <div class="tournament-details__stat-value">{{ jobStatistics.total }}</div>
                  <div class="tournament-details__stat-label">Total Jobs</div>
                </div>
              </v-col>

              <v-col cols="6" sm="3">
                <div class="tournament-details__stat-card tournament-details__stat-card--pending">
                  <div class="tournament-details__stat-value">{{ jobStatistics.pending }}</div>
                  <div class="tournament-details__stat-label">Pending</div>
                </div>
              </v-col>

              <v-col cols="6" sm="3">
                <div class="tournament-details__stat-card tournament-details__stat-card--in-progress">
                  <div class="tournament-details__stat-value">{{ jobStatistics.inProgress }}</div>
                  <div class="tournament-details__stat-label">In Progress</div>
                </div>
              </v-col>

              <v-col cols="6" sm="3">
                <div class="tournament-details__stat-card tournament-details__stat-card--completed">
                  <div class="tournament-details__stat-value">{{ jobStatistics.completed }}</div>
                  <div class="tournament-details__stat-label">Completed</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Tournament's String Jobs -->
        <v-card>
          <v-card-title class="tournament-details__section-title d-flex flex-wrap justify-space-between align-center">
            <div>
              <v-icon start>mdi-tennis</v-icon>
              String Jobs
            </div>
            <v-btn v-if="canManageTournaments" color="primary" size="small" prepend-icon="mdi-plus"
              @click="createNewStringJob">
              New String Job
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-table v-if="!jobsLoading && sortedJobs.length > 0" class="tournament-details__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Player</th>
                  <th>Racquet</th>
                  <th>String</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in sortedJobs" :key="job.id" @click="viewStringJob(job.id)"
                  class="tournament-details__table-row">
                  <td>{{ job.id }}</td>
                  <td>{{ job.player ? `${job.player.name} ${job.player.lastName}` : 'N/A' }}</td>
                  <td>{{ job.racquet ? `${job.racquet.brand} ${job.racquet.model}` : 'N/A' }}</td>
                  <td>{{ job.mainString ? `${job.mainString.brand} ${job.mainString.model}` : 'N/A' }}</td>
                  <td>
                    <v-chip :color="getStatusColor(job.status)" size="small" text-color="white">
                      {{ job.status }}
                    </v-chip>
                  </td>
                  <td>{{ formatDate(job.createdAt) }}</td>
                  <td class="text-right">
                    <v-btn icon="mdi-eye" size="small" variant="text" color="primary"
                      @click.stop="viewStringJob(job.id)"></v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <div v-else-if="jobsLoading" class="d-flex justify-center align-center py-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else class="text-center py-8">
              <v-icon icon="mdi-tennis" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
              <h3 class="text-h6 mb-2">No String Jobs</h3>
              <p class="text-body-1 mb-4 text-grey">This tournament has no string jobs yet.</p>
              <v-btn v-if="canManageTournaments" color="primary" prepend-icon="mdi-plus" @click="createNewStringJob">
                Create First String Job
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-container>

    <!-- Edit Tournament Dialog -->
    <v-dialog v-model="showEditTournamentDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit Tournament</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditTournament">
            <v-text-field v-model="tournamentForm.name" label="Tournament Name" :error-messages="formErrors.name"
              required variant="outlined" density="comfortable" class="mb-3"></v-text-field>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="tournamentForm.startDate" label="Start Date"
                  :error-messages="formErrors.startDate" required variant="outlined" density="comfortable" type="date"
                  class="mb-3"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="tournamentForm.endDate" label="End Date" :error-messages="formErrors.endDate"
                  required variant="outlined" density="comfortable" type="date" class="mb-3"></v-text-field>
              </v-col>
            </v-row>

            <v-text-field v-model="tournamentForm.location" label="Location" variant="outlined" density="comfortable"
              class="mb-3" hint="Optional" persistent-hint></v-text-field>

            <v-select v-model="tournamentForm.category" label="Category" :items="tournamentCategories"
              variant="outlined" density="comfortable" class="mb-3" clearable hint="Optional"
              persistent-hint></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showEditTournamentDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitEditTournament" :loading="tournamentStore.loading">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmation" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">Delete Tournament</v-card-title>
        <v-card-text class="pt-4">
          <p>Are you sure you want to delete this tournament?</p>
          <p class="font-weight-bold">{{ tournament?.name }}</p>
          <p class="text-caption text-grey">
            Note: Tournaments with associated string jobs cannot be deleted.
            You must delete the string jobs first.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showDeleteConfirmation = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteTournament" :loading="tournamentStore.loading">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style lang="scss" scoped>
.tournament-details {
  &__container {
    padding: $spacing-lg;
    max-width: 100%;
  }

  &__title {
    @include heading-1;
    color: $primary;
    margin-bottom: 0;
  }

  &__content {
    margin-top: $spacing-lg;
  }

  &__section-title {
    @include heading-3;
    padding: $spacing-md $spacing-lg;
    background-color: rgba($primary, 0.05);
    border-bottom: 1px solid rgba($primary, 0.1);
    gap: 1rem;
  }

  &__info-section {
    padding: $spacing-md 0;
  }

  &__info-item {
    margin-bottom: $spacing-md;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__info-label {
    font-weight: $font-weight-medium;
    color: $text-secondary;
    display: block;
    margin-bottom: $spacing-xs;
  }

  &__info-value {
    font-size: $font-size-md;
  }

  &__status-card {
    background-color: rgba($primary, 0.05);
    border-radius: $border-radius-md;
    padding: $spacing-md;
    height: 100%;
    @include flex(column, space-evenly, stretch);
  }

  &__status-header {
    text-align: center;
    margin-bottom: $spacing-md;
  }

  &__status-info {
    @include flex(column, center, stretch);
    gap: $spacing-md;
  }

  &__status-days {
    text-align: center;
  }

  &__days-value {
    @include heading-1;
    color: $primary;
    display: block;
  }

  &__stat-card {
    background-color: $bg-light;
    border-radius: $border-radius-md;
    padding: $spacing-md;
    text-align: center;
    border-top: 3px solid $primary;
    @include card-shadow;

    &--pending {
      border-top-color: $stringing-pending;
    }

    &--in-progress {
      border-top-color: $stringing-in-progress;
    }

    &--completed {
      border-top-color: $stringing-completed;
    }
  }

  &__stat-value {
    @include heading-1;
    color: $primary;
  }

  &__stat-label {
    @include small-text;
    color: $text-secondary;
  }

  &__table {
    &-row {
      cursor: pointer;
      @include transition;

      &:hover {
        background-color: rgba($primary, 0.05);
      }
    }
  }
}

:deep(.v-chip) {
  &.v-theme--light {
    &.bg-warning {
      background-color: $stringing-pending !important;
    }

    &.bg-info {
      background-color: $stringing-in-progress !important;
    }

    &.bg-success {
      background-color: $stringing-completed !important;
    }

    &.bg-error {
      background-color: $stringing-cancelled !important;
    }
  }
}
</style>