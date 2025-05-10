<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRacquetStore, usePlayerStore, useStringJobStore, useAuthStore } from '../stores'

const racquetStore = useRacquetStore()
const stringJobStore = useStringJobStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const jobsLoading = ref(true)
const showEditRacquetDialog = ref(false)
const showDeleteConfirmation = ref(false)

const racquetId = computed(() => {
  return route.params.id ? parseInt(route.params.id as string) : null
})

const racquet = computed(() => racquetStore.currentRacquet)

const racquetForm = ref({
  id: null as number | null,
  brand: '',
  model: '',
  serialNumber: '',
  headSize: null as number | null,
  notes: ''
})

const formErrors = ref({
  brand: '',
  model: '',
  serialNumber: '',
  headSize: ''
})

const canManageRacquets = computed(() => {
  return authStore.isAdmin || authStore.isStringer
})

onMounted(async () => {
  if (racquetId.value) {
    try {
      await racquetStore.fetchRacquetById(racquetId.value)

      jobsLoading.value = true
      if (racquet.value?.playerId) {
        await stringJobStore.fetchJobsByPlayer(racquet.value.playerId)
      }
      jobsLoading.value = false
    } catch (error) {
      console.error('Error loading racquet details:', error)
    } finally {
      loading.value = false
    }
  } else {
    router.replace('/racquets')
  }
})

watch(() => racquetId.value, async (newRacquetId) => {
  if (newRacquetId) {
    loading.value = true
    jobsLoading.value = true

    try {
      await racquetStore.fetchRacquetById(newRacquetId)
      if (racquet.value?.playerId) {
        await stringJobStore.fetchJobsByPlayer(racquet.value.playerId)
      }
    } catch (error) {
      console.error('Error loading racquet details:', error)
    } finally {
      loading.value = false
      jobsLoading.value = false
    }
  }
})

const relatedJobs = computed(() => {
  if (!racquetId.value) return []
  return stringJobStore.stringJobs.filter(job => job.racquetId === racquetId.value)
})

