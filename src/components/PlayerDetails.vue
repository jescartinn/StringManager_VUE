<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore, useRacquetStore, useStringJobStore, useAuthStore } from '../stores'
import { getCountryOptions, getCountryName, getCountryFlag } from '../utils/countryUtils'

// Import stores and router
const playerStore = usePlayerStore()
const racquetStore = useRacquetStore()
const stringJobStore = useStringJobStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Reactive state
const loading = ref(true)
const racquetsLoading = ref(true)
const jobsLoading = ref(true)
const showEditPlayerDialog = ref(false)
const showDeleteConfirmation = ref(false)

// Get player ID from route params
const playerId = computed(() => {
  return route.params.id ? parseInt(route.params.id as string) : null
})

// Current player data
const player = computed(() => playerStore.currentPlayer)

// Player form data for edit
const playerForm = ref({
  id: null as number | null,
  name: '',
  lastName: '',
  countryCode: ''
})

// Validation errors
const formErrors = ref({
  name: '',
  lastName: '',
  countryCode: ''
})

// Countries options for the form
const countryOptions = computed(() => getCountryOptions())

// Check if user has permissions to manage players
const canManagePlayers = computed(() => {
  return authStore.isAdmin || authStore.isStringer
})

// Load player data
onMounted(async () => {
  if (playerId.value) {
    try {
      // Load player data
      await playerStore.fetchPlayerById(playerId.value)

      // Load player's racquets
      racquetsLoading.value = true
      await racquetStore.fetchRacquetsByPlayer(playerId.value)
      racquetsLoading.value = false

      // Load player's string jobs
      jobsLoading.value = true
      await stringJobStore.fetchJobsByPlayer(playerId.value)
      jobsLoading.value = false
    } catch (error) {
      console.error('Error loading player details:', error)
    } finally {
      loading.value = false
    }
  } else {
    // No player ID provided, redirect to players list
    router.replace('/players')
  }
})

// Watch for player changes to reload racquets and jobs
watch(() => playerId.value, async (newPlayerId) => {
  if (newPlayerId) {
    loading.value = true
    racquetsLoading.value = true
    jobsLoading.value = true

    try {
      await playerStore.fetchPlayerById(newPlayerId)
      await racquetStore.fetchRacquetsByPlayer(newPlayerId)
      await stringJobStore.fetchJobsByPlayer(newPlayerId)
    } catch (error) {
      console.error('Error loading player details:', error)
    } finally {
      loading.value = false
      racquetsLoading.value = false
      jobsLoading.value = false
    }
  }
})

// Get player racquets
const racquets = computed(() => {
  if (!playerId.value) return []
  return racquetStore.playerRacquets[playerId.value] || []
})

// Get player string jobs
const stringJobs = computed(() => {
  return stringJobStore.stringJobs
})

// Sort racquets by brand and model
const sortedRacquets = computed(() => {
  return [...racquets.value].sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand)
    if (brandCompare !== 0) return brandCompare
    return a.model.localeCompare(b.model)
  })
})

// Sort string jobs by date (most recent first)
const sortedJobs = computed(() => {
  return [...stringJobs.value].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

// Format date helper
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return 'warning'
    case 'InProgress': return 'info'
    case 'Completed': return 'success'
    case 'Cancelled': return 'error'
    default: return 'grey'
  }
}

// Navigation functions
const goBack = () => {
  router.back()
}

const returnToPlayersList = () => {
  router.push('/players')
}

// Open edit player dialog
const openEditPlayerDialog = () => {
  if (!player.value) return

  playerForm.value = {
    id: player.value.id,
    name: player.value.name,
    lastName: player.value.lastName,
    countryCode: player.value.countryCode || ''
  }

  // Reset errors
  formErrors.value = {
    name: '',
    lastName: '',
    countryCode: ''
  }

  showEditPlayerDialog.value = true
}

// Open delete confirmation dialog
const openDeleteDialog = () => {
  showDeleteConfirmation.value = true
}

