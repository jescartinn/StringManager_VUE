<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRacquetStore, usePlayerStore, useAuthStore } from '../stores'

// Import stores and router
const racquetStore = useRacquetStore()
const playerStore = usePlayerStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Reactive state
const loading = ref(true)
const search = ref('')
const playerFilter = ref<number | null>(null)
const brandFilter = ref<string | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('brand')
const sortDesc = ref(false)
const showFilters = ref(false)
const showNewRacquetDialog = ref(false)
const showEditRacquetDialog = ref(false)
const showDeleteConfirmation = ref(false)

// Get unique brands for filter
const uniqueBrands = computed(() => {
  const brands = racquetStore.racquets.map(racquet => racquet.brand)
  return [...new Set(brands)].sort()
})

// Racquet form data
const racquetForm = ref({
  id: null as number | null,
  playerId: null as number | null,
  brand: '',
  model: '',
  serialNumber: '',
  headSize: null as number | null,
  notes: ''
})

// Validation errors
const formErrors = ref({
  playerId: '',
  brand: '',
  model: '',
  serialNumber: '',
  headSize: ''
})

// Initialize component
onMounted(async () => {
  // Get any query parameters
  const queryPlayerId = route.query.playerId ? parseInt(route.query.playerId as string) : null
  
  if (queryPlayerId) {
    playerFilter.value = queryPlayerId
  }
  
  try {
    // Load initial data
    await loadData()
    
    // Load players for filters and form dropdowns
    await playerStore.fetchPlayers()
  } catch (error) {
    console.error('Error initializing racquet view:', error)
  } finally {
    loading.value = false
  }
})

// Watch for query param changes
watch(() => route.query, (newQuery) => {
  const queryPlayerId = newQuery.playerId ? parseInt(newQuery.playerId as string) : null
  
  if (queryPlayerId !== playerFilter.value) {
    playerFilter.value = queryPlayerId
    loadData()
  }
}, { deep: true })

// Watch for filter changes to update URL
watch([playerFilter, brandFilter], () => {
  updateQueryParams()
})

// Update URL query parameters based on current filters
const updateQueryParams = () => {
  const query: Record<string, string> = {}
  
  if (playerFilter.value) query.playerId = playerFilter.value.toString()
  if (brandFilter.value) query.brand = brandFilter.value
  
  // Replace URL without reloading the page
  router.replace({ query })
}

// Function to load data based on filters
const loadData = async () => {
  loading.value = true
  
  try {
    if (playerFilter.value) {
      // Load racquets for specific player
      await racquetStore.fetchRacquetsByPlayer(playerFilter.value)
    } else {
      // Load all racquets
      await racquetStore.fetchAllRacquets()
    }
  } catch (error) {
    console.error('Error loading racquets:', error)
  } finally {
    loading.value = false
  }
}

// Reset filters and reload data
const resetAndReload = async () => {
  search.value = ''
  playerFilter.value = null
  brandFilter.value = null
  
  router.replace({ query: {} }) // Clear URL query params
  
  await racquetStore.fetchAllRacquets(true) // Force refresh
}

// Computed property to filter and sort racquets
const filteredRacquets = computed(() => {
  let filtered = [...racquetStore.racquets]
  
  // Apply search filter if search text exists
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(racquet => {
      const brandModel = `${racquet.brand} ${racquet.model}`.toLowerCase()
      const serial = racquet.serialNumber ? racquet.serialNumber.toLowerCase() : ''
      const notes = racquet.notes ? racquet.notes.toLowerCase() : ''
      const playerName = racquet.player ? `${racquet.player.name} ${racquet.player.lastName}`.toLowerCase() : ''
      
      return brandModel.includes(searchLower) || 
             serial.includes(searchLower) || 
             notes.includes(searchLower) ||
             playerName.includes(searchLower)
    })
  }
  
  // Apply player filter if set (should already be filtered from API, but just in case)
  if (playerFilter.value) {
    filtered = filtered.filter(racquet => racquet.playerId === playerFilter.value)
  }
  
  // Apply brand filter if set
  if (brandFilter.value) {
    filtered = filtered.filter(racquet => racquet.brand === brandFilter.value)
  }
  
  // Sort the filtered racquets
  filtered.sort((a, b) => {
    let aValue: any, bValue: any;
    
    if (sortBy.value === 'brand') {
      aValue = a.brand
      bValue = b.brand
    } else if (sortBy.value === 'model') {
      aValue = a.model
      bValue = b.model
    } else if (sortBy.value === 'serialNumber') {
      aValue = a.serialNumber || ''
      bValue = b.serialNumber || ''
    } else if (sortBy.value === 'headSize') {
      aValue = a.headSize || 0
      bValue = b.headSize || 0
    } else if (sortBy.value === 'player') {
      aValue = a.player ? `${a.player.lastName}, ${a.player.name}` : ''
      bValue = b.player ? `${b.player.lastName}, ${b.player.name}` : ''
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
const paginatedRacquets = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredRacquets.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredRacquets.value.length / itemsPerPage.value)
})

// Handle sort change
const handleSort = (column: string) => {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = column
    sortDesc.value = false
  }
}

