<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore, useAuthStore, useRacquetStore } from '../stores'

// Import stores and router
const playerStore = usePlayerStore()
const authStore = useAuthStore()
const racquetStore = useRacquetStore()
const router = useRouter()
const route = useRoute()

// Reactive state
const loading = ref(true)
const search = ref('')
const countryFilter = ref<string | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('lastName')
const sortDesc = ref(false)
const showFilters = ref(false)
const showNewPlayerDialog = ref(false)
const showEditPlayerDialog = ref(false)
const showDeleteConfirmation = ref(false)

// Player form data
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

// List of countries for filtering/selection
const countries = ref([
  { code: 'ESP', name: 'Spain' },
  { code: 'USA', name: 'United States' },
  { code: 'FRA', name: 'France' },
  { code: 'GBR', name: 'Great Britain' },
  { code: 'ITA', name: 'Italy' },
  { code: 'GER', name: 'Germany' },
  { code: 'SRB', name: 'Serbia' },
  { code: 'SUI', name: 'Switzerland' },
  { code: 'AUS', name: 'Australia' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'RUS', name: 'Russia' },
  { code: 'JPN', name: 'Japan' },
  { code: 'CAN', name: 'Canada' },
  { code: 'AUT', name: 'Austria' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'CHN', name: 'China' },
  { code: 'CRO', name: 'Croatia' },
  { code: 'CZE', name: 'Czech Republic' },
  { code: 'DEN', name: 'Denmark' },
  { code: 'NED', name: 'Netherlands' },
  { code: 'POL', name: 'Poland' },
  { code: 'GRE', name: 'Greece' },
  { code: 'BLR', name: 'Belarus' },
])

// Countries options for the filter/form
const countryOptions = computed(() => {
  return countries.value.map(country => ({
    title: country.name,
    value: country.code
  }))
})

// Initialize component
onMounted(async () => {
  try {
    // Load players data
    await playerStore.fetchPlayers()
  } catch (error) {
    console.error('Error initializing player view:', error)
  } finally {
    loading.value = false
  }
})

// Computed property to filter and sort players
const filteredPlayers = computed(() => {
  let filtered = [...playerStore.players]

  // Apply search filter if search text exists
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(player => {
      const fullName = `${player.name} ${player.lastName}`.toLowerCase()
      return fullName.includes(searchLower)
    })
  }

  // Apply country filter if set
  if (countryFilter.value) {
    filtered = filtered.filter(player => player.countryCode === countryFilter.value)
  }

  // Sort the filtered players
  filtered.sort((a, b) => {
    let aValue: any, bValue: any;

    if (sortBy.value === 'name') {
      aValue = a.name
      bValue = b.name
    } else if (sortBy.value === 'lastName') {
      aValue = a.lastName
      bValue = b.lastName
    } else if (sortBy.value === 'fullName') {
      aValue = `${a.lastName}, ${a.name}`
      bValue = `${b.lastName}, ${b.name}`
    } else if (sortBy.value === 'countryCode') {
      aValue = a.countryCode || ''
      bValue = b.countryCode || ''
    } else {
      // For other properties, access them safely
      aValue = a[sortBy.value as keyof typeof a]
      bValue = b[sortBy.value as keyof typeof b]
    }

    if (aValue === null || aValue === undefined) return sortDesc.value ? 1 : -1
    if (bValue === null || bValue === undefined) return sortDesc.value ? -1 : 1

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDesc.value ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue)
    }

    return sortDesc.value ? (bValue as number) - (aValue as number) : (aValue as number) - (bValue as number)
  })

  return filtered
})

// Pagination
const paginatedPlayers = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredPlayers.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredPlayers.value.length / itemsPerPage.value)
})

// Reset filters and reload data
const resetAndReload = async () => {
  search.value = ''
  countryFilter.value = null
  await playerStore.fetchPlayers() // Force refresh
}

