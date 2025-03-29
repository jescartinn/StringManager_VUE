<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStringTypeStore, useAuthStore } from '../stores'

// Import stores and router
const stringTypeStore = useStringTypeStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Reactive state
const loading = ref(true)
const search = ref('')
const brandFilter = ref<string | null>(null)
const materialFilter = ref<string | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('brand')
const sortDesc = ref(false)
const showFilters = ref(false)
const showNewStringDialog = ref(false)
const showEditStringDialog = ref(false)
const showDeleteConfirmation = ref(false)

// StringType form data
const stringForm = ref({
  id: null as number | null,
  brand: '',
  model: '',
  gauge: '',
  material: '',
  color: ''
})

// Validation errors
const formErrors = ref({
  brand: '',
  model: '',
  gauge: '',
  material: '',
  color: ''
})

// List of common string materials for filtering/selection
const materialOptions = ref([
  { title: 'Polyester', value: 'Polyester' },
  { title: 'Natural Gut', value: 'Natural Gut' },
  { title: 'Multifilament', value: 'Multifilament' },
  { title: 'Synthetic Gut', value: 'Synthetic Gut' },
  { title: 'Hybrid', value: 'Hybrid' },
  { title: 'Co-Polyester', value: 'Co-Polyester' },
  { title: 'Nylon', value: 'Nylon' }
])

// Get unique brands for filter
const uniqueBrands = computed(() => {
  const brands = stringTypeStore.stringTypes.map(string => string.brand)
  return [...new Set(brands)].sort()
})

// Initialize component
onMounted(async () => {
  try {
    // Load strings data
    await stringTypeStore.fetchAllStringTypes()
  } catch (error) {
    console.error('Error initializing string types view:', error)
  } finally {
    loading.value = false
  }
})

