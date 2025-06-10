<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStringJobStore, usePlayerStore, useStringerStore, useTournamentStore } from '../stores'

const stringJobStore = useStringJobStore()
const playerStore = usePlayerStore()
const stringerStore = useStringerStore()
const tournamentStore = useTournamentStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const search = ref('')
const statusFilter = ref<string | null>(null)
const playerFilter = ref<number | null>(null)
const stringerFilter = ref<number | null>(null)
const tournamentFilter = ref<number | null>(null)
const priorityFilter = ref<number | null>(null)
const urgencyFilter = ref<string | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('createdAt')
const sortDesc = ref(true)
const showFilters = ref(false)
const showCancelConfirmation = ref(false)
const showCompleteConfirmation = ref(false)
const jobToAction = ref<number | null>(null)
const cancelReason = ref('')
const completeNotes = ref('')

const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return 'No deadline'

    const date = new Date(dueDate)
    const now = new Date()

    if (date < now) {
        return `Overdue: ${date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })}`
    }

    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) {
        return { status: 'none', color: 'grey', text: 'No deadline', icon: 'mdi-calendar-blank' }
    }

    const due = new Date(dueDate)
    const now = new Date()
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilDue < 0) {
        return { status: 'overdue', color: 'error', text: 'Overdue', icon: 'mdi-calendar-alert' }
    } else if (hoursUntilDue < 24) {
        return { status: 'urgent', color: 'warning', text: 'Due today', icon: 'mdi-calendar-today' }
    } else if (hoursUntilDue < 72) {
        return { status: 'soon', color: 'info', text: 'Due soon', icon: 'mdi-calendar-clock' }
    } else {
        return { status: 'normal', color: 'success', text: 'On schedule', icon: 'mdi-calendar-check' }
    }
}

const getUrgencyWeight = (dueDate?: string) => {
    if (!dueDate) return 999999

    const due = new Date(dueDate)
    const now = new Date()
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilDue < 0) return -1
    return hoursUntilDue
}

const urgentJobs = computed(() => {
    return stringJobStore.stringJobs.filter(job => {
        if (!job.dueDate) return false
        const status = getDueDateStatus(job.dueDate).status
        return status === 'overdue' || status === 'urgent'
    })
})

const showUrgentOnly = () => {
    urgencyFilter.value = 'overdue'
    showFilters.value = true
}

onMounted(async () => {
    loadFiltersFromQuery()

    await loadData()

    await Promise.all([
        playerStore.fetchPlayers(),
        stringerStore.fetchAllStringers(),
        tournamentStore.fetchAllTournaments()
    ])

    loading.value = false
})

const customPlayerFilter = (item: any, queryText: string) => {
    if (queryText.trim() === '') return true

    const playerName = item.text.toLowerCase()
    const query = queryText.toLowerCase()

    return playerName.includes(query)
}

