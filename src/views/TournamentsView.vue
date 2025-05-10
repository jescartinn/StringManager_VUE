<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentStore, useAuthStore } from '../stores'

const tournamentStore = useTournamentStore()
const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const search = ref('')
const categoryFilter = ref<string | null>(null)
const activeFilter = ref<string | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('startDate')
const sortDesc = ref(true)
const showFilters = ref(false)
const showNewTournamentDialog = ref(false)
const showEditTournamentDialog = ref(false)
const showDeleteConfirmation = ref(false)

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

onMounted(async () => {
  try {
    await tournamentStore.fetchAllTournaments()

    try {
      await tournamentStore.fetchCurrentTournament()
    } catch (currentTournamentError) {
      console.error('Error fetching current tournament:', currentTournamentError)
    }
  } catch (error) {
    console.error('Error initializing tournament view:', error)
  } finally {
    loading.value = false
  }
})

const filteredTournaments = computed(() => {
  let filtered = [...tournamentStore.tournaments]
  const today = new Date().toISOString().split('T')[0]

  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(tournament => {
      const nameMatch = tournament.name.toLowerCase().includes(searchLower)
      const locationMatch = tournament.location ? tournament.location.toLowerCase().includes(searchLower) : false
      return nameMatch || locationMatch
    })
  }

  if (categoryFilter.value) {
    filtered = filtered.filter(tournament => tournament.category === categoryFilter.value)
  }

  if (activeFilter.value) {
    if (activeFilter.value === 'active') {
      filtered = filtered.filter(tournament =>
        tournament.startDate <= today && tournament.endDate >= today
      )
    } else if (activeFilter.value === 'upcoming') {
      filtered = filtered.filter(tournament => tournament.startDate > today)
    } else if (activeFilter.value === 'past') {
      filtered = filtered.filter(tournament => tournament.endDate < today)
    }
  }

  filtered.sort((a, b) => {
    let aValue: any, bValue: any;

    if (sortBy.value === 'startDate' || sortBy.value === 'endDate') {
      aValue = new Date(a[sortBy.value as keyof typeof a] as string).getTime()
      bValue = new Date(b[sortBy.value as keyof typeof b] as string).getTime()
    } else if (sortBy.value === 'name') {
      aValue = a.name
      bValue = b.name
    } else if (sortBy.value === 'location') {
      aValue = a.location || ''
      bValue = b.location || ''
    } else if (sortBy.value === 'category') {
      aValue = a.category || ''
      bValue = b.category || ''
    } else {
      aValue = a[sortBy.value as keyof typeof a]
      bValue = b[sortBy.value as keyof typeof b]
    }

    if (aValue === null || aValue === undefined) return sortDesc.value ? 1 : -1
    if (bValue === null || bValue === undefined) return sortDesc.value ? -1 : 1

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDesc.value ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue)
    }

    return sortDesc.value ? bValue - aValue : aValue - bValue
  })

  return filtered
})

const paginatedTournaments = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTournaments.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredTournaments.value.length / itemsPerPage.value)
})

const isCurrentTournament = (tournament: any) => {
  if (!tournamentStore.activeTournament) return false
  return tournament.id === tournamentStore.activeTournament.id
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

const getTournamentStatus = (tournament: any) => {
  const today = new Date()
  const startDate = new Date(tournament.startDate)
  const endDate = new Date(tournament.endDate)

  if (today < startDate) {
    return { text: 'Upcoming', color: 'info' }
  } else if (today > endDate) {
    return { text: 'Past', color: 'grey' }
  } else {
    return { text: 'Active', color: 'success' }
  }
}

const handleSort = (column: string) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = column
    sortDesc.value = column === 'startDate' || column === 'endDate'
  }
}

const resetAndReload = async () => {
  search.value = ''
  categoryFilter.value = null
  activeFilter.value = null
  await tournamentStore.fetchAllTournaments()
}

const openNewTournamentDialog = () => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  tournamentForm.value = {
    id: null,
    name: '',
    startDate: formatDateForInput(today),
    endDate: formatDateForInput(nextWeek),
    location: '',
    category: ''
  }

  formErrors.value = {
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    category: ''
  }

  showNewTournamentDialog.value = true
}

