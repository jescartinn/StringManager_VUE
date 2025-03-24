<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

// Estados de filtro
const searchQuery = ref('')
const statusFilter = ref('all')
const sortBy = ref('createdAt')
const sortDesc = ref(true)

// Datos simulados para trabajos de encordado
const stringJobs = ref([
  {
    id: 1,
    playerName: 'Rafael Nadal',
    racquet: { brand: 'Babolat', model: 'Pure Aero' },
    mainString: { brand: 'Babolat', model: 'RPM Blast' },
    crossString: { brand: 'Babolat', model: 'VS Touch' },
    mainTension: 25,
    crossTension: 23,
    isTensionInKg: true,
    stringer: 'Juan Pérez',
    status: 'Completed',
    priority: 1,
    createdAt: '2025-03-20T14:30:00',
    completedAt: '2025-03-20T16:45:00',
    tournament: 'Australian Open 2025'
  },
  {
    id: 2,
    playerName: 'Novak Djokovic',
    racquet: { brand: 'Head', model: 'Speed Pro' },
    mainString: { brand: 'Luxilon', model: 'ALU Power' },
    crossString: null,
    mainTension: 24,
    crossTension: null,
    isTensionInKg: true,
    stringer: 'María González',
    status: 'InProgress',
    priority: 1,
    createdAt: '2025-03-22T09:15:00',
    completedAt: null,
    tournament: 'Australian Open 2025'
  },
  {
    id: 3,
    playerName: 'Carlos Alcaraz',
    racquet: { brand: 'Babolat', model: 'Pure Aero' },
    mainString: { brand: 'Solinco', model: 'Hyper-G' },
    crossString: null,
    mainTension: 25,
    crossTension: null,
    isTensionInKg: true,
    stringer: null,
    status: 'Pending',
    priority: 2,
    createdAt: '2025-03-22T10:45:00',
    completedAt: null,
    tournament: 'Australian Open 2025'
  },
  {
    id: 4,
    playerName: 'Iga Swiatek',
    racquet: { brand: 'Tecnifibre', model: 'Tempo' },
    mainString: { brand: 'Tecnifibre', model: 'Pro Red Code' },
    crossString: null,
    mainTension: 24,
    crossTension: null,
    isTensionInKg: true,
    stringer: null,
    status: 'Pending',
    priority: 3,
    createdAt: '2025-03-22T11:20:00',
    completedAt: null,
    tournament: 'Australian Open 2025'
  },
  {
    id: 5,
    playerName: 'Aryna Sabalenka',
    racquet: { brand: 'Wilson', model: 'Blade' },
    mainString: { brand: 'Wilson', model: 'Natural Gut' },
    crossString: { brand: 'Luxilon', model: 'ALU Power' },
    mainTension: 23,
    crossTension: 25,
    isTensionInKg: true,
    stringer: 'Carlos Rodríguez',
    status: 'Completed',
    priority: 2,
    createdAt: '2025-03-21T08:30:00',
    completedAt: '2025-03-21T10:25:00',
    tournament: 'Australian Open 2025'
  },
  {
    id: 6,
    playerName: 'Rafael Nadal',
    racquet: { brand: 'Babolat', model: 'Pure Aero' },
    mainString: { brand: 'Babolat', model: 'RPM Blast' },
    crossString: { brand: 'Babolat', model: 'VS Touch' },
    mainTension: 25,
    crossTension: 23,
    isTensionInKg: true,
    stringer: null,
    status: 'Pending',
    priority: 1,
    createdAt: '2025-03-23T09:10:00',
    completedAt: null,
    tournament: 'Australian Open 2025'
  },
  {
    id: 7,
    playerName: 'Novak Djokovic',
    racquet: { brand: 'Head', model: 'Speed MP' },
    mainString: { brand: 'Luxilon', model: 'ALU Power Rough' },
    crossString: null,
    mainTension: 24,
    crossTension: null,
    isTensionInKg: true,
    stringer: 'Carlos Rodríguez',
    status: 'Cancelled',
    priority: 2,
    createdAt: '2025-03-19T14:20:00',
    completedAt: null,
    tournament: 'Australian Open 2025'
  }
])

// Estado del modal para el formulario de nuevo trabajo
const showJobModal = ref(false)
const jobModalMode = ref('create') // 'create' o 'edit'
const selectedJob = ref(null)

