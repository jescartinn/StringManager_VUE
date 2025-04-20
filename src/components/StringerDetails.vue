<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStringerStore, useStringJobStore, useAuthStore } from '../stores'

// Import stores and router
const stringerStore = useStringerStore()
const stringJobStore = useStringJobStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Reactive state
const loading = ref(true)
const jobsLoading = ref(true)
const showEditStringerDialog = ref(false)
const showDeleteConfirmation = ref(false)

// Get stringer ID from route params
const stringerId = computed(() => {
  return route.params.id ? parseInt(route.params.id as string) : null
})

// Current stringer data
const stringer = computed(() => stringerStore.currentStringer)

// Stringer form data for edit
const stringerForm = ref({
  id: null as number | null,
  name: '',
  lastName: '',
  email: '',
  phoneNumber: ''
})

// Validation errors
const formErrors = ref({
  name: '',
  lastName: '',
  email: '',
  phoneNumber: ''
})

// Check if user has permissions to manage stringers (only admins)
const canManageStringers = computed(() => {
  return authStore.isAdmin
})

// Load stringer data
onMounted(async () => {
  if (stringerId.value) {
    try {
      // Load stringer data
      await stringerStore.fetchStringerById(stringerId.value)

      // Load stringer's string jobs
      jobsLoading.value = true
      await stringJobStore.fetchJobsByStringer(stringerId.value)
      jobsLoading.value = false
    } catch (error) {
      console.error('Error loading stringer details:', error)
    } finally {
      loading.value = false
    }
  } else {
    // No stringer ID provided, redirect to stringers list
    router.replace('/stringers')
  }
})

// Watch for stringer changes to reload related data
watch(() => stringerId.value, async (newStringerId) => {
  if (newStringerId) {
    loading.value = true
    jobsLoading.value = true

    try {
      await stringerStore.fetchStringerById(newStringerId)
      await stringJobStore.fetchJobsByStringer(newStringerId)
    } catch (error) {
      console.error('Error loading stringer details:', error)
    } finally {
      loading.value = false
      jobsLoading.value = false
    }
  }
})

// Get stringer string jobs
const stringJobs = computed(() => {
  return stringJobStore.stringJobs
})