// Open dialog to add new racquet
const openNewRacquetDialog = () => {
  // Reset form
  racquetForm.value = {
    id: null,
    playerId: playerFilter.value, // Pre-select player if filtered
    brand: '',
    model: '',
    serialNumber: '',
    headSize: null,
    notes: ''
  }
  
  // Reset errors
  formErrors.value = {
    playerId: '',
    brand: '',
    model: '',
    serialNumber: '',
    headSize: ''
  }
  
  showNewRacquetDialog.value = true
}

// Open dialog to edit racquet
const openEditRacquetDialog = (racquet: any) => {
  racquetForm.value = {
    id: racquet.id,
    playerId: racquet.playerId,
    brand: racquet.brand,
    model: racquet.model,
    serialNumber: racquet.serialNumber || '',
    headSize: racquet.headSize,
    notes: racquet.notes || ''
  }
  
  // Reset errors
  formErrors.value = {
    playerId: '',
    brand: '',
    model: '',
    serialNumber: '',
    headSize: ''
  }
  
  showEditRacquetDialog.value = true
}

// Open dialog to confirm racquet deletion
const openDeleteDialog = (racquet: any) => {
  racquetForm.value = {
    id: racquet.id,
    playerId: racquet.playerId,
    brand: racquet.brand,
    model: racquet.model,
    serialNumber: racquet.serialNumber || '',
    headSize: racquet.headSize,
    notes: racquet.notes || ''
  }
  
  showDeleteConfirmation.value = true
}

// Validate racquet form
const validateRacquetForm = () => {
  let isValid = true
  
  // Validate player
  if (!racquetForm.value.playerId) {
    formErrors.value.playerId = 'Player is required'
    isValid = false
  } else {
    formErrors.value.playerId = ''
  }
  
  // Validate brand
  if (!racquetForm.value.brand.trim()) {
    formErrors.value.brand = 'Brand is required'
    isValid = false
  } else {
    formErrors.value.brand = ''
  }
  
  // Validate model
  if (!racquetForm.value.model.trim()) {
    formErrors.value.model = 'Model is required'
    isValid = false
  } else {
    formErrors.value.model = ''
  }
  
  // Validate headSize if provided
  if (racquetForm.value.headSize !== null && 
      (racquetForm.value.headSize <= 0 || racquetForm.value.headSize > 200)) {
    formErrors.value.headSize = 'Head size must be between 1 and 200 sq in'
    isValid = false
  } else {
    formErrors.value.headSize = ''
  }
  
  return isValid
}

// Submit new racquet
const submitNewRacquet = async () => {
  if (!validateRacquetForm()) return
  
  try {
    await racquetStore.createRacquet({
      playerId: racquetForm.value.playerId as number,
      brand: racquetForm.value.brand,
      model: racquetForm.value.model,
      serialNumber: racquetForm.value.serialNumber || undefined,
      headSize: racquetForm.value.headSize || undefined,
      notes: racquetForm.value.notes || undefined
    })
    
    showNewRacquetDialog.value = false
  } catch (error) {
    console.error('Error creating racquet:', error)
  }
}

// Submit racquet edit
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

// Delete racquet
const deleteRacquet = async () => {
  if (!racquetForm.value.id) return
  
  try {
    await racquetStore.deleteRacquet(racquetForm.value.id)
    showDeleteConfirmation.value = false
  } catch (error) {
    console.error('Error deleting racquet:', error)
  }
}

// Check if user has permissions to manage racquets
const canManageRacquets = computed(() => {
  return authStore.isAdmin || authStore.isStringer
})

// View racquet details
const viewRacquetDetails = (racquetId: number) => {
  router.push(`/racquets/${racquetId}`)
}

// Create new string job for racquet
const createStringJob = (racquet: any) => {
  router.push(`/jobs/new?playerId=${racquet.playerId}&racquetId=${racquet.id}`)
}

// View player details
const viewPlayerDetails = (playerId: number) => {
  router.push(`/players/${playerId}`)
}

// Table headers
const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Brand', key: 'brand', sortable: true },
  { title: 'Model', key: 'model', sortable: true },
  { title: 'Serial Number', key: 'serialNumber', sortable: true },
  { title: 'Head Size', key: 'headSize', sortable: true },
  { title: 'Player', key: 'player', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]
</script>

