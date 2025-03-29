<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStringJobStore, usePlayerStore, useStringerStore, useTournamentStore } from '../stores'

// Import stores and router
const stringJobStore = useStringJobStore()
const playerStore = usePlayerStore()
const stringerStore = useStringerStore()
const tournamentStore = useTournamentStore()
const router = useRouter()
const route = useRoute()

// Reactive state
const loading = ref(true)
const search = ref('')
const statusFilter = ref<string | null>(null)
const playerFilter = ref<number | null>(null)
const stringerFilter = ref<number | null>(null)
const tournamentFilter = ref<number | null>(null)
const priorityFilter = ref<number | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('createdAt')
const sortDesc = ref(true)
const showFilters = ref(false)

// Initialize based on query params
onMounted(async () => {
    loadFiltersFromQuery()

    // Load initial data
    await loadData()

    // Load reference data for filters
    await Promise.all([
        playerStore.fetchPlayers(),
        stringerStore.fetchAllStringers(),
        tournamentStore.fetchAllTournaments()
    ])

    // End loading state
    loading.value = false
})

// Load filters from URL query parameters
const loadFiltersFromQuery = () => {
    // Extract query parameters
    const queryStatus = route.query.status as string
    const queryPlayer = route.query.player ? parseInt(route.query.player as string) : null
    const queryStringer = route.query.stringer ? parseInt(route.query.stringer as string) : null
    const queryTournament = route.query.tournament ? parseInt(route.query.tournament as string) : null
    const queryPriority = route.query.priority as string

    // Set filters based on query parameters
    statusFilter.value = queryStatus || null
    playerFilter.value = queryPlayer
    stringerFilter.value = queryStringer
    tournamentFilter.value = queryTournament

    // Set priority filter
    if (queryPriority === 'high') {
        priorityFilter.value = 1
    } else if (queryPriority === 'medium') {
        priorityFilter.value = 2
    } else if (queryPriority === 'low') {
        priorityFilter.value = 3
    } else {
        priorityFilter.value = null
    }
}

// Watch for route query changes to reload data when URL changes externally
watch(() => route.query, (newQuery) => {
    loadFiltersFromQuery()
    loadData()
}, { deep: true })

// Watch for filter changes to update URL
watch([statusFilter, playerFilter, stringerFilter, tournamentFilter, priorityFilter], () => {
    updateQueryParams()
})

// Update URL query parameters based on current filters
const updateQueryParams = () => {
    const query: Record<string, string> = {}

    if (statusFilter.value) query.status = statusFilter.value
    if (playerFilter.value) query.player = playerFilter.value.toString()
    if (stringerFilter.value) query.stringer = stringerFilter.value.toString()
    if (tournamentFilter.value) query.tournament = tournamentFilter.value.toString()

    if (priorityFilter.value === 1) {
        query.priority = 'high'
    } else if (priorityFilter.value === 2) {
        query.priority = 'medium'
    } else if (priorityFilter.value === 3) {
        query.priority = 'low'
    }

    // Replace URL without reloading the page
    router.replace({ query })

    // Load data based on new filters
    loadData()
}

// Function to load data based on filters
const loadData = async () => {
    loading.value = true

    try {
        if (statusFilter.value) {
            await stringJobStore.fetchJobsByStatus(statusFilter.value)
        } else if (playerFilter.value) {
            await stringJobStore.fetchJobsByPlayer(playerFilter.value)
        } else if (stringerFilter.value) {
            await stringJobStore.fetchJobsByStringer(stringerFilter.value)
        } else if (tournamentFilter.value) {
            await stringJobStore.fetchJobsByTournament(tournamentFilter.value)
        } else {
            await stringJobStore.fetchAllJobs()
        }
    } catch (error) {
        console.error('Error loading string jobs:', error)
    } finally {
        loading.value = false
    }
}

// Function to clear all filters
const clearFilters = () => {
    statusFilter.value = null
    playerFilter.value = null
    stringerFilter.value = null
    tournamentFilter.value = null
    priorityFilter.value = null
    search.value = ''
    loadData()
}

// Reset filters and reload data
const resetAndReload = async () => {
    clearFilters()
    router.replace({ query: {} }) // Clear URL query params
}