const openEditTournamentDialog = (tournament: any) => {
  tournamentForm.value = {
    id: tournament.id,
    name: tournament.name,
    startDate: tournament.startDate.split('T')[0],
    endDate: tournament.endDate.split('T')[0],
    location: tournament.location || '',
    category: tournament.category || ''
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

const openDeleteDialog = (tournament: any) => {
  tournamentForm.value = {
    id: tournament.id,
    name: tournament.name,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    location: tournament.location || '',
    category: tournament.category || ''
  }

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

  if (isValid && (!tournamentForm.value.id || (tournamentForm.value.id && showEditTournamentDialog.value))) {
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

const submitNewTournament = async () => {
  if (!validateTournamentForm()) return

  try {
    await tournamentStore.createTournament({
      name: tournamentForm.value.name,
      startDate: tournamentForm.value.startDate,
      endDate: tournamentForm.value.endDate,
      location: tournamentForm.value.location || undefined,
      category: tournamentForm.value.category || undefined
    })

    showNewTournamentDialog.value = false

    await tournamentStore.fetchCurrentTournament()
  } catch (error) {
    console.error('Error creating tournament:', error)
  }
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
  if (!tournamentForm.value.id) return

  try {
    await tournamentStore.deleteTournament(tournamentForm.value.id)
    showDeleteConfirmation.value = false

    await tournamentStore.fetchCurrentTournament()
  } catch (error) {
    console.error('Error deleting tournament:', error)
  }
}

const viewTournamentDetails = (tournamentId: number) => {
  router.push(`/tournaments/${tournamentId}`)
}

const viewTournamentJobs = (tournamentId: number) => {
  router.push({ path: '/jobs', query: { tournament: tournamentId.toString() } })
}

const daysUntilStart = (startDate: string) => {
  const today = new Date()
  const start = new Date(startDate)
  const diffTime = start.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

const daysRemaining = (endDate: string) => {
  const today = new Date()
  const end = new Date(endDate)

  end.setHours(23, 59, 59, 999)

  const diffTime = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Start Date', key: 'startDate', sortable: true },
  { title: 'End Date', key: 'endDate', sortable: true },
  { title: 'Location', key: 'location', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false }
]
</script>

<template>
  <div class="tournaments-view">
    <v-container class="tournaments-view__container">

      <!-- Page Header -->
      <v-row class="mb-3">
        <v-col cols="12" sm="8">
          <h1 class="tournaments-view__title">Tournaments</h1>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn v-if="canManageTournaments" class="mb-3" color="primary" prepend-icon="mdi-plus"
            @click="openNewTournamentDialog">
            New Tournament
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

      <!-- Current Tournament Alert -->
      <v-row class="mb-3" v-if="tournamentStore.activeTournament">
        <v-col cols="12">
          <v-alert type="success" variant="tonal" icon="mdi-calendar-check">
            <div class="d-flex justify-space-between align-center flex-wrap">
              <div>
                <strong>Active Tournament:</strong> {{ tournamentStore.activeTournament.name }}
                <div class="text-caption">
                  {{ formatDate(tournamentStore.activeTournament.startDate) }} -
                  {{ formatDate(tournamentStore.activeTournament.endDate) }}
                  ({{ tournamentStore.getRemainingDays(tournamentStore.activeTournament.id) }} days remaining)
                </div>
              </div>
              <v-btn color="success" variant="text" size="small"
                @click="viewTournamentDetails(tournamentStore.activeTournament.id)">
                View Details
              </v-btn>
            </div>
          </v-alert>
        </v-col>
      </v-row>

      <!-- No Active Tournament Alert -->
      <v-row class="mb-3" v-else-if="!loading">
        <v-col cols="12">
          <v-alert type="info" variant="tonal" icon="mdi-calendar">
            <div class="d-flex justify-space-between align-center flex-wrap">
              <div>
                <strong>No Active Tournament</strong>
                <div class="text-caption">
                  There is no tournament currently active.
                  <span v-if="canManageTournaments">You can create a new one using the button above.</span>
                </div>
              </div>
            </div>
          </v-alert>
        </v-col>
      </v-row>

      <!-- Filters and Search -->
      <v-card class="mb-12">
        <v-card-text>
          <v-row class="align-center">
            <v-col cols="12" md="9">
              <v-text-field v-model="search" label="Search tournaments" prepend-inner-icon="mdi-magnify"
                density="comfortable" hide-details variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="6" md="1">
              <v-btn color="primary" variant="outlined" block @click="showFilters = !showFilters">
                {{ showFilters ? 'Hide' : 'Filters' }}
              </v-btn>
            </v-col>
            <v-col cols="6" md="2">
              <v-btn color="primary" variant="outlined" block @click="resetAndReload">
                Reset
              </v-btn>
            </v-col>
          </v-row>

          <!-- Expanded Filters -->
          <v-expand-transition>
            <div v-if="showFilters">
              <v-divider class="my-3"></v-divider>
              <v-row>
                <v-col cols="12" sm="6" md="4">
                  <v-select v-model="activeFilter" label="Status" :items="[
                    { title: 'All', value: null },
                    { title: 'Active', value: 'active' },
                    { title: 'Upcoming', value: 'upcoming' },
                    { title: 'Past', value: 'past' }
                  ]" item-title="title" item-value="value" variant="outlined" density="comfortable" clearable
                    hide-details></v-select>
                </v-col>
                <v-col cols="12" sm="6" md="4">
                  <v-select v-model="categoryFilter" label="Category" :items="tournamentCategories" variant="outlined"
                    density="comfortable" clearable hide-details></v-select>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- No results placeholder -->
      <v-card v-if="!loading && filteredTournaments.length === 0" class="mb-6 text-center py-8">
        <v-icon icon="mdi-trophy" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">No tournaments found</h3>
        <p class="text-body-1 mb-6 text-grey">Try adjusting your filters or add a new tournament.</p>
        <v-btn v-if="canManageTournaments" color="primary" prepend-icon="mdi-plus" @click="openNewTournamentDialog">Add
          New Tournament</v-btn>
      </v-card>

      <!-- Tournament List Table -->
      <v-card v-else class="mb-6">
        <v-data-table-virtual :headers="headers" :items="paginatedTournaments" :items-per-page="itemsPerPage"
          :page="page" :loading="loading" class="tournaments-view__table" hover
          @update:options="(options: any) => page = options.page"
          @click:row="(event: any, { item }: any) => viewTournamentDetails(item.id)">

          <!-- Custom Header -->
          <template v-slot:header.column="{ column }">
            <div class="d-flex align-center">
              {{ column.title }}
              <v-btn v-if="column.key && column.key !== 'actions' && column.key !== 'status' && column.sortable"
                icon="mdi-arrow-up-down" size="small" variant="text" @click.stop="handleSort(column.key)"></v-btn>
            </div>
          </template>

          <!-- Custom Columns -->
          <template v-slot:item.startDate="{ item }">
            {{ formatDate(item.startDate) }}
          </template>

          <template v-slot:item.endDate="{ item }">
            {{ formatDate(item.endDate) }}
          </template>

          <template v-slot:item.location="{ item }">
            <span v-if="item.location">{{ item.location }}</span>
            <span v-else class="text-grey">-</span>
          </template>

          <template v-slot:item.category="{ item }">
            <span v-if="item.category">{{ item.category }}</span>
            <span v-else class="text-grey">-</span>
          </template>

          <template v-slot:item.status="{ item }">
            <div class="d-flex flex-column">
              <div class="d-flex align-center">
                <v-chip class="mr-2" :color="getTournamentStatus(item).color" size="small" text-color="white">
                  {{ getTournamentStatus(item).text }}
                </v-chip>

                <div class="text-caption" v-if="getTournamentStatus(item).text === 'Upcoming'">
                  In {{ daysUntilStart(item.startDate) }} days
                </div>

                <div class="text-caption" v-if="getTournamentStatus(item).text === 'Active'">
                  {{ daysRemaining(item.endDate) }} days remaining
                </div>

                <v-icon v-if="isCurrentTournament(item)" color="success" size="small" class="ml-2"
                  icon="mdi-star"></v-icon>
              </div>
            </div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center justify-end" @click.stop>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small"></v-btn>
                </template>
                <v-list class="pa-0">
                  <v-list-item @click="viewTournamentDetails(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-eye</v-icon>
                      View Details
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item @click="viewTournamentJobs(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-tennis</v-icon>
                      View String Jobs
                    </v-list-item-title>
                  </v-list-item>

                  <v-divider v-if="canManageTournaments"></v-divider>

                  <v-list-item v-if="canManageTournaments" @click="openEditTournamentDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-pencil</v-icon>
                      Edit Tournament
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item v-if="canManageTournaments" @click="openDeleteDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-delete</v-icon>
                      Delete Tournament
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </template>

          <!-- Row appearance -->
          <template v-slot:item.data-table-row="{ props }: any">
            <tr v-bind="props" :class="{ 'tournaments-view__current-row': isCurrentTournament(props.item) }"></tr>
          </template>
        </v-data-table-virtual>

        <!-- Pagination Controls -->
        <div class="d-flex justify-center align-center pa-4">
          <v-pagination v-model="page" :length="totalPages" :total-visible="7" density="comfortable"></v-pagination>

          <v-select v-model="itemsPerPage" :items="[10, 25, 50, 100]" label="Per page" density="compact" class="ms-4"
            style="max-width: 120px;" hide-details></v-select>
        </div>
      </v-card>
    </v-container>

    <!-- New Tournament Dialog -->
    <v-dialog v-model="showNewTournamentDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Add New Tournament</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitNewTournament">
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
          <v-btn color="secondary" variant="text" @click="showNewTournamentDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitNewTournament" :loading="tournamentStore.loading">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
          <p class="font-weight-bold">{{ tournamentForm.name }}</p>
          <p class="text-caption text-grey mt-4">
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
.tournaments-view {
  &__container {
    padding: $spacing-lg;
    max-width: 100%;
  }

  &__title {
    @include heading-1;
    color: $primary;
    margin-bottom: $spacing-lg;
  }

  &__table {
    cursor: pointer;

    :deep(tr:hover) {
      background-color: rgba($primary, 0.05) !important;
    }
  }

  &__current-row {
    background-color: rgba($primary, 0.07) !important;
    border-left: 3px solid $primary !important;
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