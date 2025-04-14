<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStringJobStore, useAuthStore } from '../stores'

// Import stores 
const stringJobStore = useStringJobStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// UI State
const loading = ref(true)
const showConfirmCancel = ref(false)
const showConfirmComplete = ref(false)
const completeJobNotes = ref('')
const cancelJobReason = ref('')

// Get job ID from route params
const jobId = computed(() => {
    return route.params.id ? parseInt(route.params.id as string) : null
})

// Current job data
const job = computed(() => stringJobStore.currentJob)

// Check if user has permissions to perform actions
const canEditJob = computed(() => {
    if (!job.value) return false

    // No one can edit completed jobs
    if (job.value.status === 'Completed') return false

    // Admins can edit any job that's not completed
    if (authStore.isAdmin) return true

    // Stringers can edit jobs that are not completed or cancelled
    if (authStore.isStringer && job.value.status !== 'Cancelled') {
        return true
    }

    return false
})

// Format date helper
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
}

// Get status color
const getStatusColor = (status?: string) => {
    if (!status) return 'grey'

    switch (status) {
        case 'Pending': return 'warning'
        case 'InProgress': return 'info'
        case 'Completed': return 'success'
        case 'Cancelled': return 'error'
        default: return 'grey'
    }
}

// Get priority info
const getPriorityInfo = (priority?: number | null) => {
    if (priority === 1) return { text: 'High', color: 'error' }
    if (priority === 2) return { text: 'Medium', color: 'warning' }
    if (priority === 3) return { text: 'Low', color: 'success' }
    return { text: 'None', color: 'grey' }
}

// Format tension string
const formatTension = (mainTension?: number, crossTension?: number | null, isTensionInKg = true) => {
    if (!mainTension) return 'N/A'

    const unit = isTensionInKg ? 'kg' : 'lb'

    if (crossTension && crossTension !== mainTension) {
        return `${mainTension}/${crossTension} ${unit}`
    }

    return `${mainTension} ${unit}`
}

// Load job data
onMounted(async () => {
    if (jobId.value) {
        try {
            await stringJobStore.fetchJobById(jobId.value)
        } catch (error) {
            console.error('Error loading job details:', error)
        } finally {
            loading.value = false
        }
    } else {
        // No job ID provided, redirect to jobs list
        router.replace('/jobs')
    }
})

// Navigation functions
const editJob = () => {
    if (jobId.value) {
        router.push(`/jobs/edit/${jobId.value}`)
    }
}

const returnToList = () => {
    router.push('/jobs')
}

// Action functions
const startJob = async () => {
    if (jobId.value) {
        try {
            await stringJobStore.startJob(jobId.value)
            // Refresh job data
            await stringJobStore.fetchJobById(jobId.value)
        } catch (error) {
            console.error('Error starting job:', error)
        }
    }
}

const openCompleteDialog = () => {
    completeJobNotes.value = ''
    showConfirmComplete.value = true
}

const completeJob = async () => {
    if (jobId.value) {
        try {
            await stringJobStore.completeJob(jobId.value, {
                completedAt: new Date().toISOString(),
                notes: completeJobNotes.value
            })
            // Refresh job data
            await stringJobStore.fetchJobById(jobId.value)
            showConfirmComplete.value = false
        } catch (error) {
            console.error('Error completing job:', error)
        }
    }
}

const openCancelDialog = () => {
    cancelJobReason.value = ''
    showConfirmCancel.value = true
}

const cancelJob = async () => {
    if (jobId.value) {
        try {
            await stringJobStore.cancelJob(jobId.value, cancelJobReason.value)
            // Refresh job data
            await stringJobStore.fetchJobById(jobId.value)
            showConfirmCancel.value = false
        } catch (error) {
            console.error('Error cancelling job:', error)
        }
    }
}
</script>

