<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore, useStringJobStore, useAuthStore } from '../stores'

const playerStore = usePlayerStore()
const stringJobStore = useStringJobStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const search = ref('')
const selectedPlayerId = ref<number | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const showPaymentModal = ref(false)
const jobToMarkAsPaid = ref<number | null>(null)
const showPaymentSuccessAlert = ref(false)

// Initialize component
onMounted(async () => {
    try {
        // Load players data
        await playerStore.fetchPlayers()

        // Load query parameters
        const queryPlayerId = route.query.playerId ? parseInt(route.query.playerId as string) : null
        if (queryPlayerId) {
            selectedPlayerId.value = queryPlayerId
            await loadPlayerPayments(queryPlayerId)
        }
    } catch (error) {
        console.error('Error initializing payments view:', error)
    } finally {
        loading.value = false
    }
})

// Load payments for a specific player
const loadPlayerPayments = async (playerId: number) => {
    if (!playerId) return

    try {
        loading.value = true
        await stringJobStore.fetchUnpaidJobsByPlayer(playerId)
    } catch (error) {
        console.error(`Error loading payments for player ${playerId}:`, error)
    } finally {
        loading.value = false
    }
}

// Watch for changes in selected player
watch(() => selectedPlayerId.value, async (newPlayerId) => {
    if (newPlayerId) {
        // Update URL query parameter
        router.replace({ query: { ...route.query, playerId: newPlayerId.toString() } })

        // Load player's payments
        await loadPlayerPayments(newPlayerId)
    } else {
        // Clear URL query parameter
        router.replace({ query: { ...route.query, playerId: undefined } })

        // Clear jobs
        stringJobStore.clearJobs()
    }
})

// Format date helper
const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
}

// Computed properties
const unpaidJobs = computed(() => stringJobStore.stringJobs)

const filteredJobs = computed(() => {
    if (!search.value) return unpaidJobs.value

    const searchLower = search.value.toLowerCase()
    return unpaidJobs.value.filter(job => {
        const racquetInfo = job.racquet ? `${job.racquet.brand} ${job.racquet.model}`.toLowerCase() : ''
        const stringInfo = job.mainString ? `${job.mainString.brand} ${job.mainString.model}`.toLowerCase() : ''
        return racquetInfo.includes(searchLower) || stringInfo.includes(searchLower)
    })
})