const sortedJobs = computed(() => {
  return [...relatedJobs.value].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString()
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

const goBack = () => {
  router.back()
}

const returnToRacquetsList = () => {
  router.push('/racquets')
}

const openEditRacquetDialog = () => {
  if (!racquet.value) return

  racquetForm.value = {
    id: racquet.value.id,
    brand: racquet.value.brand,
    model: racquet.value.model,
    serialNumber: racquet.value.serialNumber || '',
    headSize: racquet.value.headSize || null,
    notes: racquet.value.notes || ''
  }

  formErrors.value = {
    brand: '',
    model: '',
    serialNumber: '',
    headSize: ''
  }

  showEditRacquetDialog.value = true
}

const openDeleteDialog = () => {
  showDeleteConfirmation.value = true
}

const validateRacquetForm = () => {
  let isValid = true

  if (!racquetForm.value.brand.trim()) {
    formErrors.value.brand = 'Brand is required'
    isValid = false
  } else {
    formErrors.value.brand = ''
  }

  if (!racquetForm.value.model.trim()) {
    formErrors.value.model = 'Model is required'
    isValid = false
  } else {
    formErrors.value.model = ''
  }

  if (racquetForm.value.headSize !== null &&
    (racquetForm.value.headSize <= 0 || racquetForm.value.headSize > 200)) {
    formErrors.value.headSize = 'Head size must be between 1 and 200 sq in'
    isValid = false
  } else {
    formErrors.value.headSize = ''
  }

  return isValid
}

const submitEditRacquet = async () => {
  if (!validateRacquetForm() || !racquetForm.value.id) return

  try {
    await racquetStore.updateRacquet(racquetForm.value.id, {
      brand: racquetForm.value.brand,
      model: racquetForm.value.model,
      serialNumber: racquetForm.value.serialNumber || undefined,
      headSize: racquetForm.value.headSize || undefined,
      notes: racquetForm.value.notes || undefined
    })

    showEditRacquetDialog.value = false
  } catch (error) {
    console.error('Error updating racquet:', error)
  }
}

const deleteRacquet = async () => {
  if (!racquet.value) return

  try {
    const result = await racquetStore.deleteRacquet(racquet.value.id)
    if (result) {
      showDeleteConfirmation.value = false
      router.push('/racquets')
    }
  } catch (error) {
    console.error('Error deleting racquet:', error)
  }
}

const viewPlayerDetails = () => {
  if (!racquet.value?.playerId) return
  router.push(`/players/${racquet.value.playerId}`)
}

const createNewStringJob = () => {
  if (!racquet.value) return
  router.push(`/jobs/new?playerId=${racquet.value.playerId}&racquetId=${racquet.value.id}`)
}

const viewStringJob = (jobId: number) => {
  router.push(`/jobs/${jobId}`)
}
</script>

<template>
  <div class="racquet-details">
    <v-container class="racquet-details__container">

      <!-- Page Header with Navigation -->
      <v-row>
        <v-col cols="12" sm="8">
          <div class="d-flex align-center">
            <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-2"></v-btn>
            <h1 class="racquet-details__title" v-if="racquet">
              {{ racquet.brand }} {{ racquet.model }}
            </h1>
          </div>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn color="primary" prepend-icon="mdi-format-list-bulleted" @click="returnToRacquetsList">
            All Racquets
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error Alert -->
      <v-row class="mb-3" v-if="racquetStore.error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable>
            {{ racquetStore.error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <!-- Racquet Not Found -->
      <v-card v-else-if="!racquet" class="text-center pa-8 mb-6 mt-6">
        <v-icon icon="mdi-alert-circle" size="64" color="warning" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">Racquet Not Found</h3>
        <p class="mb-6">The requested racquet could not be found or you don't have permission to view it.</p>
        <v-btn color="primary" @click="returnToRacquetsList">Return to Racquets List</v-btn>
      </v-card>

      <!-- Racquet Details Content -->
      <div v-else class="racquet-details__content">

        <!-- Racquet Information Card -->
        <v-card class="mb-6">
          <v-card-title class="racquet-details__section-title">
            <v-icon start>mdi-tennis-ball</v-icon>
            Racquet Information
          </v-card-title>

          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="racquet-details__info-section">
                  <div class="racquet-details__info-item">
                    <span class="racquet-details__info-label">Brand:</span>
                    <span class="racquet-details__info-value">{{ racquet.brand }}</span>
                  </div>
                  <div class="racquet-details__info-item">
                    <span class="racquet-details__info-label">Model:</span>
                    <span class="racquet-details__info-value">{{ racquet.model }}</span>
                  </div>
                  <div class="racquet-details__info-item" v-if="racquet.serialNumber">
                    <span class="racquet-details__info-label">Serial Number:</span>
                    <span class="racquet-details__info-value">{{ racquet.serialNumber }}</span>
                  </div>
                  <div class="racquet-details__info-item" v-if="racquet.headSize">
                    <span class="racquet-details__info-label">Head Size:</span>
                    <span class="racquet-details__info-value">{{ racquet.headSize }} sq in</span>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="6">
                <div class="racquet-details__info-section">
                  <div class="racquet-details__info-item" v-if="racquet.player">
                    <span class="racquet-details__info-label">Owner:</span>
                    <div class="d-flex align-center">
                      <span class="racquet-details__info-value">
                        {{ racquet.player.name }} {{ racquet.player.lastName }}
                      </span>
                      <v-btn icon="mdi-account" size="small" variant="text" color="primary" class="ml-2"
                        @click="viewPlayerDetails" title="View Player Details"></v-btn>
                    </div>
                  </div>
                  <div class="racquet-details__info-item" v-if="racquet.notes">
                    <span class="racquet-details__info-label">Notes:</span>
                    <p class="racquet-details__info-notes">{{ racquet.notes }}</p>
                  </div>
                </div>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex justify-end" v-if="canManageRacquets">
              <v-btn color="primary" variant="text" prepend-icon="mdi-pencil" class="mr-2"
                @click="openEditRacquetDialog">
                Edit
              </v-btn>
              <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="openDeleteDialog">
                Delete
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Racquet's String Jobs -->
        <v-card>
          <v-card-title class="racquet-details__section-title d-flex flex-wrap justify-space-between align-center">
            <div>
              <v-icon start>mdi-tennis</v-icon>
              String Job History
            </div>
            <v-btn v-if="canManageRacquets" color="primary" size="small" prepend-icon="mdi-plus"
              @click="createNewStringJob">
              New String Job
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-table v-if="!jobsLoading && sortedJobs.length > 0" class="racquet-details__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>String</th>
                  <th>Tension</th>
                  <th>Stringer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in sortedJobs" :key="job.id" @click="viewStringJob(job.id)"
                  class="racquet-details__table-row">
                  <td>{{ job.id }}</td>
                  <td>{{ job.mainString ? `${job.mainString.brand} ${job.mainString.model}` : 'N/A' }}</td>
                  <td>{{ job.mainTension }}{{ job.isTensionInKg ? ' kg' : ' lb' }}</td>
                  <td>{{ job.stringer ? `${job.stringer.name} ${job.stringer.lastName}` : 'N/A' }}</td>
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
              <p class="text-body-1 mb-4 text-grey">This racquet has no string jobs yet.</p>
              <v-btn v-if="canManageRacquets" color="primary" prepend-icon="mdi-plus" @click="createNewStringJob">
                Create First String Job
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-container>

    <!-- Edit Racquet Dialog -->
    <v-dialog v-model="showEditRacquetDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit Racquet</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditRacquet">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="racquetForm.brand" label="Brand" :error-messages="formErrors.brand" required
                  variant="outlined" density="comfortable" class="mb-3"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="racquetForm.model" label="Model" :error-messages="formErrors.model" required
                  variant="outlined" density="comfortable" class="mb-3"></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="racquetForm.serialNumber" label="Serial Number"
                  :error-messages="formErrors.serialNumber" variant="outlined" density="comfortable" class="mb-3"
                  hint="Optional" persistent-hint></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="racquetForm.headSize" type="number" label="Head Size (sq in)"
                  :error-messages="formErrors.headSize" variant="outlined" density="comfortable" class="mb-3"
                  hint="Optional" persistent-hint></v-text-field>
              </v-col>
            </v-row>

            <v-textarea v-model="racquetForm.notes" label="Notes" variant="outlined" density="comfortable" rows="3"
              class="mb-3" hint="Optional" persistent-hint></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showEditRacquetDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitEditRacquet" :loading="racquetStore.loading">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmation" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">Delete Racquet</v-card-title>
        <v-card-text class="pt-4">
          <p>Are you sure you want to delete this racquet?</p>
          <p class="font-weight-bold">{{ racquet?.brand }} {{ racquet?.model }}</p>
          <p v-if="racquet?.serialNumber" class="font-weight-medium">Serial: {{ racquet.serialNumber }}</p>
          <p class="text-caption text-grey mt-4">
            Note: Racquets with associated string jobs cannot be deleted.
            You must delete the string jobs first.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showDeleteConfirmation = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteRacquet" :loading="racquetStore.loading">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style lang="scss" scoped>
.racquet-details {
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

  &__info-notes {
    background-color: rgba($primary, 0.05);
    padding: $spacing-md;
    border-radius: $border-radius-md;
    white-space: pre-line;
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