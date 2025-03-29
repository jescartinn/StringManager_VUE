<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStringerStore, useAuthStore, useStringJobStore } from '../stores'

// Import stores and router
const stringerStore = useStringerStore()
const authStore = useAuthStore()
const stringJobStore = useStringJobStore()
const router = useRouter()
const route = useRoute()

// Reactive state
const loading = ref(true)
const search = ref('')
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('lastName')
const sortDesc = ref(false)
const showFilters = ref(false)
const showNewStringerDialog = ref(false)
const showEditStringerDialog = ref(false)
const showDeleteConfirmation = ref(false)

// Stringer form data
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

// Initialize component
onMounted(async () => {
  try {
    // Load stringers data
    await stringerStore.fetchAllStringers()
  } catch (error) {
    console.error('Error initializing stringer view:', error)
  } finally {
    loading.value = false
  }
})

// Computed property to filter and sort stringers
const filteredStringers = computed(() => {
  let filtered = [...stringerStore.stringers]

  // Apply search filter if search text exists
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(stringer => {
      const fullName = `${stringer.name} ${stringer.lastName}`.toLowerCase()
      const email = stringer.email ? stringer.email.toLowerCase() : ''
      const phone = stringer.phoneNumber ? stringer.phoneNumber.toLowerCase() : ''
      
      return fullName.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower)
    })
  }

  // Sort the filtered stringers
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
    } else if (sortBy.value === 'email') {
      aValue = a.email || ''
      bValue = b.email || ''
    } else if (sortBy.value === 'phoneNumber') {
      aValue = a.phoneNumber || ''
      bValue = b.phoneNumber || ''
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
const paginatedStringers = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredStringers.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredStringers.value.length / itemsPerPage.value)
})