// Estado de carga
const isLoading = ref(true)

// Headers para la tabla
const headers = [
  { title: 'ID', key: 'id', sortable: true },
  { title: 'Player', key: 'playerName', sortable: true },
  { title: 'Racquet', key: 'racquet', sortable: false },
  { title: 'Main String', key: 'mainString', sortable: false },
  { title: 'Tension', key: 'tension', sortable: true },
  { title: 'Stringer', key: 'stringer', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Created', key: 'createdAt', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Opciones para el filtro de estado
const statusOptions = [
  { title: 'All', value: 'all' },
  { title: 'Pending', value: 'Pending' },
  { title: 'In Progress', value: 'InProgress' },
  { title: 'Completed', value: 'Completed' },
  { title: 'Cancelled', value: 'Cancelled' }
]

// Opciones para el filtro de prioridad
const priorityOptions = [
  { title: 'High', value: 1 },
  { title: 'Medium', value: 2 },
  { title: 'Low', value: 3 }
]

// Función para obtener el color de estado
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return 'warning'
    case 'InProgress': return 'info'
    case 'Completed': return 'success'
    case 'Cancelled': return 'error'
    default: return 'grey'
  }
}

// Función para obtener el color de prioridad
const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 1: return 'error'
    case 2: return 'warning'
    case 3: return 'info'
    default: return 'grey'
  }
}

// Función para obtener el texto de prioridad
const getPriorityText = (priority: number) => {
  switch (priority) {
    case 1: return 'High'
    case 2: return 'Medium'
    case 3: return 'Low'
    default: return 'Unknown'
  }
}

// Formatear la tensión con unidades
const formatTension = (job) => {
  const unit = job.isTensionInKg ? 'kg' : 'lbs'
  if (job.crossTension !== null && job.crossTension !== job.mainTension) {
    return `${job.mainTension}/${job.crossTension} ${unit}`
  }
  return `${job.mainTension} ${unit}`
}

// Formatear fecha
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Trabajos filtrados y ordenados
const filteredJobs = computed(() => {
  let result = [...stringJobs.value]
  
  // Aplicar filtro de búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(job => 
      job.playerName.toLowerCase().includes(query) ||
      `${job.racquet.brand} ${job.racquet.model}`.toLowerCase().includes(query) ||
      (job.mainString && `${job.mainString.brand} ${job.mainString.model}`.toLowerCase().includes(query)) ||
      (job.stringer && job.stringer.toLowerCase().includes(query))
    )
  }
  
  // Aplicar filtro de estado
  if (statusFilter.value !== 'all') {
    result = result.filter(job => job.status === statusFilter.value)
  }
  
  // Aplicar ordenamiento
  result.sort((a, b) => {
    let compareA, compareB
    
    if (sortBy.value === 'tension') {
      compareA = a.mainTension
      compareB = b.mainTension
    } else if (sortBy.value === 'racquet') {
      compareA = `${a.racquet.brand} ${a.racquet.model}`
      compareB = `${b.racquet.brand} ${b.racquet.model}`
    } else if (sortBy.value === 'mainString') {
      compareA = a.mainString ? `${a.mainString.brand} ${a.mainString.model}` : ''
      compareB = b.mainString ? `${b.mainString.brand} ${b.mainString.model}` : ''
    } else {
      compareA = a[sortBy.value]
      compareB = b[sortBy.value]
    }
    
    // Convertir fechas a objetos Date para comparación
    if (sortBy.value === 'createdAt' || sortBy.value === 'completedAt') {
      compareA = new Date(compareA || 0).getTime()
      compareB = new Date(compareB || 0).getTime()
    }
    
    // Ordenar ascendente o descendentemente
    if (sortDesc.value) {
      return compareB > compareA ? 1 : -1
    } else {
      return compareA > compareB ? 1 : -1
    }
  })
  
  return result
})

// Contadores de estado
const statusCounts = computed(() => {
  return {
    all: stringJobs.value.length,
    pending: stringJobs.value.filter(job => job.status === 'Pending').length,
    inProgress: stringJobs.value.filter(job => job.status === 'InProgress').length,
    completed: stringJobs.value.filter(job => job.status === 'Completed').length,
    cancelled: stringJobs.value.filter(job => job.status === 'Cancelled').length
  }
})