// Filter jobs based on search text
const filteredJobs = computed(() => {
    let filtered = [...stringJobStore.stringJobs]

    // Apply search filter if search text exists
    if (search.value) {
        const searchLower = search.value.toLowerCase()
        filtered = filtered.filter(job => {
            // Search in player name
            const playerName = job.player ? `${job.player.name} ${job.player.lastName}`.toLowerCase() : ''
            // Search in racquet info
            const racquetInfo = job.racquet ? `${job.racquet.brand} ${job.racquet.model}`.toLowerCase() : ''
            // Search in strings
            const mainString = job.mainString ? `${job.mainString.brand} ${job.mainString.model}`.toLowerCase() : ''
            const crossString = job.crossString ? `${job.crossString.brand} ${job.crossString.model}`.toLowerCase() : ''
            // Search in notes
            const notes = job.notes ? job.notes.toLowerCase() : ''

            return playerName.includes(searchLower) ||
                racquetInfo.includes(searchLower) ||
                mainString.includes(searchLower) ||
                crossString.includes(searchLower) ||
                notes.includes(searchLower)
        })
    }

    // Apply priority filter if set
    if (priorityFilter.value !== null) {
        filtered = filtered.filter(job => job.priority === priorityFilter.value)
    }

    // Sort the filtered jobs
    filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        if (sortBy.value === 'createdAt' || sortBy.value === 'completedAt') {
            // Handle date fields safely
            aValue = a[sortBy.value as keyof typeof a] ? new Date(a[sortBy.value as keyof typeof a] as string).getTime() : 0;
            bValue = b[sortBy.value as keyof typeof b] ? new Date(b[sortBy.value as keyof typeof b] as string).getTime() : 0;
        } else if (sortBy.value === 'player') {
            aValue = a.player ? `${a.player.lastName} ${a.player.name}` : '';
            bValue = b.player ? `${b.player.lastName} ${b.player.name}` : '';
        } else if (sortBy.value === 'racquet') {
            aValue = a.racquet ? `${a.racquet.brand} ${a.racquet.model}` : '';
            bValue = b.racquet ? `${b.racquet.brand} ${b.racquet.model}` : '';
        } else if (sortBy.value === 'stringer') {
            aValue = a.stringer ? `${a.stringer.lastName} ${a.stringer.name}` : '';
            bValue = b.stringer ? `${b.stringer.lastName} ${b.stringer.name}` : '';
        } else {
            // For other properties, access them safely
            aValue = a[sortBy.value as keyof typeof a];
            bValue = b[sortBy.value as keyof typeof b];
        }

        if (aValue === null || aValue === undefined) return sortDesc.value ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortDesc.value ? -1 : 1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDesc.value ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }

        return sortDesc.value ? (bValue as number) - (aValue as number) : (aValue as number) - (bValue as number);
    })

    return filtered
})

// Pagination
const paginatedJobs = computed(() => {
    const start = (page.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredJobs.value.slice(start, end)
})

const totalPages = computed(() => {
    return Math.ceil(filteredJobs.value.length / itemsPerPage.value)
})

// Format date helper
const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
}

// Helper to get status color
const getStatusColor = (status: string) => {
    switch (status) {
        case 'Pending': return 'warning'
        case 'InProgress': return 'info'
        case 'Completed': return 'success'
        case 'Cancelled': return 'error'
        default: return 'grey'
    }
}

// Helper to get priority text and color
const getPriorityInfo = (priority: number | null | undefined) => {
    if (priority === 1) return { text: 'High', color: 'error' }
    if (priority === 2) return { text: 'Medium', color: 'warning' }
    if (priority === 3) return { text: 'Low', color: 'success' }
    return { text: 'None', color: 'grey' }
}

// Helper to format tension
const formatTension = (job: any) => {
    if (!job) return 'N/A'

    const mainTension = job.mainTension || 0
    const crossTension = job.crossTension
    const unit = job.isTensionInKg ? 'kg' : 'lb'

    if (crossTension && crossTension !== mainTension) {
        return `${mainTension}/${crossTension} ${unit}`
    }

    return `${mainTension} ${unit}`
}

// Navigation to create new job
const createNewJob = () => {
    router.push('/jobs/new')
}