// Sort string jobs by date (most recent first)
const sortedJobs = computed(() => {
  return [...stringJobs.value].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

// Calculate string job statistics
const jobStatistics = computed(() => {
  if (!stringJobs.value.length) return {
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    cancelled: 0,
    completedToday: 0,
    completionRate: 0
  }

  const today = new Date().toISOString().split('T')[0]
  const total = stringJobs.value.length
  const completed = stringJobs.value.filter(job => job.status === 'Completed').length
  const pending = stringJobs.value.filter(job => job.status === 'Pending').length
  const inProgress = stringJobs.value.filter(job => job.status === 'InProgress').length
  const cancelled = stringJobs.value.filter(job => job.status === 'Cancelled').length
  const completedToday = stringJobs.value.filter(job =>
    job.status === 'Completed' &&
    job.completedAt &&
    job.completedAt.startsWith(today)
  ).length

  // Calculate completion rate (completed jobs / total non-cancelled jobs)
  const nonCancelled = total - cancelled
  const completionRate = nonCancelled > 0 ? Math.round((completed / nonCancelled) * 100) : 0

  return {
    total,
    completed,
    pending,
    inProgress,
    cancelled,
    completedToday,
    completionRate
  }
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

const returnToStringersList = () => {
  router.push('/stringers')
}

// Open edit stringer dialog
const openEditStringerDialog = () => {
  if (!stringer.value) return

  stringerForm.value = {
    id: stringer.value.id,
    name: stringer.value.name,
    lastName: stringer.value.lastName,
    email: stringer.value.email || '',
    phoneNumber: stringer.value.phoneNumber || ''
  }

  // Reset errors
  formErrors.value = {
    name: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  }

  showEditStringerDialog.value = true
}

// Open delete confirmation dialog
const openDeleteDialog = () => {
  showDeleteConfirmation.value = true
}

// Validate stringer form
const validateStringerForm = () => {
  let isValid = true

  // Validate name
  if (!stringerForm.value.name.trim()) {
    formErrors.value.name = 'Name is required'
    isValid = false
  } else {
    formErrors.value.name = ''
  }

  // Validate last name
  if (!stringerForm.value.lastName.trim()) {
    formErrors.value.lastName = 'Last name is required'
    isValid = false
  } else {
    formErrors.value.lastName = ''
  }

  // Validate email if provided
  if (stringerForm.value.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(stringerForm.value.email)) {
      formErrors.value.email = 'Please enter a valid email address'
      isValid = false
    } else {
      formErrors.value.email = ''
    }
  } else {
    formErrors.value.email = ''
  }

  // Validate phone number if provided
  if (stringerForm.value.phoneNumber.trim()) {
    const phoneRegex = /^[+]?[\d\s()-]{7,}$/
    if (!phoneRegex.test(stringerForm.value.phoneNumber)) {
      formErrors.value.phoneNumber = 'Please enter a valid phone number'
      isValid = false
    } else {
      formErrors.value.phoneNumber = ''
    }
  } else {
    formErrors.value.phoneNumber = ''
  }

  return isValid
}

// Submit stringer edit
const submitEditStringer = async () => {
  if (!validateStringerForm() || !stringerForm.value.id) return

  try {
    await stringerStore.updateStringer(stringerForm.value.id, {
      name: stringerForm.value.name,
      lastName: stringerForm.value.lastName,
      email: stringerForm.value.email || undefined,
      phoneNumber: stringerForm.value.phoneNumber || undefined
    })

    showEditStringerDialog.value = false
  } catch (error) {
    console.error('Error updating stringer:', error)
  }
}

// Delete stringer
const deleteStringer = async () => {
  if (!stringer.value) return

  try {
    const result = await stringerStore.deleteStringer(stringer.value.id)
    if (result) {
      showDeleteConfirmation.value = false
      // Navigate back to stringers list
      router.push('/stringers')
    }
  } catch (error) {
    console.error('Error deleting stringer:', error)
  }
}

// Create new string job with this stringer pre-selected
const createNewStringJob = () => {
  if (!stringer.value) return
  router.push(`/jobs/new?stringerId=${stringer.value.id}`)
}

// View string job details
const viewStringJob = (jobId: number) => {
  router.push(`/jobs/${jobId}`)
}
</script>

<template>
  <div class="stringer-details">
    <v-container class="stringer-details__container">
      <!-- Page Header with Navigation -->
      <v-row>
        <v-col cols="12" sm="8">
          <div class="d-flex align-center">
            <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-2"></v-btn>
            <h1 class="stringer-details__title" v-if="stringer">
              {{ stringer.name }} {{ stringer.lastName }}
            </h1>
          </div>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn color="primary" prepend-icon="mdi-format-list-bulleted" @click="returnToStringersList">
            All Stringers
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error Alert -->
      <v-row class="mb-3" v-if="stringerStore.error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable>
            {{ stringerStore.error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <!-- Stringer Not Found -->
      <v-card v-else-if="!stringer" class="text-center pa-8 mb-6 mt-6">
        <v-icon icon="mdi-alert-circle" size="64" color="warning" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">Stringer Not Found</h3>
        <p class="mb-6">The requested stringer could not be found or you don't have permission to view it.</p>
        <v-btn color="primary" @click="returnToStringersList">Return to Stringers List</v-btn>
      </v-card>

      <!-- Stringer Details Content -->
      <div v-else class="stringer-details__content">
        <!-- Stringer Information Card -->
        <v-card class="mb-6">
          <v-card-title class="stringer-details__section-title">
            <v-icon start>mdi-account-wrench</v-icon>
            Stringer Information
          </v-card-title>

          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="stringer-details__info-section">
                  <div class="stringer-details__info-item">
                    <span class="stringer-details__info-label">Name:</span>
                    <span class="stringer-details__info-value">{{ stringer.name }} {{ stringer.lastName }}</span>
                  </div>

                  <div class="stringer-details__info-item" v-if="stringer.email">
                    <span class="stringer-details__info-label">Email:</span>
                    <a :href="`mailto:${stringer.email}`"
                      class="stringer-details__info-value stringer-details__info-link">
                      {{ stringer.email }}
                    </a>
                  </div>

                  <div class="stringer-details__info-item" v-if="stringer.phoneNumber">
                    <span class="stringer-details__info-label">Phone:</span>
                    <a :href="`tel:${stringer.phoneNumber}`"
                      class="stringer-details__info-value stringer-details__info-link">
                      {{ stringer.phoneNumber }}
                    </a>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="6" class="d-flex justify-end align-center" v-if="canManageStringers">
                <v-btn color="primary" variant="text" prepend-icon="mdi-pencil" class="mr-2"
                  @click="openEditStringerDialog">
                  Edit
                </v-btn>
                <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="openDeleteDialog">
                  Delete
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Stringer's Job Statistics -->
        <v-card class="mb-6">
          <v-card-title class="stringer-details__section-title">
            <v-icon start>mdi-chart-box</v-icon>
            Job Statistics
          </v-card-title>

          <v-card-text class="pa-4">
            <v-row class="mb-4">
              <v-col cols="12" sm="6" md="3">
                <div class="stringer-details__stat-card">
                  <div class="stringer-details__stat-value">{{ jobStatistics.total }}</div>
                  <div class="stringer-details__stat-label">Total Jobs</div>
                </div>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <div class="stringer-details__stat-card">
                  <div class="stringer-details__stat-value text-success">{{ jobStatistics.completed }}</div>
                  <div class="stringer-details__stat-label">Completed Jobs</div>
                </div>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <div class="stringer-details__stat-card">
                  <div class="stringer-details__stat-value text-warning">{{ jobStatistics.pending }}</div>
                  <div class="stringer-details__stat-label">Pending Jobs</div>
                </div>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <div class="stringer-details__stat-card">
                  <div class="stringer-details__stat-value text-info">{{ jobStatistics.inProgress }}</div>
                  <div class="stringer-details__stat-label">In Progress Jobs</div>
                </div>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <div class="stringer-details__completion-rate">
                  <div class="stringer-details__completion-label">Completion Rate</div>
                  <v-progress-linear :model-value="jobStatistics.completionRate" height="20" rounded color="success"
                    bg-color="grey-lighten-3">
                    <template v-slot:default>
                      <span class="font-weight-bold">{{ jobStatistics.completionRate }}%</span>
                    </template>
                  </v-progress-linear>
                </div>
              </v-col>

              <v-col cols="12" sm="6">
                <div class="stringer-details__completion-rate">
                  <div class="stringer-details__completion-label">Completed Today</div>
                  <div class="text-h4 text-success text-center">{{ jobStatistics.completedToday }}</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Stringer's String Jobs -->
        <v-card>
          <v-card-title class="stringer-details__section-title d-flex flex-wrap justify-space-between align-center">
            <div>
              <v-icon start>mdi-tennis</v-icon>
              String Jobs
            </div>
            <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="createNewStringJob">
              New String Job
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-table v-if="!jobsLoading && sortedJobs.length > 0" class="stringer-details__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Player</th>
                  <th>Racquet</th>
                  <th>String</th>
                  <th>Tension</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in sortedJobs" :key="job.id" @click="viewStringJob(job.id)"
                  class="stringer-details__table-row">
                  <td>{{ job.id }}</td>
                  <td>{{ job.player ? `${job.player.name} ${job.player.lastName}` : 'N/A' }}</td>
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
              <p class="text-body-1 mb-4 text-grey">This stringer has no string jobs yet.</p>
              <v-btn color="primary" prepend-icon="mdi-plus" @click="createNewStringJob">
                Create First String Job
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-container>

    <!-- Edit Stringer Dialog -->
    <v-dialog v-model="showEditStringerDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit Stringer</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditStringer">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="stringerForm.name" label="First Name" :error-messages="formErrors.name" required
                  variant="outlined" density="comfortable" class="mb-3"></v-text-field>
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field v-model="stringerForm.lastName" label="Last Name" :error-messages="formErrors.lastName"
                  required variant="outlined" density="comfortable" class="mb-3"></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="stringerForm.email" label="Email" :error-messages="formErrors.email"
                  variant="outlined" density="comfortable" class="mb-3" hint="Optional" persistent-hint
                  type="email"></v-text-field>
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field v-model="stringerForm.phoneNumber" label="Phone Number"
                  :error-messages="formErrors.phoneNumber" variant="outlined" density="comfortable" class="mb-3"
                  hint="Optional" persistent-hint></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showEditStringerDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitEditStringer" :loading="stringerStore.loading">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmation" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">Delete Stringer</v-card-title>
        <v-card-text class="pt-4">
          <p>Are you sure you want to delete this stringer?</p>
          <p class="font-weight-bold">{{ stringer?.name }} {{ stringer?.lastName }}</p>
          <p v-if="stringer?.email" class="text-body-2">{{ stringer.email }}</p>
          <p class="text-caption text-grey mt-4">
            Note: Stringers with associated string jobs cannot be deleted.
            You must delete or reassign their string jobs first.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showDeleteConfirmation = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteStringer" :loading="stringerStore.loading">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style lang="scss" scoped>
.stringer-details {
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

  &__info {
    &-section {
      padding: $spacing-md 0;
    }

    &-item {
      margin-bottom: $spacing-md;

      &:last-child {
        margin-bottom: 0;
      }
    }

    &-label {
      font-weight: $font-weight-medium;
      color: $text-secondary;
      display: block;
      margin-bottom: $spacing-xs;
    }

    &-value {
      font-size: $font-size-md;
    }

    &-link {
      color: $primary;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  &__stat {
    &-card {
      background-color: rgba($primary, 0.05);
      border-radius: $border-radius-md;
      padding: $spacing-md;
      text-align: center;
      height: 100%;
    }

    &-value {
      font-size: 2rem;
      font-weight: $font-weight-bold;
      margin-bottom: $spacing-xs;
      color: $primary;
    }

    &-label {
      font-size: $font-size-sm;
      color: $text-secondary;
    }
  }

  &__completion {
    &-rate {
      background-color: rgba($primary, 0.05);
      border-radius: $border-radius-md;
      padding: $spacing-md;
      height: 100%;
    }

    &-label {
      font-weight: $font-weight-medium;
      margin-bottom: $spacing-md;
      text-align: center;
    }
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