<template>
  <div class="racquets-view">
    <v-container class="racquets-view__container">
      <!-- Page Header -->
      <v-row class="mb-3">
        <v-col cols="12" sm="8">
          <h1 class="racquets-view__title">
            <template v-if="playerFilter && playerStore.getPlayerById(playerFilter)">
              {{ playerStore.getPlayerById(playerFilter)?.name }} 
              {{ playerStore.getPlayerById(playerFilter)?.lastName }}'s Racquets
            </template>
            <template v-else>
              All Racquets
            </template>
          </h1>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn v-if="canManageRacquets" class="mb-3" color="primary" prepend-icon="mdi-plus" @click="openNewRacquetDialog">
            New Racquet
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

      <!-- Filters and Search -->
      <v-card class="mb-12">
        <v-card-text>
          <v-row class="align-center">
            <v-col cols="12" md="9">
              <v-text-field v-model="search" label="Search racquets" prepend-inner-icon="mdi-magnify"
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
                <v-col cols="12" sm="6" md="4">
                  <v-select v-model="playerFilter" label="Player" :items="playerStore.playerOptions"
                    item-title="text" item-value="value" variant="outlined" density="comfortable"
                    clearable hide-details></v-select>
                </v-col>
                <v-col cols="12" sm="6" md="4">
                  <v-select v-model="brandFilter" label="Brand" :items="uniqueBrands"
                    variant="outlined" density="comfortable" clearable hide-details></v-select>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- No results placeholder -->
      <v-card v-if="!loading && filteredRacquets.length === 0" class="mb-6 text-center py-8">
        <v-icon icon="mdi-tennis-ball" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">No racquets found</h3>
        <p class="text-body-1 mb-6 text-grey">Try adjusting your filters or add a new racquet.</p>
        <v-btn v-if="canManageRacquets" color="primary" prepend-icon="mdi-plus" @click="openNewRacquetDialog">Add New Racquet</v-btn>
      </v-card>

      <!-- Racquet List Table -->
      <v-card v-else class="mb-6">
        <v-data-table-virtual :headers="headers" :items="paginatedRacquets" :items-per-page="itemsPerPage"
          :page="page" :loading="loading" class="racquets-view__table" hover
          @update:options="(options: any) => page = options.page"
          @click:row="(event, { item }) => viewRacquetDetails(item.id)">

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
          <template v-slot:item.headSize="{ item }">
            <div v-if="item.headSize">{{ item.headSize }} sq in</div>
            <div v-else>-</div>
          </template>

          <template v-slot:item.player="{ item }">
            <div v-if="item.player">
              {{ item.player.name }} {{ item.player.lastName }}
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
                  <v-list-item @click="viewRacquetDetails(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-tennis-ball</v-icon>
                      View Details
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item @click="createStringJob(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-tennis</v-icon>
                      New String Job
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item @click="viewPlayerDetails(item.playerId)">
                    <v-list-item-title>
                      <v-icon start>mdi-account</v-icon>
                      View Player
                    </v-list-item-title>
                  </v-list-item>

                  <v-divider v-if="canManageRacquets"></v-divider>

                  <v-list-item v-if="canManageRacquets" @click="openEditRacquetDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-pencil</v-icon>
                      Edit Racquet
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item v-if="canManageRacquets" @click="openDeleteDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-delete</v-icon>
                      Delete Racquet
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

    <!-- New Racquet Dialog -->
    <v-dialog v-model="showNewRacquetDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Add New Racquet</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitNewRacquet">
            <v-select
              v-model="racquetForm.playerId"
              label="Player"
              :items="playerStore.playerOptions"
              item-title="text"
              item-value="value"
              :error-messages="formErrors.playerId"
              required
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-select>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="racquetForm.brand"
                  label="Brand"
                  :error-messages="formErrors.brand"
                  required
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="racquetForm.model"
                  label="Model"
                  :error-messages="formErrors.model"
                  required
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="racquetForm.serialNumber"
                  label="Serial Number"
                  :error-messages="formErrors.serialNumber"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="racquetForm.headSize"
                  type="number"
                  label="Head Size (sq in)"
                  :error-messages="formErrors.headSize"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                ></v-text-field>
              </v-col>
            </v-row>

            <v-textarea
              v-model="racquetForm.notes"
              label="Notes"
              variant="outlined"
              density="comfortable"
              rows="3"
              class="mb-3"
              hint="Optional"
              persistent-hint
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showNewRacquetDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitNewRacquet" :loading="racquetStore.loading">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Racquet Dialog -->
    <v-dialog v-model="showEditRacquetDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit Racquet</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditRacquet">
            <!-- Player can't be changed in edit mode -->
            <div class="mb-3 px-3 py-2 bg-grey-lighten-5 rounded">
              <p class="text-subtitle-1 font-weight-medium mb-1">Player:</p>
              <p class="text-body-1">
                {{ playerStore.getPlayerFullName(racquetForm.playerId || 0) }}
              </p>
            </div>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="racquetForm.brand"
                  label="Brand"
                  :error-messages="formErrors.brand"
                  required
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="racquetForm.model"
                  label="Model"
                  :error-messages="formErrors.model"
                  required
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="racquetForm.serialNumber"
                  label="Serial Number"
                  :error-messages="formErrors.serialNumber"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="racquetForm.headSize"
                  type="number"
                  label="Head Size (sq in)"
                  :error-messages="formErrors.headSize"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                ></v-text-field>
              </v-col>
            </v-row>

            <v-textarea
              v-model="racquetForm.notes"
              label="Notes"
              variant="outlined"
              density="comfortable"
              rows="3"
              class="mb-3"
              hint="Optional"
              persistent-hint
            ></v-textarea>
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
          <p class="font-weight-bold">{{ racquetForm.brand }} {{ racquetForm.model }}</p>
          <p v-if="racquetForm.serialNumber" class="font-weight-medium">Serial: {{ racquetForm.serialNumber }}</p>
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
.racquets-view {
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