// Navigation to view job details
const viewJob = (id: number) => {
    router.push(`/jobs/${id}`)
}

// Functions to handle job actions
const startJob = async (id: number) => {
    try {
        await stringJobStore.startJob(id)
    } catch (error) {
        console.error('Error starting job:', error)
    }
}

const confirmCancelJob = (id: number) => {
    // This would typically open a confirmation dialog
    // For now we'll just show a window.confirm
    if (window.confirm('Are you sure you want to cancel this job?')) {
        cancelJob(id)
    }
}

const cancelJob = async (id: number) => {
    try {
        await stringJobStore.cancelJob(id, 'Cancelled by user')
    } catch (error) {
        console.error('Error cancelling job:', error)
    }
}

const confirmCompleteJob = (id: number) => {
    // This would typically open a confirmation dialog
    // For now we'll just show a window.confirm
    if (window.confirm('Mark this job as completed?')) {
        completeJob(id)
    }
}

const completeJob = async (id: number) => {
    try {
        await stringJobStore.completeJob(id, {
            completedAt: new Date().toISOString(),
            notes: ''
        })
    } catch (error) {
        console.error('Error completing job:', error)
    }
}

// Table headers
const headers = [
    { title: 'ID', key: 'id', sortable: true },
    { title: 'Player', key: 'player', sortable: true },
    { title: 'Racquet', key: 'racquet', sortable: true },
    { title: 'Strings', key: 'mainString', sortable: true },
    { title: 'Tension', key: 'mainTension', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Stringer', key: 'stringer', sortable: true },
    { title: 'Priority', key: 'priority', sortable: true },
    { title: 'Created', key: 'createdAt', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false }
]

// Handle sort change
const handleSort = (column: string) => {
    if (sortBy.value === column) {
        sortDesc.value = !sortDesc.value
    } else {
        sortBy.value = column
        sortDesc.value = true
    }
}
</script>

<template>
    <div class="string-jobs">
        <v-container class="string-jobs__container">
            <!-- Page Header -->
            <v-row class="mb-3">
                <v-col cols="12" sm="8">
                    <h1 class="string-jobs__title">String Jobs</h1>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex justify-end align-center">
                    <v-btn class="mb-3" color="primary" prepend-icon="mdi-plus" @click="createNewJob">
                        New Job
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-row class="mb-3" v-if="stringJobStore.error">
                <v-col cols="12">
                    <v-alert type="error" variant="tonal" closable>
                        {{ stringJobStore.error }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Filters and Search -->
            <v-card class="mb-12">
                <v-card-text>
                    <v-row class="align-center">
                        <v-col cols="12" md="9">
                            <v-text-field v-model="search" label="Search" prepend-inner-icon="mdi-magnify"
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
                                <v-col cols="12" sm="6" md="3">
                                    <v-select v-model="statusFilter" label="Status" :items="[
                                        { title: 'All', value: null },
                                        { title: 'Pending', value: 'Pending' },
                                        { title: 'In Progress', value: 'InProgress' },
                                        { title: 'Completed', value: 'Completed' },
                                        { title: 'Cancelled', value: 'Cancelled' }
                                    ]" item-title="title" item-value="value" variant="outlined" density="comfortable"
                                        clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="3">
                                    <v-select v-model="playerFilter" label="Player" :items="playerStore.playerOptions"
                                        item-title="text" item-value="value" variant="outlined" density="comfortable"
                                        clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="3">
                                    <v-select v-model="stringerFilter" label="Stringer"
                                        :items="stringerStore.stringerOptions" item-title="text" item-value="value"
                                        variant="outlined" density="comfortable" clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="3">
                                    <v-select v-model="tournamentFilter" label="Tournament"
                                        :items="tournamentStore.tournamentOptions" item-title="text" item-value="value"
                                        variant="outlined" density="comfortable" clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="3">
                                    <v-select v-model="priorityFilter" label="Priority" :items="[
                                        { title: 'All', value: null },
                                        { title: 'High', value: 1 },
                                        { title: 'Medium', value: 2 },
                                        { title: 'Low', value: 3 }
                                    ]" item-title="title" item-value="value" variant="outlined" density="comfortable"
                                        clearable hide-details></v-select>
                                </v-col>
                            </v-row>
                        </div>
                    </v-expand-transition>
                </v-card-text>
            </v-card>

            <!-- No results placeholder -->
            <v-card v-if="!loading && filteredJobs.length === 0" class="mb-6 text-center py-8">
                <v-icon icon="mdi-tennis" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">No string jobs found</h3>
                <p class="text-body-1 mb-6 text-grey">Try adjusting your filters or create a new job.</p>
                <v-btn color="primary" prepend-icon="mdi-plus" @click="createNewJob">Create New Job</v-btn>
            </v-card>

            <!-- Job List Table -->
            <v-card v-else class="mb-6">
                <v-data-table-virtual :headers="headers" :items="paginatedJobs" :items-per-page="itemsPerPage"
                    :page="page" :loading="loading" class="string-jobs__table" hover
                    @update:options="(options: any) => page = options.page"
                    @click:row="(event: any, { item }: any) => viewJob(item.id)">

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
                    <template v-slot:item.player="{ item }">
                        <div v-if="item.player">
                            {{ item.player.name }} {{ item.player.lastName }}
                        </div>
                        <div v-else>-</div>
                    </template>

                    <template v-slot:item.racquet="{ item }">
                        <div v-if="item.racquet">
                            {{ item.racquet.brand }} {{ item.racquet.model }}
                        </div>
                        <div v-else>-</div>
                    </template>

                    <template v-slot:item.mainString="{ item }">
                        <div>
                            {{ item.mainString ? `${item.mainString.brand} ${item.mainString.model}` : '-' }}
                            <span v-if="item.crossString && item.crossString.id !== item.mainString?.id"
                                class="text-caption d-block">
                                Cross: {{ item.crossString.brand }} {{ item.crossString.model }}
                            </span>
                        </div>
                    </template>

                    <template v-slot:item.mainTension="{ item }">
                        {{ formatTension(item) }}
                    </template>

                    <template v-slot:item.stringer="{ item }">
                        <div v-if="item.stringer">
                            {{ item.stringer.name }} {{ item.stringer.lastName }}
                        </div>
                        <div v-else>-</div>
                    </template>

                    <template v-slot:item.status="{ item }">
                        <v-chip :color="getStatusColor(item.status)" size="small" text-color="white">
                            {{ item.status }}
                        </v-chip>
                    </template>

                    <template v-slot:item.priority="{ item }">
                        <v-chip v-if="item.priority" :color="getPriorityInfo(item.priority).color" size="small"
                            text-color="white">
                            {{ getPriorityInfo(item.priority).text }}
                        </v-chip>
                        <span v-else>-</span>
                    </template>

                    <template v-slot:item.createdAt="{ item }">
                        {{ formatDate(item.createdAt) }}
                    </template>

                    <template v-slot:item.actions="{ item }">
                        <div class="d-flex align-center justify-end" @click.stop>
                            <v-menu>
                                <template v-slot:activator="{ props }">
                                    <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small"></v-btn>
                                </template>
                                <v-list class="pa-0">
                                    <v-list-item @click="viewJob(item.id)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-eye</v-icon>
                                            View Details
                                        </v-list-item-title>
                                    </v-list-item>

                                    <v-divider></v-divider>

                                    <!-- Pending job actions -->
                                    <v-list-item v-if="item.status === 'Pending'" @click="startJob(item.id)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-play</v-icon>
                                            Start Job
                                        </v-list-item-title>
                                    </v-list-item>

                                    <!-- In Progress job actions -->
                                    <v-list-item v-if="item.status === 'InProgress'"
                                        @click="confirmCompleteJob(item.id)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-check</v-icon>
                                            Complete Job
                                        </v-list-item-title>
                                    </v-list-item>

                                    <!-- Can cancel pending or in progress jobs -->
                                    <v-list-item v-if="item.status === 'Pending' || item.status === 'InProgress'"
                                        @click="confirmCancelJob(item.id)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-cancel</v-icon>
                                            Cancel Job
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

    &__table {
        cursor: pointer;

        :deep(tr:hover) {
            background-color: rgba($primary, 0.05) !important;
        }
    }
}

// Status label styling (custom colors defined in variables.scss)
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