const paginatedJobs = computed(() => {
    const start = (page.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredJobs.value.slice(start, end)
})

const totalPages = computed(() => {
    return Math.ceil(filteredJobs.value.length / itemsPerPage.value)
})

const selectedPlayer = computed(() => {
    if (!selectedPlayerId.value) return null
    return playerStore.getPlayerById(selectedPlayerId.value)
})

const totalAmount = computed(() => {
    return filteredJobs.value.reduce((total, job) => total + (job.price || 0), 0)
});

// Handle payments
const openPaymentModal = (jobId: number) => {
    jobToMarkAsPaid.value = jobId
    showPaymentModal.value = true
}

const confirmPayment = async () => {
    if (!jobToMarkAsPaid.value) return

    try {
        const success = await stringJobStore.markJobAsPaid(jobToMarkAsPaid.value)
        if (success) {
            showPaymentModal.value = false

            // Refresh the list of unpaid jobs
            if (selectedPlayerId.value) {
                await loadPlayerPayments(selectedPlayerId.value)
            }

            // Show success alert
            showPaymentSuccessAlert.value = true
            setTimeout(() => {
                showPaymentSuccessAlert.value = false
            }, 3000)
        }
    } catch (error) {
        console.error('Error marking job as paid:', error)
    }
}

// Handle bulk payment
const payAllJobs = async () => {
    if (!selectedPlayerId.value || filteredJobs.value.length === 0) return

    try {
        loading.value = true

        // Mark each job as paid sequentially
        for (const job of filteredJobs.value) {
            await stringJobStore.markJobAsPaid(job.id)
        }

        // Refresh the list
        await loadPlayerPayments(selectedPlayerId.value)

        // Show success alert
        showPaymentSuccessAlert.value = true
        setTimeout(() => {
            showPaymentSuccessAlert.value = false
        }, 3000)
    } catch (error) {
        console.error('Error processing bulk payment:', error)
    } finally {
        loading.value = false
    }
}

// View job details
const viewJob = (jobId: number) => {
    router.push(`/jobs/${jobId}`)
}
</script>

<template>
    <div class="payments-view">
        <v-container class="payments-view__container">
            <!-- Page Header -->
            <v-row class="mb-3">
                <v-col cols="12" sm="8">
                    <h1 class="payments-view__title">Player Payments</h1>
                </v-col>
            </v-row>

            <!-- Success Alert -->
            <v-alert v-model="showPaymentSuccessAlert" type="success" variant="tonal" closable class="mb-4">
                Payment successfully recorded!
            </v-alert>

            <!-- Error Alert -->
            <v-row class="mb-3" v-if="stringJobStore.error">
                <v-col cols="12">
                    <v-alert type="error" variant="tonal" closable>
                        {{ stringJobStore.error }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Player Selection -->
            <v-card class="mb-6">
                <v-card-title class="payments-view__section-title">
                    <v-icon start>mdi-account</v-icon>
                    Select Player
                </v-card-title>
                <v-card-text class="pt-4">
                    <v-autocomplete v-model="selectedPlayerId" :items="playerStore.playerOptions" item-title="text"
                        item-value="value" label="Select a player to view unpaid string jobs" variant="outlined"
                        density="comfortable" hide-details :loading="playerStore.loading" clearable>
                        <template v-slot:no-data>
                            <div class="pa-4 text-center">
                                <v-icon icon="mdi-account-search" size="36" color="grey-lighten-1"
                                    class="mb-2"></v-icon>
                                <p>No players found</p>
                            </div>
                        </template>
                    </v-autocomplete>
                </v-card-text>
            </v-card>

            <!-- Player selected but loading jobs -->
            <div v-if="selectedPlayerId && loading" class="d-flex justify-center align-center"
                style="min-height: 200px;">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </div>

            <!-- No player selected -->
            <v-card v-else-if="!selectedPlayerId" class="mb-6 text-center pa-8">
                <v-icon icon="mdi-account-question" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">No Player Selected</h3>
                <p class="text-body-1 mb-4 text-grey">Please select a player to view their unpaid string jobs.</p>
            </v-card>

            <!-- Player has no unpaid jobs -->
            <v-card v-else-if="unpaidJobs.length === 0" class="mb-6 text-center pa-8">
                <v-icon icon="mdi-cash-check" size="64" color="success" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">No Unpaid Jobs</h3>
                <p class="text-body-1 mb-4 text-grey">
                    {{ selectedPlayer?.name }} {{ selectedPlayer?.lastName }} has no unpaid string jobs.
                </p>
            </v-card>

            <!-- Unpaid Jobs List -->
            <template v-else>
                <!-- Payment Summary Card -->
                <v-card class="mb-6">
                    <v-card-title class="payments-view__section-title">
                        <v-icon start>mdi-cash</v-icon>
                        Payment Summary
                    </v-card-title>
                    <v-card-text class="pt-4">
                        <v-row class="align-center">
                            <v-col cols="12" md="6">
                                <div class="d-flex flex-column">
                                    <div class="text-h6">{{ selectedPlayer?.name }} {{ selectedPlayer?.lastName }}</div>
                                    <div class="text-subtitle-1">
                                        <span class="font-weight-bold">{{ unpaidJobs.length }}</span> unpaid jobs
                                    </div>
                                    <div class="text-h4 text-primary mt-2">
                                        Total: €{{ totalAmount.toFixed(2) }}
                                    </div>
                                </div>
                            </v-col>
                            <v-col cols="12" md="6" class="text-center text-md-right">
                                <v-btn color="success" size="large" prepend-icon="mdi-cash-multiple" @click="payAllJobs"
                                    :loading="loading" :disabled="unpaidJobs.length === 0">
                                    Pay All (€{{ totalAmount.toFixed(2) }})
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Search Bar -->
                <v-card class="mb-4">
                    <v-card-text>
                        <v-text-field v-model="search" label="Search unpaid jobs" prepend-inner-icon="mdi-magnify"
                            variant="outlined" density="comfortable" hide-details></v-text-field>
                    </v-card-text>
                </v-card>

                <!-- Jobs Table -->
                <v-card>
                    <v-data-table-virtual :headers="[
                        { title: 'ID', key: 'id', sortable: true },
                        { title: 'Racquet', key: 'racquet', sortable: true },
                        { title: 'Strings', key: 'strings', sortable: true },
                        { title: 'Completed Date', key: 'completedAt', sortable: true },
                        { title: 'Price', key: 'price', sortable: true },
                        { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
                    ]" :items="paginatedJobs" :items-per-page="itemsPerPage" :page="page" :loading="loading"
                        class="payments-view__table" hover @update:options="(options) => page = options.page">
                        <!-- Custom columns -->
                        <template v-slot:item.racquet="{ item }">
                            {{ item.racquet ? `${item.racquet.brand} ${item.racquet.model}` : 'N/A' }}
                        </template>

                        <template v-slot:item.strings="{ item }">
                            {{ item.mainString ? `${item.mainString.brand} ${item.mainString.model}` : 'N/A' }}
                            <div v-if="item.crossString && item.crossString.id !== item.mainString?.id"
                                class="text-caption">
                                Cross: {{ item.crossString.brand }} {{ item.crossString.model }}
                            </div>
                        </template>

                        <template v-slot:item.completedAt="{ item }">
                            {{ formatDate(item.completedAt) }}
                        </template>

                        <template v-slot:item.price="{ item }">
                            <span class="font-weight-bold">€{{ (item.price ?? 0).toFixed(2) }}</span>
                        </template>

                        <template v-slot:item.actions="{ item }">
                            <div class="d-flex justify-end align-center">
                                <v-btn color="success" size="small" variant="text" prepend-icon="mdi-cash"
                                    @click.stop="openPaymentModal(item.id)" class="mr-2">
                                    Pay
                                </v-btn>
                                <v-btn color="primary" size="small" variant="text" icon="mdi-eye"
                                    @click.stop="viewJob(item.id)"></v-btn>
                            </div>
                        </template>
                    </v-data-table-virtual>

                    <!-- Pagination controls -->
                    <div class="d-flex justify-center align-center pa-4">
                        <v-pagination v-model="page" :length="totalPages" :total-visible="7"
                            density="comfortable"></v-pagination>

                        <v-select v-model="itemsPerPage" :items="[10, 25, 50, 100]" label="Per page" density="compact"
                            class="ms-4" style="max-width: 120px;" hide-details></v-select>
                    </div>
                </v-card>
            </template>
        </v-container>

        <!-- Payment Confirmation Dialog -->
        <v-dialog v-model="showPaymentModal" max-width="500px">
            <v-card>
                <v-card-title class="text-h5 bg-success text-white">Confirm Payment</v-card-title>
                <v-card-text class="pt-4">
                    <p>Are you sure you want to mark this string job as paid?</p>
                    <p class="font-weight-bold" v-if="jobToMarkAsPaid">
                        String Job #{{ jobToMarkAsPaid }}
                    </p>
                    <p class="text-caption text-grey mt-4">
                        This action will mark the job as paid and remove it from the unpaid jobs list.
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showPaymentModal = false">Cancel</v-btn>
                    <v-btn color="success" @click="confirmPayment" :loading="stringJobStore.loading">Confirm
                        Payment</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style lang="scss" scoped>
.payments-view {
    &__container {
        padding: $spacing-lg;
        max-width: 100%;
    }

    &__title {
        @include heading-1;
        color: $primary;
        margin-bottom: $spacing-lg;
    }

    &__section-title {
        @include heading-3;
        padding: $spacing-md $spacing-lg;
        background-color: rgba($primary, 0.05);
        border-bottom: 1px solid rgba($primary, 0.1);
    }

    &__table {
        :deep(tr:hover) {
            background-color: rgba($primary, 0.05) !important;
        }
    }
}
</style>