// Funciones para manejar eventos de ordenamiento
const handleSort = (column) => {
  if (sortBy.value === column) {
    // Si ya estamos ordenando por esta columna, invertimos el orden
    sortDesc.value = !sortDesc.value
  } else {
    // Si ordenamos por una nueva columna, establecemos el orden descendente
    sortBy.value = column
    sortDesc.value = true
  }
}

// Abrir el modal para crear un nuevo trabajo
const openCreateJobModal = () => {
  selectedJob.value = null
  jobModalMode.value = 'create'
  showJobModal.value = true
}

// Abrir el modal para editar un trabajo existente
const openEditJobModal = (job) => {
  selectedJob.value = { ...job }
  jobModalMode.value = 'edit'
  showJobModal.value = true
}

// Acciones de trabajo (estas funciones serían conectadas a la API)
const startJob = (job) => {
  // Sólo para demo, actualiza el estado localmente
  const index = stringJobs.value.findIndex(j => j.id === job.id)
  if (index !== -1) {
    stringJobs.value[index].status = 'InProgress'
    stringJobs.value[index].stringer = 'Juan Pérez' // Simula asignación
  }
}

const completeJob = (job) => {
  // Sólo para demo, actualiza el estado localmente
  const index = stringJobs.value.findIndex(j => j.id === job.id)
  if (index !== -1) {
    stringJobs.value[index].status = 'Completed'
    stringJobs.value[index].completedAt = new Date().toISOString()
  }
}

const cancelJob = (job) => {
  // Sólo para demo, actualiza el estado localmente
  const index = stringJobs.value.findIndex(j => j.id === job.id)
  if (index !== -1) {
    stringJobs.value[index].status = 'Cancelled'
  }
}

// Callback de envío del formulario (usado para crear o actualizar)
const handleFormSubmit = (formData) => {
  // Aquí conectarías con la API para crear o actualizar
  showJobModal.value = false
}

onMounted(() => {
  // Simular carga de datos
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
})
</script>