<template>
    <div class="string-job-details">
        <v-container class="string-job-details__container">
            <!-- Page Header with Navigation -->
            <v-row>
                <v-col cols="12" sm="8">
                    <div class="d-flex align-center">
                        <v-btn icon="mdi-arrow-left" variant="text" @click="returnToList" class="mr-2"></v-btn>
                        <h1 class="string-job-details__title">
                            String Job #{{ jobId }}
                        </h1>
                    </div>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex justify-end align-center">
                    <!-- Action buttons based on job status and user permissions -->
                    <v-menu v-if="job && canEditJob">
                        <template v-slot:activator="{ props }">
                            <v-btn color="primary" v-bind="props" class="mr-2">
                                Actions
                                <v-icon end>mdi-chevron-down</v-icon>
                            </v-btn>
                        </template>

                        <v-list class="pa-0">
                            <v-list-item v-if="job.status === 'Pending'" @click="startJob" prepend-icon="mdi-play"
                                title="Start Job" color="info"></v-list-item>

                            <v-list-item v-if="job.status === 'InProgress'" @click="openCompleteDialog"
                                prepend-icon="mdi-check" title="Complete Job" color="success"></v-list-item>

                            <v-list-item v-if="job.status === 'Pending' || job.status === 'InProgress'"
                                @click="openCancelDialog" prepend-icon="mdi-cancel" title="Cancel Job"
                                color="error"></v-list-item>

                            <v-divider></v-divider>

                            <v-list-item @click="editJob" prepend-icon="mdi-pencil" title="Edit Job"></v-list-item>
                        </v-list>
                    </v-menu>

                    <v-btn color="primary" prepend-icon="mdi-format-list-bulleted" @click="returnToList">
                        All Jobs
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

            <!-- Loading State -->
            <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </div>

            <!-- Job Not Found -->
            <v-card v-else-if="!job" class="text-center pa-8 mb-6">
                <v-icon icon="mdi-alert-circle" size="64" color="warning" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">Job Not Found</h3>
                <p class="mb-6">The requested string job could not be found or you don't have permission to view it.</p>
                <v-btn color="primary" @click="returnToList">Return to Job List</v-btn>
            </v-card>

            <!-- Job Details Content -->
            <div v-else class="string-job-details__content">
                <!-- Status Banner -->
                <v-card class="mb-6">
                    <v-card-title class="string-job-details__section-title">
                        <v-icon start>mdi-information-outline</v-icon>
                        Job Status Information
                    </v-card-title>

                    <v-card-text class="pt-4 pb-4">
                        <v-row>
                            <v-col cols="12" sm="6" md="3">
                                <div
                                    class="d-flex flex-column align-center text-center pa-2 rounded bg-grey-lighten-5 h-100">
                                    <v-chip :color="getStatusColor(job.status)" size="large" class="mb-2"
                                        text-color="white">
                                        {{ job.status }}
                                    </v-chip>
                                    <span class="text-caption">Current Status</span>
                                </div>
                            </v-col>

                            <v-col cols="12" sm="6" md="3">
                                <div
                                    class="d-flex flex-column align-center text-center pa-2 rounded bg-grey-lighten-5 h-100">
                                    <v-chip v-if="job.priority" :color="getPriorityInfo(job.priority).color"
                                        size="large" class="mb-2" text-color="white">
                                        {{ getPriorityInfo(job.priority).text }}
                                    </v-chip>
                                    <v-chip v-else color="grey" size="large" class="mb-2">
                                        None
                                    </v-chip>
                                    <span class="text-caption">Priority Level</span>
                                </div>
                            </v-col>

                            <v-col cols="12" sm="6" md="3">
                                <div
                                    class="d-flex flex-column align-center text-center pa-2 rounded bg-grey-lighten-5 h-100">
                                    <div class="text-h6 font-weight-bold mb-2">{{
                                        formatDate(job.createdAt) }}</div>
                                    <span class="text-caption">Created Date</span>
                                </div>
                            </v-col>

                            <v-col cols="12" sm="6" md="3">
                                <div
                                    class="d-flex flex-column align-center text-center pa-2 rounded bg-grey-lighten-5 h-100">
                                    <div class="text-h6 font-weight-bold mb-2">
                                        {{ job.completedAt ? formatDate(job.completedAt) : 'Pending' }}
                                    </div>
                                    <span class="text-caption">Completed Date</span>
                                </div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <v-row>
                    <!-- Left Column -->
                    <v-col cols="12" md="6">
                        <!-- Player and Racquet Information -->
                        <v-card class="mb-6">
                            <v-card-title class="string-job-details__section-title">
                                <v-icon start>mdi-account</v-icon>
                                Player & Racquet
                            </v-card-title>

                            <v-card-text class="pa-4">
                                <v-list>
                                    <v-list-item v-if="job.player">
                                        <template v-slot:prepend>
                                            <v-avatar color="primary" size="36">
                                                {{ job.player.name.charAt(0) }}{{ job.player.lastName.charAt(0) }}
                                            </v-avatar>
                                        </template>
                                        <v-list-item-title class="text-h6">
                                            {{ job.player.name }} {{ job.player.lastName }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle v-if="job.player.countryCode">
                                            Country: {{ job.player.countryCode }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-divider class="my-2"></v-divider>

                                    <v-list-item v-if="job.racquet">
                                        <template v-slot:prepend>
                                            <v-icon color="primary" size="32">mdi-tennis-ball</v-icon>
                                        </template>
                                        <v-list-item-title>{{ job.racquet.brand }} {{ job.racquet.model
                                            }}</v-list-item-title>
                                        <v-list-item-subtitle v-if="job.racquet.serialNumber">
                                            Serial: {{ job.racquet.serialNumber }}
                                        </v-list-item-subtitle>
                                        <v-list-item-subtitle v-if="job.racquet.headSize">
                                            Head Size: {{ job.racquet.headSize }} sq in
                                        </v-list-item-subtitle>
                                    </v-list-item>
                                </v-list>
                            </v-card-text>
                        </v-card>

                        <!-- Tournament and Stringer Information -->
                        <v-card class="mb-6">
                            <v-card-title class="string-job-details__section-title">
                                <v-icon start>mdi-account-group</v-icon>
                                Tournament & Stringer
                            </v-card-title>

                            <v-card-text class="pa-4">
                                <v-list>
                                    <v-list-item v-if="job.tournament">
                                        <template v-slot:prepend>
                                            <v-icon color="primary" size="32">mdi-trophy</v-icon>
                                        </template>
                                        <v-list-item-title>{{ job.tournament.name }}</v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ new Date(job.tournament.startDate).toLocaleDateString() }} -
                                            {{ new Date(job.tournament.endDate).toLocaleDateString() }}
                                        </v-list-item-subtitle>
                                        <v-list-item-subtitle v-if="job.tournament.location">
                                            {{ job.tournament.location }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item v-else>
                                        <template v-slot:prepend>
                                            <v-icon color="grey" size="32">mdi-trophy-outline</v-icon>
                                        </template>
                                        <v-list-item-title class="text-grey">No Tournament Assigned</v-list-item-title>
                                    </v-list-item>

                                    <v-divider class="my-2"></v-divider>

                                    <v-list-item v-if="job.stringer">
                                        <template v-slot:prepend>
                                            <v-icon color="primary" size="32">mdi-account-wrench</v-icon>
                                        </template>
                                        <v-list-item-title>{{ job.stringer.name }} {{ job.stringer.lastName
                                            }}</v-list-item-title>
                                        <v-list-item-subtitle v-if="job.stringer.email">
                                            Email: {{ job.stringer.email }}
                                        </v-list-item-subtitle>
                                        <v-list-item-subtitle v-if="job.stringer.phoneNumber">
                                            Phone: {{ job.stringer.phoneNumber }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item v-else>
                                        <template v-slot:prepend>
                                            <v-icon color="grey" size="32">mdi-account-question</v-icon>
                                        </template>
                                        <v-list-item-title class="text-grey">No Stringer Assigned</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-card-text>
                        </v-card>
                    </v-col>

                    <!-- Right Column -->
                    <v-col cols="12" md="6">
                        <!-- Stringing Details -->
                        <v-card class="mb-6">
                            <v-card-title class="string-job-details__section-title">
                                <v-icon start>mdi-tennis</v-icon>
                                Stringing Details
                            </v-card-title>

                            <v-card-text class="pa-4">
                                <v-list>
                                    <!-- Main String -->
                                    <v-list-item v-if="job.mainString">
                                        <template v-slot:prepend>
                                            <v-icon color="primary" size="32">mdi-grid</v-icon>
                                        </template>
                                        <v-list-item-title>
                                            Main String: {{ job.mainString.brand }} {{ job.mainString.model }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle v-if="job.mainString.gauge">
                                            Gauge: {{ job.mainString.gauge }}
                                        </v-list-item-subtitle>
                                        <v-list-item-subtitle>
                                            {{ job.mainString.material || 'Unknown material' }}
                                            <span v-if="job.mainString.color" class="ml-2">
                                                ({{ job.mainString.color }})
                                            </span>
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-list-item v-else>
                                        <template v-slot:prepend>
                                            <v-icon color="grey" size="32">mdi-grid</v-icon>
                                        </template>
                                        <v-list-item-title class="text-grey">No Main String
                                            Specified</v-list-item-title>
                                    </v-list-item>

                                    <!-- Cross String (if different) -->
                                    <v-list-item v-if="job.crossString && job.crossString.id !== job.mainString?.id">
                                        <template v-slot:prepend>
                                            <v-icon color="primary" size="32">mdi-grid</v-icon>
                                        </template>
                                        <v-list-item-title>
                                            Cross String: {{ job.crossString.brand }} {{ job.crossString.model }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle v-if="job.crossString.gauge">
                                            Gauge: {{ job.crossString.gauge }}
                                        </v-list-item-subtitle>
                                        <v-list-item-subtitle>
                                            {{ job.crossString.material || 'Unknown material' }}
                                            <span v-if="job.crossString.color" class="ml-2">
                                                ({{ job.crossString.color }})
                                            </span>
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-divider class="my-2"></v-divider>

                                    <!-- Tension -->
                                    <v-list-item>
                                        <template v-slot:prepend>
                                            <v-icon color="primary" size="32">mdi-gauge</v-icon>
                                        </template>
                                        <v-list-item-title class="text-h6">
                                            Tension: {{ formatTension(job.mainTension, job.crossTension,
                                                job.isTensionInKg) }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ job.crossTension && job.crossTension !== job.mainTension
                                                ? 'Different main/cross tension'
                                                : 'Same tension for mains and crosses' }}
                                        </v-list-item-subtitle>
                                    </v-list-item>

                                    <v-divider class="my-2"></v-divider>

                                    <!-- Logo -->
                                    <v-list-item v-if="job && job.logo">
                                        <template v-slot:prepend>
                                            <v-icon color="primary" size="32">mdi-image-outline</v-icon>
                                        </template>
                                        <v-list-item-title>
                                            Logo: {{ job.logo }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            Stencil logo to paint on the strings
                                        </v-list-item-subtitle>
                                    </v-list-item>
                                </v-list>
                            </v-card-text>
                        </v-card>

                        <!-- Notes -->
                        <v-card>
                            <v-card-title class="string-job-details__section-title">
                                <v-icon start>mdi-note-text</v-icon>
                                Notes
                            </v-card-title>

                            <v-card-text class="pa-4">
                                <div v-if="job.notes" class="string-job-details__notes">
                                    <p>{{ job.notes }}</p>
                                </div>
                                <div v-else class="text-grey pa-4 text-center">
                                    No notes for this job.
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </div>
        </v-container>

        <!-- Complete Job Dialog -->
        <v-dialog v-model="showConfirmComplete" max-width="500px">
            <v-card>
                <v-card-title class="text-h5">Complete Job</v-card-title>
                <v-card-text>
                    <p>Are you sure you want to mark this job as completed?</p>
                    <v-textarea v-model="completeJobNotes" label="Completion Notes (optional)" variant="outlined"
                        rows="3" placeholder="Any additional notes about the completed job..."
                        class="mt-4"></v-textarea>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showConfirmComplete = false">Cancel</v-btn>
                    <v-btn color="success" @click="completeJob" :loading="stringJobStore.loading">Complete Job</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Cancel Job Dialog -->
        <v-dialog v-model="showConfirmCancel" max-width="500px">
            <v-card>
                <v-card-title class="text-h5">Cancel Job</v-card-title>
                <v-card-text>
                    <p>Are you sure you want to cancel this job?</p>
                    <v-textarea v-model="cancelJobReason" label="Reason for Cancellation" variant="outlined" rows="3"
                        placeholder="Please provide a reason for cancellation..." class="mt-4"></v-textarea>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showConfirmCancel = false">Go Back</v-btn>
                    <v-btn color="error" @click="cancelJob" :loading="stringJobStore.loading">Cancel Job</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style lang="scss" scoped>
.string-job-details {
    &__container {
        padding: $spacing-lg;
        max-width: 100%;
    }

    &__title {
        @include heading-1;
        color: $primary;
        margin-bottom: 0;
    }

    &__section-title {
        @include heading-3;
        padding: $spacing-md $spacing-lg;
        background-color: rgba($primary, 0.05);
        border-bottom: 1px solid rgba($primary, 0.1);
    }

    &__content {
        margin-top: $spacing-lg;

        .v-card {
            @include card-shadow;
            overflow: hidden;
        }
    }

    &__notes {
        white-space: pre-line;
        padding: $spacing-md;
        background-color: rgba($primary, 0.05);
        border-radius: $border-radius-md;
        min-height: 100px;
    }
}

// Status colors
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