// Validate player form
const validatePlayerForm = () => {
  let isValid = true

  // Validate name
  if (!playerForm.value.name.trim()) {
    formErrors.value.name = 'Name is required'
    isValid = false
  } else {
    formErrors.value.name = ''
  }

  // Validate last name
  if (!playerForm.value.lastName.trim()) {
    formErrors.value.lastName = 'Last name is required'
    isValid = false
  } else {
    formErrors.value.lastName = ''
  }

  // Country code is optional, so no validation needed

  return isValid
}

// Submit player edit
const submitEditPlayer = async () => {
  if (!validatePlayerForm() || !playerForm.value.id) return

  try {
    await playerStore.updatePlayer(playerForm.value.id, {
      name: playerForm.value.name,
      lastName: playerForm.value.lastName,
      countryCode: playerForm.value.countryCode || undefined
    })

    showEditPlayerDialog.value = false
  } catch (error) {
    console.error('Error updating player:', error)
  }
}

// Delete player
const deletePlayer = async () => {
  if (!player.value) return

  try {
    const result = await playerStore.deletePlayer(player.value.id)
    if (result) {
      showDeleteConfirmation.value = false
      // Navigate back to players list
      router.push('/players')
    }
  } catch (error) {
    console.error('Error deleting player:', error)
  }
}

// Navigate to create new racquet for this player
const createNewRacquet = () => {
  if (!player.value) return
  router.push(`/racquets/new?playerId=${player.value.id}`)
}

// Navigate to create new string job for this player
const createNewStringJob = () => {
  if (!player.value) return
  router.push(`/jobs/new?playerId=${player.value.id}`)
}

// View racquet details
const viewRacquet = (racquetId: number) => {
  router.push(`/racquets/${racquetId}`)
}

// View string job details
const viewStringJob = (jobId: number) => {
  router.push(`/jobs/${jobId}`)
}
</script>