// Reset filters and reload data
const resetAndReload = async () => {
  search.value = ''
  await stringerStore.fetchAllStringers() // Force refresh
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

// Open dialog to add new stringer
const openNewStringerDialog = () => {
  // Reset form
  stringerForm.value = {
    id: null,
    name: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  }
  
  // Reset errors
  formErrors.value = {
    name: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  }
  
  showNewStringerDialog.value = true
}

// Open dialog to edit stringer
const openEditStringerDialog = (stringer: any) => {
  stringerForm.value = {
    id: stringer.id,
    name: stringer.name,
    lastName: stringer.lastName,
    email: stringer.email || '',
    phoneNumber: stringer.phoneNumber || ''
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

// Open dialog to confirm stringer deletion
const openDeleteDialog = (stringer: any) => {
  stringerForm.value = {
    id: stringer.id,
    name: stringer.name,
    lastName: stringer.lastName,
    email: stringer.email || '',
    phoneNumber: stringer.phoneNumber || ''
  }
  
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

// Submit new stringer
const submitNewStringer = async () => {
  if (!validateStringerForm()) return
  
  try {
    await stringerStore.createStringer({
      name: stringerForm.value.name,
      lastName: stringerForm.value.lastName,
      email: stringerForm.value.email || undefined,
      phoneNumber: stringerForm.value.phoneNumber || undefined
    })
    
    showNewStringerDialog.value = false
  } catch (error) {
    console.error('Error creating stringer:', error)
  }
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
  if (!stringerForm.value.id) return
  
  try {
    await stringerStore.deleteStringer(stringerForm.value.id)
    showDeleteConfirmation.value = false
  } catch (error) {
    console.error('Error deleting stringer:', error)
  }
}

// Check if user has permissions to add/edit stringers (only admins)
const canManageStringers = computed(() => {
  return authStore.isAdmin
})

// View stringer's jobs
const viewStringerJobs = (stringerId: number) => {
  router.push({ path: '/jobs', query: { stringer: stringerId.toString() } })
}

// View stringer details
const viewStringerDetails = (stringerId: number) => {
  router.push(`/stringers/${stringerId}`)
}

// Table headers
const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Last Name', key: 'lastName', sortable: true },
  { title: 'First Name', key: 'name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Phone', key: 'phoneNumber', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]
</script>

<template>
  <div class="stringers-view">
    <v-container class="stringers-view__container">
      <!-- Page Header -->
      <v-row class="mb-3">
        <v-col cols="12" sm="8">
          <h1 class="stringers-view__title">Stringers</h1>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn v-if="canManageStringers" class="mb-3" color="primary" prepend-icon="mdi-plus" @click="openNewStringerDialog">
            New Stringer
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

      <!-- Filters and Search -->
      <v-card class="mb-12">
        <v-card-text>
          <v-row class="align-center">
            <v-col cols="12">
              <v-text-field v-model="search" label="Search by name, email, or phone" prepend-inner-icon="mdi-magnify"
                density="comfortable" hide-details variant="outlined"></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- No results placeholder -->
      <v-card v-if="!loading && filteredStringers.length === 0" class="mb-6 text-center py-8">
        <v-icon icon="mdi-account-question" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">No stringers found</h3>
        <p class="text-body-1 mb-6 text-grey">Try adjusting your search or add a new stringer.</p>
        <v-btn v-if="canManageStringers" color="primary" prepend-icon="mdi-plus" @click="openNewStringerDialog">Add New Stringer</v-btn>
      </v-card>

      <!-- Stringer List Table -->
      <v-card v-else class="mb-6">
        <v-data-table-virtual :headers="headers" :items="paginatedStringers" :items-per-page="itemsPerPage"
          :page="page" :loading="loading" class="stringers-view__table" hover
          @update:options="(options: any) => page = options.page"
          @click:row="(event: any, { item }: any) => viewStringerDetails(item.id)">

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
          <template v-slot:item.email="{ item }">
            <a v-if="item.email" :href="`mailto:${item.email}`" @click.stop>{{ item.email }}</a>
            <div v-else>-</div>
          </template>

          <template v-slot:item.phoneNumber="{ item }">
            <a v-if="item.phoneNumber" :href="`tel:${item.phoneNumber}`" @click.stop>{{ item.phoneNumber }}</a>
            <div v-else>-</div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center justify-end" @click.stop>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small"></v-btn>
                </template>
                <v-list class="pa-0">
                  <v-list-item @click="viewStringerDetails(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-account-wrench</v-icon>
                      View Details
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item @click="viewStringerJobs(item.id)">
                    <v-list-item-title>
                      <v-icon start>mdi-tennis</v-icon>
                      View String Jobs
                    </v-list-item-title>
                  </v-list-item>

                  <v-divider v-if="canManageStringers"></v-divider>

                  <v-list-item v-if="canManageStringers" @click="openEditStringerDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-pencil</v-icon>
                      Edit Stringer
                    </v-list-item-title>
                  </v-list-item>

                  <v-list-item v-if="canManageStringers" @click="openDeleteDialog(item)">
                    <v-list-item-title>
                      <v-icon start>mdi-delete</v-icon>
                      Delete Stringer
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

    <!-- New Stringer Dialog -->
    <v-dialog v-model="showNewStringerDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Add New Stringer</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitNewStringer">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringerForm.name"
                  label="First Name"
                  :error-messages="formErrors.name"
                  required
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringerForm.lastName"
                  label="Last Name"
                  :error-messages="formErrors.lastName"
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
                  v-model="stringerForm.email"
                  label="Email"
                  :error-messages="formErrors.email"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                  type="email"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringerForm.phoneNumber"
                  label="Phone Number"
                  :error-messages="formErrors.phoneNumber"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showNewStringerDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitNewStringer" :loading="stringerStore.loading">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Stringer Dialog -->
    <v-dialog v-model="showEditStringerDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white">Edit Stringer</v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="submitEditStringer">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringerForm.name"
                  label="First Name"
                  :error-messages="formErrors.name"
                  required
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringerForm.lastName"
                  label="Last Name"
                  :error-messages="formErrors.lastName"
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
                  v-model="stringerForm.email"
                  label="Email"
                  :error-messages="formErrors.email"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                  type="email"
                ></v-text-field>
              </v-col>
              
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="stringerForm.phoneNumber"
                  label="Phone Number"
                  :error-messages="formErrors.phoneNumber"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hint="Optional"
                  persistent-hint
                ></v-text-field>
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
          <p class="font-weight-bold">{{ stringerForm.name }} {{ stringerForm.lastName }}</p>
          <p v-if="stringerForm.email" class="text-body-2">{{ stringerForm.email }}</p>
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
.stringers-view {
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