const loadFiltersFromQuery = () => {
    const queryStatus = route.query.status as string
    const queryPlayer = route.query.player ? parseInt(route.query.player as string) : null
    const queryStringer = route.query.stringer ? parseInt(route.query.stringer as string) : null
    const queryTournament = route.query.tournament ? parseInt(route.query.tournament as string) : null
    const queryPriority = route.query.priority as string
    const queryUrgency = route.query.urgency as string

    statusFilter.value = queryStatus || null
    playerFilter.value = queryPlayer
    stringerFilter.value = queryStringer
    tournamentFilter.value = queryTournament
    urgencyFilter.value = queryUrgency || null

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

watch(() => route.query, (newQuery) => {
    loadFiltersFromQuery()
    loadData()
}, { deep: true })

watch([statusFilter, playerFilter, stringerFilter, tournamentFilter, priorityFilter, urgencyFilter], () => {
    updateQueryParams()
})

const updateQueryParams = () => {
    const query: Record<string, string> = {}

    if (statusFilter.value) query.status = statusFilter.value
    if (playerFilter.value) query.player = playerFilter.value.toString()
    if (stringerFilter.value) query.stringer = stringerFilter.value.toString()
    if (tournamentFilter.value) query.tournament = tournamentFilter.value.toString()
    if (urgencyFilter.value) query.urgency = urgencyFilter.value

    if (priorityFilter.value === 1) {
        query.priority = 'high'
    } else if (priorityFilter.value === 2) {
        query.priority = 'medium'
    } else if (priorityFilter.value === 3) {
        query.priority = 'low'
    }

    router.replace({ query })

    loadData()
}

const loadData = async () => {
    loading.value = true

    try {
        if (statusFilter.value) {
            await stringJobStore.fetchJobsByStatus(statusFilter.value)
        } else if (playerFilter.value) {
            const player = await playerStore.fetchPlayerById(playerFilter.value)
            if (!player) {
                stringJobStore.stringJobs = []
                stringJobStore.error = `El jugador con ID ${playerFilter.value} no existe.`
            } else {
                await stringJobStore.fetchJobsByPlayer(playerFilter.value)
            }
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

const clearFilters = () => {
    statusFilter.value = null
    playerFilter.value = null
    stringerFilter.value = null
    tournamentFilter.value = null
    priorityFilter.value = null
    urgencyFilter.value = null
    search.value = ''
    loadData()
}

const resetAndReload = async () => {
    clearFilters()
    router.replace({ query: {} })
}

const filteredJobs = computed(() => {
    let filtered = [...stringJobStore.stringJobs]

    if (search.value) {
        const searchLower = search.value.toLowerCase()
        filtered = filtered.filter(job => {
            const playerName = job.player ? `${job.player.name} ${job.player.lastName}`.toLowerCase() : ''
            const racquetInfo = job.racquet ? `${job.racquet.brand} ${job.racquet.model}`.toLowerCase() : ''
            const mainString = job.mainString ? `${job.mainString.brand} ${job.mainString.model}`.toLowerCase() : ''
            const crossString = job.crossString ? `${job.crossString.brand} ${job.crossString.model}`.toLowerCase() : ''
            const notes = job.notes ? job.notes.toLowerCase() : ''

            return playerName.includes(searchLower) ||
                racquetInfo.includes(searchLower) ||
                mainString.includes(searchLower) ||
                crossString.includes(searchLower) ||
                notes.includes(searchLower)
        })
    }

    if (priorityFilter.value !== null) {
        filtered = filtered.filter(job => job.priority === priorityFilter.value)
    }

    if (urgencyFilter.value) {
        filtered = filtered.filter(job => {
            const status = getDueDateStatus(job.dueDate).status
            if (urgencyFilter.value === 'overdue') {
                return status === 'overdue' || status === 'urgent'
            }
            return status === urgencyFilter.value
        })
    }

    filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        if (sortBy.value === 'createdAt' || sortBy.value === 'completedAt') {
            aValue = a[sortBy.value as keyof typeof a] ? new Date(a[sortBy.value as keyof typeof a] as string).getTime() : 0;
            bValue = b[sortBy.value as keyof typeof b] ? new Date(b[sortBy.value as keyof typeof b] as string).getTime() : 0;
        } else if (sortBy.value === 'dueDate') {
            aValue = getUrgencyWeight(a.dueDate);
            bValue = getUrgencyWeight(b.dueDate);
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

const paginatedJobs = computed(() => {
    const start = (page.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredJobs.value.slice(start, end)
})

const totalPages = computed(() => {
    return Math.ceil(filteredJobs.value.length / itemsPerPage.value)
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

const getPriorityInfo = (priority: number | null | undefined) => {
    if (priority === 1) return { text: 'High', color: 'error' }
    if (priority === 2) return { text: 'Medium', color: 'warning' }
    if (priority === 3) return { text: 'Low', color: 'success' }
    return { text: 'None', color: 'grey' }
}

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

const createNewJob = () => {
    router.push('/jobs/new')
}

const viewJob = (id: number) => {
    router.push(`/jobs/${id}`)
}

const startJob = async (id: number) => {
    try {
        await stringJobStore.startJob(id)
    } catch (error) {
        console.error('Error starting job:', error)
    }
}

const confirmCancelJob = (id: number) => {
    jobToAction.value = id
    cancelReason.value = ''
    showCancelConfirmation.value = true
}

const cancelJob = async () => {
    if (!jobToAction.value) return

    try {
        await stringJobStore.cancelJob(jobToAction.value, cancelReason.value || 'Cancelled by user')
        showCancelConfirmation.value = false
    } catch (error) {
        console.error('Error cancelling job:', error)
    }
}

const confirmCompleteJob = (id: number) => {
    jobToAction.value = id
    completeNotes.value = ''
    showCompleteConfirmation.value = true
}

const completeJob = async () => {
    if (!jobToAction.value) return

    try {
        await stringJobStore.completeJob(jobToAction.value, {
            completedAt: new Date().toISOString(),
            notes: completeNotes.value
        })
        showCompleteConfirmation.value = false
    } catch (error) {
        console.error('Error completing job:', error)
    }
}

const headers = [
    { title: 'ID', key: 'id', sortable: true },
    { title: 'Player', key: 'player', sortable: true },
    { title: 'Racquet', key: 'racquet', sortable: true },
    { title: 'Strings', key: 'mainString', sortable: true },
    { title: 'Tension', key: 'mainTension', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Due Date', key: 'dueDate', sortable: true },
    { title: 'Stringer', key: 'stringer', sortable: true },
    { title: 'Priority', key: 'priority', sortable: true },
    { title: 'Created', key: 'createdAt', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false }
]

const handleSort = (column: string) => {
    if (sortBy.value === column) {
        sortDesc.value = !sortDesc.value
    } else {
        sortBy.value = column
        sortDesc.value = true
    }
}

const showErrorAlert = ref(true)

watch(() => stringJobStore.error, (newError) => {
    if (newError) {
        showErrorAlert.value = true
    }
})
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
            <v-row class="mb-3" v-if="stringJobStore.error && showErrorAlert">
                <v-col cols="12">
                    <v-alert type="error" variant="tonal" closable v-model="showErrorAlert">
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
                                <v-col cols="12" sm="6" md="2">
                                    <v-select v-model="statusFilter" label="Status" :items="[
                                        { title: 'All', value: null },
                                        { title: 'Pending', value: 'Pending' },
                                        { title: 'In Progress', value: 'InProgress' },
                                        { title: 'Completed', value: 'Completed' },
                                        { title: 'Cancelled', value: 'Cancelled' }
                                    ]" item-title="title" item-value="value" variant="outlined" density="comfortable"
                                        clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="2">
                                    <v-autocomplete v-model="playerFilter" label="Player"
                                        :items="playerStore.playerOptions" item-title="text" item-value="value"
                                        variant="outlined" density="comfortable" clearable hide-details
                                        :filter="customPlayerFilter" placeholder="Search player by name"
                                        :menu-props="{ maxHeight: 300 }">
                                        <template v-slot:no-data>
                                            <div class="pa-4 text-center">
                                                <v-icon icon="mdi-account-search" size="36" color="grey-lighten-1"
                                                    class="mb-2"></v-icon>
                                                <p>No players found</p>
                                            </div>
                                        </template>
                                    </v-autocomplete>
                                </v-col>

                                <v-col cols="12" sm="6" md="2">
                                    <v-select v-model="stringerFilter" label="Stringer"
                                        :items="stringerStore.stringerOptions" item-title="text" item-value="value"
                                        variant="outlined" density="comfortable" clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="2">
                                    <v-select v-model="tournamentFilter" label="Tournament"
                                        :items="tournamentStore.tournamentOptions" item-title="text" item-value="value"
                                        variant="outlined" density="comfortable" clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="2">
                                    <v-select v-model="priorityFilter" label="Priority" :items="[
                                        { title: 'All', value: null },
                                        { title: 'High', value: 1 },
                                        { title: 'Medium', value: 2 },
                                        { title: 'Low', value: 3 }
                                    ]" item-title="title" item-value="value" variant="outlined" density="comfortable"
                                        clearable hide-details></v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="2">
                                    <v-select v-model="urgencyFilter" label="Due Date Status" :items="[
                                        { title: 'All', value: null },
                                        { title: 'Overdue/Urgent', value: 'overdue' },
                                        { title: 'Due Soon', value: 'soon' },
                                        { title: 'On Schedule', value: 'normal' },
                                        { title: 'No Deadline', value: 'none' }
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

                    <template v-slot:item.dueDate="{ item }">
                        <div class="d-flex align-center">
                            <v-chip v-if="item.dueDate" :color="getDueDateStatus(item.dueDate).color" size="small"
                                class="due-date-chip"
                                :class="{ 'overdue': getDueDateStatus(item.dueDate).status === 'overdue' }">
                                <v-icon start size="small" :icon="getDueDateStatus(item.dueDate).icon"></v-icon>
                                {{ getDueDateStatus(item.dueDate).text }}
                            </v-chip>
                            <div class="text-caption ml-2">
                                {{ formatDueDate(item.dueDate) }}
                            </div>
                        </div>
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

        <!-- Cancel Job Confirmation Dialog -->
        <v-dialog v-model="showCancelConfirmation" max-width="500px">
            <v-card>
                <v-card-title class="text-h5 bg-error text-white">Cancel Job</v-card-title>
                <v-card-text class="pt-4">
                    <p>Are you sure you want to cancel this job?</p>
                    <v-textarea v-model="cancelReason" label="Reason for Cancellation" variant="outlined" rows="3"
                        placeholder="Please provide a reason for cancellation..." class="mt-4"></v-textarea>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showCancelConfirmation = false">Go Back</v-btn>
                    <v-btn color="error" @click="cancelJob" :loading="stringJobStore.loading">Cancel Job</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Complete Job Confirmation Dialog -->
        <v-dialog v-model="showCompleteConfirmation" max-width="500px">
            <v-card>
                <v-card-title class="text-h5 bg-success text-white">Complete Job</v-card-title>
                <v-card-text class="pt-4">
                    <p>Are you sure you want to mark this job as completed?</p>
                    <v-textarea v-model="completeNotes" label="Completion Notes (optional)" variant="outlined" rows="3"
                        placeholder="Any additional notes about the completed job..." class="mt-4"></v-textarea>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showCompleteConfirmation = false">Cancel</v-btn>
                    <v-btn color="success" @click="completeJob" :loading="stringJobStore.loading">Complete Job</v-btn>
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

    &__table {
        cursor: pointer;

        :deep(tr:hover) {
            background-color: rgba($primary, 0.05) !important;
        }
    }
}

.due-date-chip {
    &.overdue {
        animation: pulse 2s infinite;
    }
}

@keyframes pulse {
    0% {
        opacity: 1;
    }

    50% {
        opacity: 0.7;
    }

    100% {
        opacity: 1;
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