// Computed property to filter and sort string types
const filteredStringTypes = computed(() => {
  let filtered = [...stringTypeStore.stringTypes]

  // Apply search filter if search text exists
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(stringType => {
      const brandModel = `${stringType.brand} ${stringType.model}`.toLowerCase()
      const material = stringType.material ? stringType.material.toLowerCase() : ''
      const gauge = stringType.gauge ? stringType.gauge.toLowerCase() : ''
      const color = stringType.color ? stringType.color.toLowerCase() : ''
      
      return brandModel.includes(searchLower) || 
             material.includes(searchLower) || 
             gauge.includes(searchLower) ||
             color.includes(searchLower)
    })
  }

  // Apply brand filter if set
  if (brandFilter.value) {
    filtered = filtered.filter(stringType => stringType.brand === brandFilter.value)
  }

  // Apply material filter if set
  if (materialFilter.value) {
    filtered = filtered.filter(stringType => stringType.material === materialFilter.value)
  }

  // Sort the filtered strings
  filtered.sort((a, b) => {
    let aValue: any, bValue: any;
    
    if (sortBy.value === 'brand') {
      aValue = a.brand
      bValue = b.brand
    } else if (sortBy.value === 'model') {
      aValue = a.model
      bValue = b.model
    } else if (sortBy.value === 'gauge') {
      aValue = a.gauge || ''
      bValue = b.gauge || ''
    } else if (sortBy.value === 'material') {
      aValue = a.material || ''
      bValue = b.material || ''
    } else if (sortBy.value === 'color') {
      aValue = a.color || ''
      bValue = b.color || ''
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
const paginatedStringTypes = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredStringTypes.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredStringTypes.value.length / itemsPerPage.value)
})

// Reset filters and reload data
const resetAndReload = async () => {
  search.value = ''
  brandFilter.value = null
  materialFilter.value = null
  await stringTypeStore.fetchAllStringTypes() // Force refresh
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

// Open dialog to add new string type
const openNewStringDialog = () => {
  // Reset form
  stringForm.value = {
    id: null,
    brand: '',
    model: '',
    gauge: '',
    material: '',
    color: ''
  }
  
  // Reset errors
  formErrors.value = {
    brand: '',
    model: '',
    gauge: '',
    material: '',
    color: ''
  }
  
  showNewStringDialog.value = true
}

// Open dialog to edit string type
const openEditStringDialog = (stringType: any) => {
  stringForm.value = {
    id: stringType.id,
    brand: stringType.brand,
    model: stringType.model,
    gauge: stringType.gauge || '',
    material: stringType.material || '',
    color: stringType.color || ''
  }
  
  // Reset errors
  formErrors.value = {
    brand: '',
    model: '',
    gauge: '',
    material: '',
    color: ''
  }
  
  showEditStringDialog.value = true
}

// Open dialog to confirm string type deletion
const openDeleteDialog = (stringType: any) => {
  stringForm.value = {
    id: stringType.id,
    brand: stringType.brand,
    model: stringType.model,
    gauge: stringType.gauge || '',
    material: stringType.material || '',
    color: stringType.color || ''
  }
  
  showDeleteConfirmation.value = true
}

// Validate string type form
const validateStringForm = () => {
  let isValid = true
  
  // Validate brand
  if (!stringForm.value.brand.trim()) {
    formErrors.value.brand = 'Brand is required'
    isValid = false
  } else {
    formErrors.value.brand = ''
  }
  
  // Validate model
  if (!stringForm.value.model.trim()) {
    formErrors.value.model = 'Model is required'
    isValid = false
  } else {
    formErrors.value.model = ''
  }
  
  // Gauge, material, and color are optional, so no validation needed
  
  return isValid
}

// Submit new string type
const submitNewString = async () => {
  if (!validateStringForm()) return
  
  try {
    await stringTypeStore.createStringType({
      brand: stringForm.value.brand,
      model: stringForm.value.model,
      gauge: stringForm.value.gauge || undefined,
      material: stringForm.value.material || undefined,
      color: stringForm.value.color || undefined
    })
    
    showNewStringDialog.value = false
  } catch (error) {
    console.error('Error creating string type:', error)
  }
}

// Submit string type edit
const submitEditString = async () => {
  if (!validateStringForm() || !stringForm.value.id) return
  
  try {
    await stringTypeStore.updateStringType(stringForm.value.id, {
      brand: stringForm.value.brand,
      model: stringForm.value.model,
      gauge: stringForm.value.gauge || undefined,
      material: stringForm.value.material || undefined,
      color: stringForm.value.color || undefined
    })
    
    showEditStringDialog.value = false
  } catch (error) {
    console.error('Error updating string type:', error)
  }
}

// Delete string type
const deleteStringType = async () => {
  if (!stringForm.value.id) return
  
  try {
    await stringTypeStore.deleteStringType(stringForm.value.id)
    showDeleteConfirmation.value = false
  } catch (error) {
    console.error('Error deleting string type:', error)
  }
}

// Check if user has permissions to manage string types
const canManageStringTypes = computed(() => {
  return authStore.isAdmin || authStore.isStringer
})

// View string type details (to be implemented)
const viewStringTypeDetails = (stringTypeId: number) => {
  // For future implementation - string type details page
  // router.push(`/strings/${stringTypeId}`)
  
  // For now, just open the edit dialog
  const stringType = stringTypeStore.getStringTypeById(stringTypeId)
  if (stringType) {
    openEditStringDialog(stringType)
  }
}

// View string jobs that use this string type
const viewStringJobs = (stringTypeId: number) => {
  router.push({ path: '/jobs', query: { string: stringTypeId.toString() } })
}

// Table headers
const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Brand', key: 'brand', sortable: true },
  { title: 'Model', key: 'model', sortable: true },
  { title: 'Gauge', key: 'gauge', sortable: true },
  { title: 'Material', key: 'material', sortable: true },
  { title: 'Color', key: 'color', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]
</script>

<template>
  <div class="strings-view">
    <v-container class="strings-view__container">
      <!-- Page Header -->
      <v-row class="mb-3">
        <v-col cols="12" sm="8">
          <h1 class="strings-view__title">Strings</h1>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn v-if="canManageStringTypes" class="mb-3" color="primary" prepend-icon="mdi-plus" @click="openNewStringDialog">
            New String
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error Alert -->
      <v-row class="mb-3" v-if="stringTypeStore.error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable>
            {{ stringTypeStore.error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Filters and Search -->
      <v-card class="mb-12">
        <v-card-text>
          <v-row class="align-center">
            <v-col cols="12" md="9">
              <v-text-field v-model="search" label="Search strings" prepend-inner-icon="mdi-magnify"
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
                  <v-select v-model="brandFilter" label="Brand" :items="uniqueBrands"
                    variant="outlined" density="comfortable" clearable hide-details></v-select>
                </v-col>
                <v-col cols="12" sm="6" md="4">
                  <v-select v-model="materialFilter" label="Material" :items="materialOptions"
                    item-title="title" item-value="value" variant="outlined" density="comfortable"
                    clearable hide-details></v-select>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- No results placeholder -->
      <v-card v-if="!loading && filteredStringTypes.length === 0" class="mb-6 text-center py-8">
        <v-icon icon="mdi-grid" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">No strings found</h3>
        <p class="text-body-1 mb-6 text-grey">Try adjusting your filters or add a new string type.</p>
        <v-btn v-if="canManageStringTypes" color="primary" prepend-icon="mdi-plus" @click="openNewStringDialog">Add New String</v-btn>
      </v-card>

      <!-- String Types List Table -->
      <v-card v-else class="mb-6">
        <v-data-table-virtual :headers="headers" :items="paginatedStringTypes" :items-per-page="itemsPerPage"
          :page="page" :loading="loading" class="strings-view__table" hover
          @update:options="(options: any) => page = options.page"
          @click:row="(event: any, { item }: any) => viewStringTypeDetails(item.id)">

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
          <template v-slot:item.gauge="{ item }">
            <div v-if="item.gauge">{{ item.gauge }}</div>
            <div v-else class="text-grey">-</div>
          </template>

          <template v-slot:item.material="{ item }">
            <div v-if="item.material">{{ item.material }}</div>
            <div v-else class="text-grey">-</div>
          </template>

          <template v-slot:item.color="{ item }">
            <div v-if="item.color" class="d-flex align-center">
              {{ item.color }}
              <div class="ml-2 string-color-swatch" :style="{ backgroundColor: item.color.toLowerCase() }"></div>
            </div>
            <div v-else class="text-grey">-</div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center justify-end" @click.stop>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small"></v-btn>
                </template>
                <v-list class="pa-0">
                  <v-list-item @click="viewStringTypeDetails(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-eye</v-icon>
                      View Details
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item @click="viewStringJobs(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-tennis</v-icon>
                      View String Jobs
                    </v-list-item-title>
                  </v-list-item>

                  <v-divider v-if="canManageStringTypes"></v-divider>

                  <v-list-item v-if="canManageStringTypes" @click="openEditStringDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-pencil</v-icon>
                      Edit String
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item v-if="canManageStringTypes" @click="openDeleteDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-delete</v-icon>
                      Delete String
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

    <!-- New String Dialog -->
    <v-dialog v-model="showNewStringDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Add New String</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitNewString">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringForm.brand"
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
                  v-model="stringForm.model"
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
                  v-model="stringForm.gauge"
                  label="Gauge"
                  hint="e.g., 1.25mm, 17g"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="stringForm.material"
                  label="Material"
                  :items="materialOptions"
                  item-title="title"
                  item-value="value"
                  hint="String material type"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  clearable
                ></v-select>
              </v-col>
            </v-row>

            <v-text-field
              v-model="stringForm.color"
              label="Color"
              hint="e.g., Black, Natural, Blue, etc."
              persistent-hint
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showNewStringDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitNewString" :loading="stringTypeStore.loading">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit String Dialog -->
    <v-dialog v-model="showEditStringDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit String</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditString">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringForm.brand"
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
                  v-model="stringForm.model"
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
                  v-model="stringForm.gauge"
                  label="Gauge"
                  hint="e.g., 1.25mm, 17g"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="stringForm.material"
                  label="Material"
                  :items="materialOptions"
                  item-title="title"
                  item-value="value"
                  hint="String material type"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  clearable
                ></v-select>
              </v-col>
            </v-row>

            <v-text-field
              v-model="stringForm.color"
              label="Color"
              hint="e.g., Black, Natural, Blue, etc."
              persistent-hint
              variant="outlined"
              density="comfortable"
              class="mb-3"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showEditStringDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitEditString" :loading="stringTypeStore.loading">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmation" max-width="500px">
      <v-card>
        <v-card-title class="text-h5 bg-error text-white">Delete String</v-card-title>
        <v-card-text class="pt-4">
          <p>Are you sure you want to delete this string?</p>
          <p class="font-weight-bold">{{ stringForm.brand }} {{ stringForm.model }}</p>
          <p v-if="stringForm.gauge || stringForm.material" class="font-weight-medium">
            {{ stringForm.gauge ? stringForm.gauge + ' ' : '' }}{{ stringForm.material || '' }}
          </p>
          <p class="text-caption text-grey mt-4">
            Note: Strings that are used in any string jobs cannot be deleted. 
            You must delete or update the string jobs first.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showDeleteConfirmation = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteStringType" :loading="stringTypeStore.loading">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style lang="scss" scoped>
.strings-view {
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

.string-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: inline-block;
}
</style>