// Get country name from code
const getCountryName = (countryCode: string | null | undefined) => {
  if (!countryCode) return ''
  const country = countries.value.find(c => c.code === countryCode)
  return country ? country.name : countryCode
}

// Handle sort change
const handleSort = (column: string) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = column
    sortDesc.value = false
  }
}

// Open dialog to add new player
const openNewPlayerDialog = () => {
  // Reset form
  playerForm.value = {
    id: null,
    name: '',
    lastName: '',
    countryCode: ''
  }
  
  // Reset errors
  formErrors.value = {
    name: '',
    lastName: '',
    countryCode: ''
  }
  
  showNewPlayerDialog.value = true
}

// Open dialog to edit player
const openEditPlayerDialog = (player: any) => {
  playerForm.value = {
    id: player.id,
    name: player.name,
    lastName: player.lastName,
    countryCode: player.countryCode || ''
  }
  
  // Reset errors
  formErrors.value = {
    name: '',
    lastName: '',
    countryCode: ''
  }
  
  showEditPlayerDialog.value = true
}

// Open dialog to confirm player deletion
const openDeleteDialog = (player: any) => {
  playerForm.value = {
    id: player.id,
    name: player.name,
    lastName: player.lastName,
    countryCode: player.countryCode || ''
  }
  
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

// Submit new player
const submitNewPlayer = async () => {
  if (!validatePlayerForm()) return
  
  try {
    await playerStore.createPlayer({
      name: playerForm.value.name,
      lastName: playerForm.value.lastName,
      countryCode: playerForm.value.countryCode || undefined
    })
    
    showNewPlayerDialog.value = false
  } catch (error) {
    console.error('Error creating player:', error)
  }
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
  if (!playerForm.value.id) return
  
  try {
    await playerStore.deletePlayer(playerForm.value.id)
    showDeleteConfirmation.value = false
  } catch (error) {
    console.error('Error deleting player:', error)
  }
}

// Check if user has permissions to add/edit players
const canManagePlayers = computed(() => {
  return authStore.isAdmin || authStore.isStringer
})

// View player details
const viewPlayerDetails = (playerId: number) => {
  router.push(`/players/${playerId}`)
}

// View player's racquets
const viewPlayerRacquets = async (playerId: number) => {
  try {
    await racquetStore.fetchRacquetsByPlayer(playerId)
    router.push({ path: '/racquets', query: { playerId: playerId.toString() } })
  } catch (error) {
    console.error('Error loading player racquets:', error)
  }
}

// View player's string jobs
const viewPlayerJobs = (playerId: number) => {
  router.push({ path: '/jobs', query: { player: playerId.toString() } })
}

// Table headers
const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Last Name', key: 'lastName', sortable: true },
  { title: 'First Name', key: 'name', sortable: true },
  { title: 'Country', key: 'countryCode', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]
</script>

<template>
  <div class="players-view">
    <v-container class="players-view__container">
      <!-- Page Header -->
      <v-row class="mb-3">
        <v-col cols="12" sm="8">
          <h1 class="players-view__title">Players</h1>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn v-if="canManagePlayers" class="mb-3" color="primary" prepend-icon="mdi-plus" @click="openNewPlayerDialog">
            New Player
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

      <!-- Filters and Search -->
      <v-card class="mb-12">
        <v-card-text>
          <v-row class="align-center">
            <v-col cols="12" md="9">
              <v-text-field v-model="search" label="Search by name" prepend-inner-icon="mdi-magnify"
                density="comfortable" hide-details variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="6" md="1">
              <v-btn color="secondary" variant="text" block @click="showFilters = !showFilters">
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
                <v-col cols="12" md="4">
                  <v-select v-model="countryFilter" label="Country" :items="countryOptions"
                    item-title="title" item-value="value" variant="outlined" density="comfortable"
                    clearable hide-details></v-select>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- No results placeholder -->
      <v-card v-if="!loading && filteredPlayers.length === 0" class="mb-6 text-center py-8">
        <v-icon icon="mdi-account-question" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">No players found</h3>
        <p class="text-body-1 mb-6 text-grey">Try adjusting your filters or add a new player.</p>
        <v-btn v-if="canManagePlayers" color="primary" prepend-icon="mdi-plus" @click="openNewPlayerDialog">Add New Player</v-btn>
      </v-card>

      <!-- Player List Table -->
      <v-card v-else class="mb-6">
        <v-data-table-virtual :headers="headers" :items="paginatedPlayers" :items-per-page="itemsPerPage"
          :page="page" :loading="loading" class="players-view__table" hover
          @update:options="(options: any) => page = options.page"
          @click:row="(event: any, { item }: any) => viewPlayerDetails(item.id)">

          <!-- Custom Header -->
          <template v-slot:header.column="{ column }">
            <div class="d-flex align-center">
              {{ column.title }}
              <v-btn v-if="column.key && column.key !== 'actions' && column.sortable"
                icon="mdi-arrow-up-down" size="small" variant="text"
                @click.stop="handleSort(column.key)"></v-btn>
            </div>
          </template>

          <!-- Custom Columns -->
          <template v-slot:item.countryCode="{ item }">
            <div v-if="item.countryCode">
              {{ getCountryName(item.countryCode) }}
              <span class="text-caption ms-1">({{ item.countryCode }})</span>
            </div>
            <div v-else>-</div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center justify-end" @click.stop>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small"></v-btn>
                </template>
                <v-list class="pa-0">
                  <v-list-item @click="viewPlayerDetails(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-account</v-icon>
                      View Details
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item @click="viewPlayerRacquets(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-tennis-ball</v-icon>
                      View Racquets
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item @click="viewPlayerJobs(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-tennis</v-icon>
                      View String Jobs
                    </v-list-item-title>
                  </v-list-item>

                  <v-divider v-if="canManagePlayers"></v-divider>

                  <v-list-item v-if="canManagePlayers" @click="openEditPlayerDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-pencil</v-icon>
                      Edit Player
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item v-if="canManagePlayers" @click="openDeleteDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-delete</v-icon>
                      Delete Player
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </template>
        </v-data-table-virtual>

        <!-- Pagination Controls -->
        <div class="d-flex justify-center align-center pa-4">
          <v-pagination v-model="page" :length="totalPages" :total-visible="7"
            density="comfortable"></v-pagination>

          <v-select v-model="itemsPerPage" :items="[10, 25, 50, 100]" label="Per page" density="compact"
            class="ms-4" style="max-width: 120px;" hide-details></v-select>
        </div>
      </v-card>
    </v-container>

    <!-- New Player Dialog -->
    <v-dialog v-model="showNewPlayerDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Add New Player</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitNewPlayer">
            <v-text-field
              v-model="playerForm.name"
              label="First Name"
              :error-messages="formErrors.name"
              required
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <v-text-field
              v-model="playerForm.lastName"
              label="Last Name"
              :error-messages="formErrors.lastName"
              required
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <v-select
              v-model="playerForm.countryCode"
              label="Country"
              :items="countryOptions"
              item-title="title"
              item-value="value"
              variant="outlined" 
              density="comfortable"
              clearable
              class="mb-3"
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showNewPlayerDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitNewPlayer" :loading="playerStore.loading">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Player Dialog -->
    <v-dialog v-model="showEditPlayerDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit Player</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditPlayer">
            <v-text-field
              v-model="playerForm.name"
              label="First Name"
              :error-messages="formErrors.name"
              required
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <v-text-field
              v-model="playerForm.lastName"
              label="Last Name"
              :error-messages="formErrors.lastName"
              required
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>

            <v-select
              v-model="playerForm.countryCode"
              label="Country"
              :items="countryOptions"
              item-title="title"
              item-value="value"
              variant="outlined" 
              density="comfortable"
              clearable
              class="mb-3"
            ></v-select>
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
          <p class="font-weight-bold">{{ playerForm.name }} {{ playerForm.lastName }}</p>
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
.players-view {
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
}
</style>