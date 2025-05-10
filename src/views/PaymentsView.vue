<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore, useStringJobStore, useAuthStore } from '../stores'
import html2canvas from 'html2canvas'

const playerStore = usePlayerStore()
const stringJobStore = useStringJobStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const search = ref('')
const selectedPlayerId = ref<number | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref('completedAt')
const sortDesc = ref(true)
const showPaymentModal = ref(false)
const showPaymentSuccessAlert = ref(false)
const showInvoiceModal = ref(false)
const jobToMarkAsPaid = ref<number | null>(null)
const selectedJobs = ref<number[]>([])
const selectAll = ref(false)
const processingPayment = ref(false)
const invoiceNumber = ref('')
const paymentMethod = ref('cash')
const paymentNote = ref('')

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

        // Generate unique invoice number based on date and random number
        invoiceNumber.value = generateInvoiceNumber()
    } catch (error) {
        console.error('Error initializing payments view:', error)
    } finally {
        loading.value = false
    }
})

// Generate a unique invoice number
const generateInvoiceNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `INV-${year}${month}${day}-${random}`
}

// Load payments for a specific player
const loadPlayerPayments = async (playerId: number) => {
    if (!playerId) return

    try {
        loading.value = true
        await stringJobStore.fetchUnpaidJobsByPlayer(playerId)
        // Clear selected jobs when loading a new player
        selectedJobs.value = []
        selectAll.value = false
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
        selectedJobs.value = []
        selectAll.value = false
    }
})

// Format date helper
const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
}

// Format currency helper
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
}

// Computed properties
const unpaidJobs = computed(() => stringJobStore.stringJobs)

const filteredJobs = computed(() => {
    if (!search.value) return unpaidJobs.value

    const searchLower = search.value.toLowerCase()
    return unpaidJobs.value.filter(job => {
        const racquetInfo = job.racquet ? `${job.racquet.brand} ${job.racquet.model}`.toLowerCase() : ''
        const stringInfo = job.mainString ? `${job.mainString.brand} ${job.mainString.model}`.toLowerCase() : ''
        const jobId = job.id.toString()
        const completedDate = job.completedAt ? formatDate(job.completedAt).toLowerCase() : ''
        return racquetInfo.includes(searchLower) || 
               stringInfo.includes(searchLower) || 
               jobId.includes(searchLower) ||
               completedDate.includes(searchLower)
    })
})

const sortedJobs = computed(() => {
    return [...filteredJobs.value].sort((a, b) => {
        let valA, valB

        if (sortBy.value === 'completedAt') {
            valA = a.completedAt ? new Date(a.completedAt).getTime() : 0
            valB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        } else if (sortBy.value === 'id') {
            valA = a.id
            valB = b.id
        } else if (sortBy.value === 'price') {
            valA = a.price || 0
            valB = b.price || 0
        } else {
            valA = a[sortBy.value as keyof typeof a] || ''
            valB = b[sortBy.value as keyof typeof b] || ''
        }

        if (sortDesc.value) {
            return valB > valA ? 1 : -1
        } else {
            return valA > valB ? 1 : -1
        }
    })
})