<template>
  <div class="string-jobs">
    <v-container class="string-jobs__container">
      <!-- Título y botón de creación -->
      <v-row>
        <v-col cols="12" sm="8">
          <h1 class="string-jobs__title">String Jobs</h1>
        </v-col>
        <v-col cols="12" sm="4" class="d-flex justify-end align-center">
          <v-btn 
            color="primary" 
            size="large"
            prepend-icon="mdi-plus"
            @click="openCreateJobModal"
          >
            New String Job
          </v-btn>
        </v-col>
      </v-row>

      <!-- Filtros y búsqueda -->
      <v-row class="string-jobs__filters">
        <v-col cols="12" sm="4">
          <v-text-field
            v-model="searchQuery"
            label="Search"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
            class="string-jobs__search"
          ></v-text-field>
        </v-col>
        <v-col cols="12" sm="8">
          <v-chip-group v-model="statusFilter" mandatory>
            <v-chip
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
              :class="statusFilter === option.value ? 'string-jobs__filter-chip--active' : ''"
              class="string-jobs__filter-chip"
              filter
            >
              {{ option.title }}
              <span class="ml-1 string-jobs__chip-count">
                {{ option.value === 'all' ? statusCounts.all : 
                   option.value === 'Pending' ? statusCounts.pending :
                   option.value === 'InProgress' ? statusCounts.inProgress :
                   option.value === 'Completed' ? statusCounts.completed :
                   statusCounts.cancelled }}
              </span>
            </v-chip>
          </v-chip-group>
        </v-col>
      </v-row>

      <!-- Tabla de trabajos de encordado -->
      <v-card class="string-jobs__card mt-4">
        <v-data-table-virtual
          :headers="headers"
          :items="filteredJobs"
          :loading="isLoading"
          class="string-jobs__table"
          density="compact"
        >
          <!-- Formateo personalizado para cada columna -->
          <template v-slot:item.racquet="{ item }">
            {{ item.racquet.brand }} {{ item.racquet.model }}
          </template>

          <template v-slot:item.mainString="{ item }">
            <span v-if="item.mainString">
              {{ item.mainString.brand }} {{ item.mainString.model }}
              <span v-if="item.crossString" class="string-jobs__hybrid">
                / {{ item.crossString.brand }} {{ item.crossString.model }}
              </span>
            </span>
            <span v-else>-</span>
          </template>

          <template v-slot:item.tension="{ item }">
            {{ formatTension(item) }}
          </template>

          <template v-slot:item.stringer="{ item }">
            <span v-if="item.stringer">{{ item.stringer }}</span>
            <span v-else class="string-jobs__not-assigned">Not assigned</span>
          </template>

          <template v-slot:item.status="{ item }">
            <v-chip
              size="small"
              :color="getStatusColor(item.status)"
              text-color="white"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <template v-slot:item.priority="{ item }">
            <v-chip
              size="small"
              :color="getPriorityColor(item.priority)"
              text-color="white"
              class="string-jobs__priority-chip"
            >
              {{ getPriorityText(item.priority) }}
            </v-chip>
          </template>

          <template v-slot:item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="string-jobs__actions">
              <!-- Botones de acción según el estado -->
              <v-tooltip text="Edit" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="primary"
                    variant="text"
                    @click="openEditJobModal(item)"
                  >
                    <v-icon size="small">mdi-pencil</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip v-if="item.status === 'Pending'" text="Start Job" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="info"
                    variant="text"
                    @click="startJob(item)"
                  >
                    <v-icon size="small">mdi-play</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip v-if="item.status === 'InProgress'" text="Complete Job" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="success"
                    variant="text"
                    @click="completeJob(item)"
                  >
                    <v-icon size="small">mdi-check</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip v-if="item.status === 'Pending' || item.status === 'InProgress'" text="Cancel Job" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="error"
                    variant="text"
                    @click="cancelJob(item)"
                  >
                    <v-icon size="small">mdi-close</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip text="View Details" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    color="secondary"
                    variant="text"
                  >
                    <v-icon size="small">mdi-eye</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </template>
        </v-data-table-virtual>
      </v-card>
    </v-container>

    <!-- Modal/Dialog para crear/editar trabajo -->
    <v-dialog v-model="showJobModal" max-width="800px">
      <v-card class="string-jobs__form-card">
        <v-card-title class="string-jobs__form-title">
          {{ jobModalMode === 'create' ? 'Create New String Job' : 'Edit String Job' }}
        </v-card-title>
        <v-card-text>
          <!-- Aquí iría un formulario para crear/editar trabajos -->
          <!-- Para simplificar, no incluimos todo el formulario aquí -->
          <v-alert type="info" class="mb-4">
            This is a placeholder for the form to {{ jobModalMode === 'create' ? 'create' : 'edit' }} a string job.
            In a real application, this would contain fields for player, racquet, strings, tensions, etc.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" variant="text" @click="showJobModal = false">Cancel</v-btn>
          <v-btn color="primary" @click="handleFormSubmit({})" class="ml-4">
            {{ jobModalMode === 'create' ? 'Create' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style lang="scss" scoped>
.string-jobs {
  &__container {
    padding: $spacing-lg;
    max-width: 100%;
  }

  &__title {
    @include heading-1;
    color: $primary;
    margin-bottom: $spacing-lg;
  }

  &__filters {
    margin-bottom: $spacing-lg;
  }

  &__search {
    max-width: 350px;
  }

  &__filter-chip {
    background-color: rgba($primary, 0.05);

    &--active {
      background-color: $primary !important;
      color: white !important;
    }
  }

  &__chip-count {
    font-size: $font-size-xs;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: $border-radius-pill;
    padding: 2px $spacing-xs;
    margin-left: $spacing-xs;
  }

  &__card {
    @include card-shadow;
    margin-bottom: $spacing-md;
    overflow: hidden;
  }

  &__table {
    width: 100%;
  }

  &__not-assigned {
    color: $text-muted;
    font-style: italic;
    font-size: $font-size-sm;
  }

  &__hybrid {
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__priority-chip {
    min-width: 70px;
  }

  &__actions {
    @include flex(row, flex-start, center);
    gap: $spacing-xs;
  }

  &__form {
    &-card {
      border-radius: $border-radius-md;
    }

    &-title {
      @include heading-3;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      padding-bottom: $spacing-md;
    }
  }

  @include respond-to(xs) {
    &__filters {
      flex-direction: column;
    }
  }
}

// Estilos para los chips de estado
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