<template>
  <div class="player-details">
    <v-container class="player-details__container">
      <!-- Page Header with Navigation -->
      <v-row>
        <v-col cols="12" sm="8">
          <div class="d-flex align-center">
            <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-2"></v-btn>
            <h1 class="player-details__title" v-if="player">
              {{ player.name }} {{ player.lastName }}
            </h1>
          </div>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn color="primary" prepend-icon="mdi-format-list-bulleted" @click="returnToPlayersList">
            All Players
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error Alert -->
      <v-row class="mb-3" v-if="playerStore.error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable>
            {{ playerStore.error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <!-- Player Not Found -->
      <v-card v-else-if="!player" class="text-center pa-8 mt-6 mb-6">
        <v-icon icon="mdi-alert-circle" size="64" color="warning" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">Player Not Found</h3>
        <p class="mb-6">The requested player could not be found or you don't have permission to view it.</p>
        <v-btn color="primary" @click="returnToPlayersList">Return to Players List</v-btn>
      </v-card>

      <!-- Player Details Content -->
      <div v-else class="player-details__content">
        <!-- Player Information Card -->
        <v-card class="mb-6">
          <v-card-title class="player-details__section-title">
            <v-icon start>mdi-account</v-icon>
            Player Information
          </v-card-title>

          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <v-list>
                  <v-list-item>
                    <template v-slot:prepend>
                      <v-avatar color="primary" size="48">
                        {{ player.name.charAt(0) }}{{ player.lastName.charAt(0) }}
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-h5">
                      {{ player.name }} {{ player.lastName }}
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="player.countryCode">
                      <span class="mr-1">{{ getCountryFlag(player.countryCode) }}</span>
                      {{ getCountryName(player.countryCode) }} ({{ player.countryCode }})
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>

              <v-col cols="12" md="6" class="d-flex justify-end align-center" v-if="canManagePlayers">
                <v-btn color="primary" variant="text" prepend-icon="mdi-pencil" class="mr-2"
                  @click="openEditPlayerDialog">
                  Edit
                </v-btn>
                <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="openDeleteDialog">
                  Delete
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Player's Racquets -->
        <v-card class="mb-6">
          <v-card-title class="player-details__section-title d-flex flex-wrap justify-space-between align-center">
            <div>
              <v-icon start>mdi-tennis-ball</v-icon>
              Player's Racquets
            </div>
            <v-btn v-if="canManagePlayers" color="primary" size="small" prepend-icon="mdi-plus"
              @click="createNewRacquet">
              Add Racquet
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-list v-if="!racquetsLoading && sortedRacquets.length > 0">
              <v-list-item v-for="racquet in sortedRacquets" :key="racquet.id"
                :title="`${racquet.brand} ${racquet.model}`"
                :subtitle="racquet.serialNumber ? `Serial: ${racquet.serialNumber}` : undefined"
                @click="viewRacquet(racquet.id)">
                <template v-slot:prepend>
                  <v-avatar color="primary" variant="tonal">
                    <v-icon>mdi-tennis-ball</v-icon>
                  </v-avatar>
                </template>
                <template v-slot:append>
                  <v-chip v-if="racquet.headSize" size="small" color="secondary" variant="tonal">
                    {{ racquet.headSize }} sq in
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>

            <div v-else-if="racquetsLoading" class="d-flex justify-center align-center py-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else class="text-center py-8">
              <v-icon icon="mdi-tennis-ball" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
              <h3 class="text-h6 mb-2">No Racquets</h3>
              <p class="text-body-1 mb-4 text-grey">This player has no racquets yet.</p>
              <v-btn v-if="canManagePlayers" color="primary" prepend-icon="mdi-plus" @click="createNewRacquet">
                Add First Racquet
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Player's String Jobs -->
        <v-card>
          <v-card-title class="player-details__section-title d-flex flex-wrap justify-space-between align-center">
            <div>
              <v-icon start>mdi-tennis</v-icon>
              Recent String Jobs
            </div>
            <v-btn v-if="canManagePlayers" color="primary" size="small" prepend-icon="mdi-plus"
              @click="createNewStringJob">
              New String Job
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-table v-if="!jobsLoading && sortedJobs.length > 0" class="player-details__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Racquet</th>
                  <th>String</th>
                  <th>Tension</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in sortedJobs.slice(0, 5)" :key="job.id" @click="viewStringJob(job.id)"
                  class="player-details__table-row">
                  <td>{{ job.id }}</td>
                  <td>{{ job.racquet ? `${job.racquet.brand} ${job.racquet.model}` : 'N/A' }}</td>
                  <td>{{ job.mainString ? `${job.mainString.brand} ${job.mainString.model}` : 'N/A' }}</td>
                  <td>{{ job.mainTension }}{{ job.isTensionInKg ? ' kg' : ' lb' }}</td>
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
              <p class="text-body-1 mb-4 text-grey">This player has no string jobs yet.</p>
              <v-btn v-if="canManagePlayers" color="primary" prepend-icon="mdi-plus" @click="createNewStringJob">
                Create First String Job
              </v-btn>
            </div>
          </v-card-text>

          <v-card-actions v-if="sortedJobs.length > 5" class="pa-4 justify-center">
            <v-btn color="primary" variant="text" prepend-icon="mdi-eye"
              @click="router.push({ path: '/jobs', query: { player: playerId?.toString() } })">
              View All {{ sortedJobs.length }} String Jobs
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-container>

    <!-- Edit Player Dialog -->
    <v-dialog v-model="showEditPlayerDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit Player</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditPlayer">
            <v-text-field v-model="playerForm.name" label="First Name" :error-messages="formErrors.name" required
              variant="outlined" density="comfortable" class="mb-3"></v-text-field>

            <v-text-field v-model="playerForm.lastName" label="Last Name" :error-messages="formErrors.lastName" required
              variant="outlined" density="comfortable" class="mb-3"></v-text-field>

            <v-autocomplete v-model="playerForm.countryCode" label="Country" :items="countryOptions" item-title="title"
              item-value="value" variant="outlined" density="comfortable" clearable class="mb-3"></v-autocomplete>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showEditPlayerDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitEditPlayer" :loading="playerStore.loading">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmation" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">Delete Player</v-card-title>
        <v-card-text class="pt-4">
          <p>Are you sure you want to delete this player?</p>
          <p class="font-weight-bold">{{ player?.name }} {{ player?.lastName }}</p>
          <p class="text-caption text-grey">
            Note: Players with associated string jobs cannot be deleted.
            You must delete the string jobs first.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showDeleteConfirmation = false">Cancel</v-btn>
          <v-btn color="error" @click="deletePlayer" :loading="playerStore.loading">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style lang="scss" scoped>
.player-details {
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

// Status colors
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