const paginatedJobs = computed(() => {
    const start = (page.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return sortedJobs.value.slice(start, end)
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
})

const selectedAmount = computed(() => {
    return filteredJobs.value
        .filter(job => selectedJobs.value.includes(job.id))
        .reduce((total, job) => total + (job.price || 0), 0)
})

const selectedJobsCount = computed(() => selectedJobs.value.length)

// Check if all available jobs on the current page are selected
const allPageJobsSelected = computed(() => {
    if (paginatedJobs.value.length === 0) return false
    return paginatedJobs.value.every(job => selectedJobs.value.includes(job.id))
})

// Toggle selection of all jobs on the current page
const toggleSelectAllPageJobs = () => {
    if (allPageJobsSelected.value) {
        // Deselect all jobs on current page
        selectedJobs.value = selectedJobs.value.filter(id => 
            !paginatedJobs.value.some(job => job.id === id)
        )
    } else {
        // Select all jobs on current page that aren't already selected
        paginatedJobs.value.forEach(job => {
            if (!selectedJobs.value.includes(job.id)) {
                selectedJobs.value.push(job.id)
            }
        })
    }
}

// Toggle selection of a specific job
const toggleJobSelection = (jobId: number) => {
    if (selectedJobs.value.includes(jobId)) {
        selectedJobs.value = selectedJobs.value.filter(id => id !== jobId)
    } else {
        selectedJobs.value.push(jobId)
    }
}

// Handle payments
const openPaymentModal = (jobId?: number) => {
    if (jobId) {
        // Single job payment
        jobToMarkAsPaid.value = jobId
        selectedJobs.value = [jobId]
    } else if (selectedJobs.value.length === 0) {
        // No jobs selected, pay all
        selectedJobs.value = filteredJobs.value.map(job => job.id)
    }
    // Otherwise use the currently selected jobs
    
    paymentMethod.value = 'cash'
    paymentNote.value = ''
    showPaymentModal.value = true
}

const confirmPayment = async () => {
    if (selectedJobs.value.length === 0) return

    try {
        processingPayment.value = true
        
        // Process each selected job
        for (const jobId of selectedJobs.value) {
            await stringJobStore.markJobAsPaid(jobId)
        }
        
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

        // Show the invoice
        showInvoiceModal.value = true
    } catch (error) {
        console.error('Error marking jobs as paid:', error)
    } finally {
        processingPayment.value = false
    }
}

// Generate receipt/invoice

// Download invoice as image
const downloadInvoice = async () => {
    const invoiceElement = document.getElementById('payment-invoice')
    if (!invoiceElement) return

    try {
        const canvas = await html2canvas(invoiceElement, {
            scale: 2,
            backgroundColor: '#ffffff'
        })
        
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `${invoiceNumber.value}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error) {
        console.error('Error generating invoice:', error)
    }
}

// Handle sort change
const handleSort = (column: string) => {
    if (sortBy.value === column) {
        sortDesc.value = !sortDesc.value
    } else {
        sortBy.value = column
        sortDesc.value = true
    }
}

// View job details
const viewJob = (jobId: number) => {
    router.push(`/jobs/${jobId}`)
}

// Function to get today's date formatted as a string
const getTodayDate = () => {
    const today = new Date()
    return today.toLocaleDateString()
}

// Get the jobs to include in the invoice
const invoiceJobs = computed(() => {
    return filteredJobs.value.filter(job => selectedJobs.value.includes(job.id))
})
</script>

<template>
    <div class="payments-view">
        <v-container class="payments-view__container">
            <!-- Page Header -->
            <v-row class="mb-3">
                <v-col cols="12" sm="8">
                    <h1 class="payments-view__title">Player Payments</h1>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex justify-end align-center">
                    <v-btn 
                        v-if="selectedJobs.length > 0"
                        color="success" 
                        prepend-icon="mdi-cash-register" 
                        class="ml-2"
                        @click="openPaymentModal()"
                    >
                        Pay Selected ({{ selectedJobsCount }})
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Success Alert -->
            <v-alert v-model="showPaymentSuccessAlert" type="success" variant="tonal" closable class="mb-4">
                Payment successfully recorded! A receipt has been generated.
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
                    <v-autocomplete 
                        v-model="selectedPlayerId" 
                        :items="playerStore.playerOptions" 
                        item-title="text"
                        item-value="value" 
                        label="Select a player to view unpaid string jobs" 
                        variant="outlined"
                        density="comfortable" 
                        hide-details 
                        :loading="playerStore.loading" 
                        clearable
                    >
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
                        <v-row class="align-center justify-space-between">
                            <v-col cols="12" md="4">
                                <div class="d-flex flex-column">
                                    <div class="text-h6">{{ selectedPlayer?.name }} {{ selectedPlayer?.lastName }}</div>
                                    <div class="text-subtitle-1">
                                        <span class="font-weight-bold">{{ unpaidJobs.length }}</span> unpaid jobs
                                    </div>
                                    <div class="text-h4 text-primary mt-2">
                                        Total: {{ formatCurrency(totalAmount) }}
                                    </div>
                                </div>
                            </v-col>
                            
                            <v-col cols="12" md="4" v-if="selectedJobs.length > 0">
                                <v-card variant="outlined" class="pa-3 selected-amount-card">
                                    <div class="text-subtitle-1">Selected Jobs: {{ selectedJobs.length }}</div>
                                    <div class="text-h5 text-success">{{ formatCurrency(selectedAmount) }}</div>
                                </v-card>
                            </v-col>
                            
                            <v-col cols="12" md="4" class="text-center text-md-right">
                                <v-btn 
                                    color="success"
                                    size="large" 
                                    prepend-icon="mdi-cash-multiple" 
                                    @click="openPaymentModal()" 
                                    :loading="loading"
                                    :disabled="unpaidJobs.length === 0">
                                    Pay All ({{ formatCurrency(totalAmount) }})
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Search Bar -->
                <v-card class="mb-4">
                    <v-card-text>
                        <v-row>
                            <v-col cols="12" md="6">
                                <v-text-field 
                                    v-model="search" 
                                    label="Search unpaid jobs" 
                                    prepend-inner-icon="mdi-magnify"
                                    variant="outlined" 
                                    density="comfortable" 
                                    hide-details
                                    clearable
                                ></v-text-field>
                            </v-col>
                            <v-col cols="12" md="6" class="d-flex align-center">
                                <span class="text-body-2 text-grey mr-2">Sort by:</span>
                                <v-btn-toggle v-model="sortBy" mandatory density="comfortable">
                                    <v-btn value="id" @click="handleSort('id')">ID</v-btn>
                                    <v-btn value="completedAt" @click="handleSort('completedAt')">Date</v-btn>
                                    <v-btn value="price" @click="handleSort('price')">Price</v-btn>
                                </v-btn-toggle>
                                <v-btn 
                                    icon 
                                    @click="sortDesc = !sortDesc" 
                                    :title="sortDesc ? 'Sort ascending' : 'Sort descending'" 
                                    class="ml-2"
                                >
                                    <v-icon>{{ sortDesc ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon>
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Jobs Table -->
                <v-card v-if="paginatedJobs.length > 0" class="mb-6">
                    <v-data-table-virtual 
                        :headers="[
                            { title: '', key: 'select', sortable: false, width: '48px' },
                            { title: 'ID', key: 'id', sortable: true },
                            { title: 'Racquet', key: 'racquet', sortable: true },
                            { title: 'Strings', key: 'strings', sortable: true },
                            { title: 'Completed Date', key: 'completedAt', sortable: true },
                            { title: 'Price', key: 'price', sortable: true },
                            { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
                        ]" 
                        :items="paginatedJobs" 
                        :items-per-page="itemsPerPage" 
                        :page="page" 
                        :loading="loading"
                        class="payments-view__table" 
                        hover
                        @update:options="(options) => page = options.page"
                    >
                        <!-- Selection column -->
                        <template v-slot:header.select>
                            <v-checkbox 
                                v-model="allPageJobsSelected" 
                                @click="toggleSelectAllPageJobs"
                                hide-details
                                density="compact"
                            ></v-checkbox>
                        </template>
                        
                        <template v-slot:item.select="{ item }">
                            <v-checkbox 
                                :model-value="selectedJobs.includes(item.id)" 
                                @click.stop="toggleJobSelection(item.id)"
                                hide-details
                                density="compact"
                            ></v-checkbox>
                        </template>

                        <!-- Custom columns -->
                        <template v-slot:item.racquet="{ item }">
                            <div v-if="item.racquet">
                                {{ item.racquet.brand }} {{ item.racquet.model }}
                            </div>
                            <div v-else>-</div>
                        </template>

                        <template v-slot:item.strings="{ item }">
                            <div>
                                {{ item.mainString ? `${item.mainString.brand} ${item.mainString.model}` : '-' }}
                                <span v-if="item.crossString && item.crossString.id !== item.mainString?.id"
                                    class="text-caption d-block">
                                    Cross: {{ item.crossString.brand }} {{ item.crossString.model }}
                                </span>
                            </div>
                        </template>

                        <template v-slot:item.completedAt="{ item }">
                            {{ formatDate(item.completedAt) }}
                        </template>

                        <template v-slot:item.price="{ item }">
                            <span class="font-weight-bold">{{ formatCurrency(item.price || 0) }}</span>
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
                
                <!-- Empty state after filtering -->
                <v-card v-else class="text-center pa-8 mb-4">
                    <v-icon icon="mdi-file-search" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
                    <h3 class="text-h5 mb-2">No matching jobs found</h3>
                    <p class="text-body-1 mb-4 text-grey">Try adjusting your search criteria</p>
                    <v-btn color="primary" @click="search = ''">Clear Search</v-btn>
                </v-card>
            </template>
        </v-container>

        <!-- Payment Confirmation Dialog -->
        <v-dialog v-model="showPaymentModal" max-width="600px">
            <v-card>
                <v-card-title class="text-h5 bg-success text-white">Confirm Payment</v-card-title>
                <v-card-text class="pt-4">
                    <p class="text-h6 mb-4">
                        Payment for {{ selectedJobs.length }} string job{{ selectedJobs.length !== 1 ? 's' : '' }}
                    </p>
                    
                    <p class="text-h5 text-success font-weight-bold mb-4">
                        Total Amount: {{ formatCurrency(selectedAmount) }}
                    </p>
                    
                    <v-divider class="mb-4"></v-divider>
                    
                    <v-select
                        v-model="paymentMethod"
                        label="Payment Method"
                        :items="[
                            { title: 'Cash', value: 'cash' },
                            { title: 'Credit Card', value: 'card' },
                            { title: 'Bank Transfer', value: 'transfer' },
                            { title: 'Other', value: 'other' }
                        ]"
                        item-title="title"
                        item-value="value"
                        variant="outlined"
                        class="mb-4"
                    ></v-select>
                    
                    <v-textarea
                        v-model="paymentNote"
                        label="Payment Notes (optional)"
                        variant="outlined"
                        rows="3"
                        placeholder="Add any additional notes about this payment..."
                    ></v-textarea>
                    
                    <p class="text-caption text-grey mt-4">
                        This action will mark the job(s) as paid and remove them from the unpaid jobs list.
                        A payment receipt will be generated after confirmation.
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="grey" variant="text" @click="showPaymentModal = false">Cancel</v-btn>
                    <v-btn 
                        color="success" 
                        @click="confirmPayment" 
                        :loading="processingPayment"
                        :disabled="selectedJobs.length === 0"
                    >
                        Confirm Payment
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        
        <!-- Invoice/Receipt Modal -->
        <v-dialog v-model="showInvoiceModal" max-width="800px">
            <v-card>
                <v-card-title class="text-h5 bg-primary text-white">Payment Receipt</v-card-title>
                <v-card-text class="pt-4">
                    <div id="payment-invoice" class="payment-invoice">
                        <div class="invoice-header">
                            <div class="logo-section">
                                <v-icon size="36" color="primary">mdi-tennis</v-icon>
                                <h2 class="company-name">StringManager</h2>
                            </div>
                            <div class="invoice-details">
                                <h3 class="invoice-title">RECEIPT</h3>
                                <p class="invoice-number">{{ invoiceNumber }}</p>
                                <p class="invoice-date">Date: {{ getTodayDate() }}</p>
                            </div>
                        </div>
                        
                        <div class="customer-section">
                            <div class="customer-details">
                                <h4>Customer:</h4>
                                <p class="customer-name">{{ selectedPlayer?.name }} {{ selectedPlayer?.lastName }}</p>
                            </div>
                            <div class="payment-details">
                                <h4>Payment Method:</h4>
                                <p>{{ paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) }}</p>
                            </div>
                        </div>
                        
                        <table class="invoice-items">
                            <thead>
                                <tr>
                                    <th>Job ID</th>
                                    <th>Description</th>
                                    <th>Completion Date</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="job in invoiceJobs" :key="job.id">
                                    <td>#{{ job.id }}</td>
                                    <td>
                                        {{ job.racquet ? `${job.racquet.brand} ${job.racquet.model}` : 'Racquet' }} - 
                                        {{ job.mainString ? `${job.mainString.brand} ${job.mainString.model}` : 'String' }}
                                    </td>
                                    <td>{{ formatDate(job.completedAt) }}</td>
                                    <td>{{ formatCurrency(job.price || 0) }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="text-right font-weight-bold">Total</td>
                                    <td>{{ formatCurrency(selectedAmount) }}</td>
                                </tr>
                            </tfoot>
                        </table>
                        
                        <div class="invoice-notes" v-if="paymentNote">
                            <h4>Notes:</h4>
                            <p>{{ paymentNote }}</p>
                        </div>
                        
                        <div class="invoice-footer">
                            <p>Thank you for your business!</p>
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="grey" variant="text" @click="showInvoiceModal = false">Close</v-btn>
                    <v-btn 
                        color="primary" 
                        prepend-icon="mdi-download" 
                        @click="downloadInvoice"
                    >
                        Download Receipt
                    </v-btn>
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
    
    :deep(th) {
      font-weight: $font-weight-bold !important;
    }
  }
}

.selected-amount-card {
  background-color: rgba($success, 0.05);
  border: 1px solid rgba($success, 0.2);
  border-radius: $border-radius-md;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba($success, 0.1);
  }
}

// Payment receipt/invoice styles
.payment-invoice {
  background-color: white;
  padding: $spacing-lg;
  border: 1px solid #ddd;
  border-radius: $border-radius-md;
  font-family: Arial, sans-serif;
  color: #333;
  max-width: 100%;
  
  .invoice-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: $spacing-lg;
    padding-bottom: $spacing-md;
    border-bottom: 2px solid $primary;
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      
      .company-name {
        font-size: 24px;
        font-weight: bold;
        color: $primary;
        margin: 0;
      }
    }
    
    .invoice-details {
      text-align: right;
      
      .invoice-title {
        font-size: 24px;
        font-weight: bold;
        color: $primary;
        margin: 0 0 $spacing-sm 0;
      }
      
      .invoice-number, .invoice-date {
        margin: $spacing-xs 0;
        font-size: 14px;
      }
    }
  }
  
  .customer-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: $spacing-lg;
    
    h4 {
      color: $text-secondary;
      margin-bottom: $spacing-xs;
      font-size: 14px;
    }
    
    .customer-name {
      font-weight: bold;
      font-size: 16px;
    }
  }
  
  .invoice-items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: $spacing-lg;
    
    th, td {
      border: 1px solid #ddd;
      padding: $spacing-sm $spacing-md;
      text-align: left;
    }
    
    th {
      background-color: rgba($primary, 0.05);
      font-weight: bold;
    }
    
    tfoot {
      font-weight: bold;
      
      td {
        border-top: 2px solid $primary;
      }
      
      .text-right {
        text-align: right;
      }
    }
  }
  
  .invoice-notes {
    background-color: rgba($primary, 0.05);
    padding: $spacing-md;
    border-radius: $border-radius-sm;
    margin-bottom: $spacing-lg;
    
    h4 {
      color: $text-secondary;
      margin-bottom: $spacing-xs;
      font-size: 14px;
    }
    
    p {
      margin: 0;
    }
  }
  
  .invoice-footer {
    text-align: center;
    padding-top: $spacing-md;
    border-top: 1px solid #ddd;
    color: $text-secondary;
    font-style: italic;
  }
}
</style>