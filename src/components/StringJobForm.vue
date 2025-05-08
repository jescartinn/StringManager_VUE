<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
    useStringJobStore,
    usePlayerStore,
    useRacquetStore,
    useStringTypeStore,
    useStringerStore,
    useTournamentStore
} from '../stores'

const stringJobStore = useStringJobStore()
const playerStore = usePlayerStore()
const racquetStore = useRacquetStore()
const stringTypeStore = useStringTypeStore()
const stringerStore = useStringerStore()
const tournamentStore = useTournamentStore()

const router = useRouter()
const route = useRoute()

// Mode: 'create' or 'edit'
const mode = computed(() => {
    return route.params.id ? 'edit' : 'create'
})

// For edit mode, get the job ID
const jobId = computed(() => {
    return route.params.id ? parseInt(route.params.id as string) : null
})

// Form state
const formValid = ref(false)
const loading = ref(false)

// Form data with initial empty values
const formData = ref({
    playerId: null as number | null,
    racquetId: null as number | null,
    mainStringId: null as number | null,
    crossStringId: null as number | null,
    stringerId: null as number | null,
    tournamentId: null as number | null,
    mainTension: 24 as number,
    crossTension: null as number | null,
    isTensionInKg: true as boolean,
    logo: '' as string,
    status: 'Pending' as string,
    notes: '' as string,
    priority: 2 as number | null, // Default to medium priority
    price: 25 as number
})

// Validation errors
const errors = ref({
    playerId: '',
    racquetId: '',
    mainStringId: '',
    mainTension: '',
    crossTension: '',
    stringerId: ''
})

// Loading states for reference data
const loadingReferences = ref(true)
const playerRacquets = ref([] as any[])
const playerSelected = ref(false)

// Initialize component
onMounted(async () => {
    try {
        // Load reference data in parallel
        await Promise.all([
            playerStore.fetchPlayers(),
            stringTypeStore.fetchAllStringTypes(),
            stringerStore.fetchAllStringers(),
            tournamentStore.fetchCurrentTournament()
        ])

        if (mode.value === 'edit' && jobId.value) {
            // Fetch the job to edit
            await loadJobForEdit(jobId.value)
        } else if (tournamentStore.activeTournament) {
            // If there's a current tournament, pre-select it
            formData.value.tournamentId = tournamentStore.activeTournament.id
        }
    } catch (error) {
        console.error('Error initializing form:', error)
    } finally {
        loadingReferences.value = false
    }
})

// Load job data for editing
const loadJobForEdit = async (id: number) => {
    loading.value = true
    try {
        const job = await stringJobStore.fetchJobById(id)
        if (job) {
            // Update form data with job values
            formData.value.playerId = job.playerId
            formData.value.racquetId = job.racquetId
            formData.value.mainStringId = job.mainStringId || null
            formData.value.crossStringId = job.crossStringId || null
            formData.value.stringerId = job.stringerId || null
            formData.value.tournamentId = job.tournamentId || null
            formData.value.mainTension = job.mainTension
            formData.value.crossTension = job.crossTension || null
            formData.value.isTensionInKg = job.isTensionInKg
            formData.value.logo = job.logo || ''
            formData.value.status = job.status
            formData.value.notes = job.notes || ''
            formData.value.priority = job.priority || 2
            formData.value.price = job.price

            // If player is selected, load their racquets
            if (job.playerId) {
                playerSelected.value = true
                await loadPlayerRacquets(job.playerId)
            }
        }
    } catch (error) {
        console.error('Error loading job for edit:', error)
    } finally {
        loading.value = false
    }
}

// Watch for player selection to load their racquets
watch(() => formData.value.playerId, async (newPlayerId) => {
    if (newPlayerId) {
        playerSelected.value = true
        formData.value.racquetId = null // Reset racquet selection
        await loadPlayerRacquets(newPlayerId)
    } else {
        playerSelected.value = false
        playerRacquets.value = []
        formData.value.racquetId = null
    }
})

// Load racquets for a specific player
const loadPlayerRacquets = async (playerId: number) => {
    try {
        const racquets = await racquetStore.fetchRacquetsByPlayer(playerId)
        playerRacquets.value = racquets

        // If there's only one racquet, auto-select it
        if (racquets.length === 1 && !formData.value.racquetId) {
            formData.value.racquetId = racquets[0].id
        }

        // If player has no racquets, show warning
        if (racquets.length === 0) {
            errors.value.racquetId = 'This player has no racquets. Please add a racquet first.'
        } else {
            errors.value.racquetId = ''
        }
    } catch (error) {
        console.error('Error loading player racquets:', error)
    }
}

// Handle form submission
const handleSubmit = async () => {
    if (!validateForm()) return

    loading.value = true
    try {
        if (mode.value === 'create') {
            await createJob()
        } else {
            await updateJob()
        }
        router.push('/jobs')
    } catch (error) {
        console.error('Error submitting form:', error)
    } finally {
        loading.value = false
    }
}

// Create new job
const createJob = async () => {
    const jobData = {
        playerId: formData.value.playerId as number,
        racquetId: formData.value.racquetId as number,
        mainStringId: formData.value.mainStringId || undefined,
        crossStringId: formData.value.crossStringId || undefined,
        stringerId: formData.value.stringerId || undefined,
        tournamentId: formData.value.tournamentId || undefined,
        mainTension: formData.value.mainTension,
        crossTension: formData.value.crossTension || undefined,
        isTensionInKg: formData.value.isTensionInKg,
        logo: formData.value.logo || undefined,
        notes: formData.value.notes || undefined,
        priority: formData.value.priority || undefined,
        price: formData.value.price
    }

    await stringJobStore.createJob(jobData)
}

// Update existing job
const updateJob = async () => {
    if (!jobId.value) return

    const jobData = {
        mainStringId: formData.value.mainStringId || undefined,
        crossStringId: formData.value.crossStringId || undefined,
        stringerId: formData.value.stringerId || undefined,
        mainTension: formData.value.mainTension,
        crossTension: formData.value.crossTension || undefined,
        isTensionInKg: formData.value.isTensionInKg,
        logo: formData.value.logo || undefined,
        status: formData.value.status,
        notes: formData.value.notes || undefined,
        priority: formData.value.priority || undefined,
        price: formData.value.price
    }

    await stringJobStore.updateJob(jobId.value, jobData)
}

// Form validation
const validateForm = () => {
    // Reset errors
    Object.keys(errors.value).forEach(key => {
        errors.value[key as keyof typeof errors.value] = ''
    })

    let isValid = true

    // Player validation
    if (!formData.value.playerId) {
        errors.value.playerId = 'Player is required'
        isValid = false
    }

    // Racquet validation
    if (!formData.value.racquetId) {
        errors.value.racquetId = 'Racquet is required'
        isValid = false
    }

    // Main string validation
    if (!formData.value.mainStringId) {
        errors.value.mainStringId = 'Main string is recommended'
    }

    // Tension validation
    if (formData.value.mainTension <= 0) {
        errors.value.mainTension = 'Main tension must be greater than 0'
        isValid = false
    }

    // Cross tension validation (if provided)
    if (formData.value.crossTension !== null && formData.value.crossTension <= 0) {
        errors.value.crossTension = 'Cross tension must be greater than 0'
        isValid = false
    }

    // Stringer validation
    if (!formData.value.stringerId) {
        errors.value.stringerId = 'Stringer is required'
        isValid = false
    }

    return isValid
}

// Navigate back to job list
const cancelForm = () => {
    router.push('/jobs')
}

// Helper function to get player full name
const getPlayerFullName = (playerId: number) => {
    const player = playerStore.getPlayerById(playerId)
    return player ? `${player.name} ${player.lastName}` : ''
}

// Helper to check if cross tension is being used
const usesCrossTension = computed(() => {
    return formData.value.crossTension !== null
})

// Toggle cross tension usage
const toggleCrossTension = () => {
    if (formData.value.crossTension === null) {
        formData.value.crossTension = formData.value.mainTension
    } else {
        formData.value.crossTension = null
    }
}

// Custom filter function for player autocomplete
const customPlayerFilter = (item: any, queryText: string) => {
    if (queryText.trim() === '') return true

    const playerName = item.text.toLowerCase()
    const query = queryText.toLowerCase()

    // Search in player full name
    return playerName.includes(query)
}

// Go back function
const goBack = () => {
    router.back()
}
</script>

<template>
    <div class="string-job-form">
        <v-container class="string-job-form__container">

            <!-- Page Header with Navigation -->
            <v-row>
                <v-col cols="12" sm="8">
                    <div class="d-flex align-center">
                        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-2"></v-btn>
                        <h1 class="string-job-form__title">
                            {{ mode === 'create' ? 'Create New String Job' : 'Edit String Job #' + jobId }}
                        </h1>
                    </div>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex justify-end align-center">
                    <v-btn color="primary" prepend-icon="mdi-format-list-bulleted" @click="router.push('/jobs')">
                        All Jobs
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-row v-if="stringJobStore.error">
                <v-col cols="12">
                    <v-alert type="error" variant="tonal" closable>
                        {{ stringJobStore.error }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Loading Skeleton -->
            <div v-if="loadingReferences || (mode === 'edit' && loading)" class="d-flex justify-center align-center"
                style="min-height: 400px;">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </div>

            <!-- Form Content -->
            <div v-else class="string-job-form__content">
                <v-form @submit.prevent="handleSubmit" v-model="formValid" class="string-job-form__form">
                    <v-card class="mb-6">
                        <v-card-title class="string-job-form__section-title">
                            <v-icon start>mdi-account</v-icon>
                            Player & Racquet Information
                        </v-card-title>

                        <v-card-text class="pa-4">
                            <v-row>

                                <!-- Player Selection - disabled in edit mode -->
                                <v-col cols="12" md="6">
                                    <v-autocomplete v-model="formData.playerId" :items="playerStore.playerOptions"
                                        item-title="text" item-value="value" label="Player"
                                        :error-messages="errors.playerId" :disabled="mode === 'edit'" variant="outlined"
                                        :loading="playerStore.loading" required clearable :filter="customPlayerFilter"
                                        placeholder="Search player by name" :menu-props="{ maxHeight: 300 }">
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-account</v-icon>
                                        </template>
                                        <template v-slot:append-inner>
                                            <v-btn v-if="mode === 'create'" icon="mdi-plus" size="small" variant="text"
                                                color="primary" title="Add New Player"
                                                @click.stop="router.push('/players/new')"></v-btn>
                                        </template>
                                        <template v-slot:no-data>
                                            <div class="pa-4 text-center">
                                                <v-icon icon="mdi-account-search" size="36" color="grey-lighten-1"
                                                    class="mb-2"></v-icon>
                                                <p>No players found</p>
                                                <v-btn class="mt-2" v-if="mode === 'create'" color="primary"
                                                    size="small" variant="text" prepend-icon="mdi-plus"
                                                    @click="router.push('/players/new')">
                                                    Create New Player
                                                </v-btn>
                                            </div>
                                        </template>
                                    </v-autocomplete>
                                </v-col>

                                <!-- Racquet Selection - only shown if player selected, disabled in edit mode -->
                                <v-col cols="12" md="6">
                                    <v-select v-model="formData.racquetId" :items="playerRacquets.map(r => ({
                                        value: r.id,
                                        title: `${r.brand} ${r.model} ${r.serialNumber ? '(' + r.serialNumber + ')' : ''}`
                                    }))" item-title="title" item-value="value" label="Racquet"
                                        :error-messages="errors.racquetId"
                                        :disabled="!playerSelected || mode === 'edit'" :loading="racquetStore.loading"
                                        variant="outlined" required>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-tennis-ball</v-icon>
                                        </template>
                                        <template v-slot:append-inner>
                                            <v-btn v-if="playerSelected && mode === 'create'" icon="mdi-plus"
                                                size="small" variant="text" color="primary" title="Add New Racquet"
                                                @click.stop="router.push(`/racquets/new?playerId=${formData.playerId}`)"></v-btn>
                                        </template>
                                    </v-select>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <v-card class="mb-6">
                        <v-card-title class="string-job-form__section-title">
                            <v-icon start>mdi-tennis</v-icon>
                            Stringing Details
                        </v-card-title>

                        <v-card-text class="pa-4">
                            <v-row>

                                <!-- Main String Selection -->
                                <v-col cols="12" md="6">
                                    <v-select v-model="formData.mainStringId" :items="stringTypeStore.stringTypeOptions"
                                        item-title="text" item-value="value" label="Main String"
                                        :error-messages="errors.mainStringId" variant="outlined"
                                        :loading="stringTypeStore.loading" clearable>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-grid</v-icon>
                                        </template>
                                        <template v-slot:append-inner>
                                            <v-btn icon="mdi-plus" size="small" variant="text" color="primary"
                                                title="Add New String Type"
                                                @click.stop="router.push('/strings')"></v-btn>
                                        </template>
                                    </v-select>
                                </v-col>

                                <!-- Cross String Selection (if different from main) -->
                                <v-col cols="12" md="6">
                                    <v-select v-model="formData.crossStringId"
                                        :items="stringTypeStore.stringTypeOptions" item-title="text" item-value="value"
                                        label="Cross String (if different)" variant="outlined"
                                        :loading="stringTypeStore.loading" clearable :disabled="!formData.mainStringId">
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-grid</v-icon>
                                        </template>
                                    </v-select>
                                </v-col>

                                <!-- Main Tension -->
                                <v-col cols="12" sm="6" md="3">
                                    <v-text-field v-model.number="formData.mainTension" label="Main Tension"
                                        :error-messages="errors.mainTension" variant="outlined" type="number" step="0.1"
                                        min="10" max="70" required>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-gauge</v-icon>
                                        </template>
                                        <template v-slot:append>
                                            <v-btn-toggle v-model="formData.isTensionInKg" density="compact" mandatory
                                                :true-value="true" :false-value="false">
                                                <v-btn :value="true" size="small">kg</v-btn>
                                                <v-btn :value="false" size="small">lb</v-btn>
                                            </v-btn-toggle>
                                        </template>
                                    </v-text-field>
                                </v-col>

                                <!-- Cross Tension -->
                                <v-col cols="12" sm="6" md="3">
                                    <div class="d-flex">
                                        <v-text-field v-model.number="formData.crossTension" label="Cross Tension"
                                            :error-messages="errors.crossTension" variant="outlined" type="number"
                                            step="0.1" min="10" max="70" :disabled="!usesCrossTension" required>
                                            <template v-slot:prepend>
                                                <v-icon color="primary">mdi-gauge</v-icon>
                                            </template>
                                            <template v-slot:append>
                                                {{ formData.isTensionInKg ? 'kg' : 'lb' }}
                                            </template>
                                        </v-text-field>

                                        <v-btn icon variant="text" color="primary" class="ml-2 mt-2"
                                            @click="toggleCrossTension"
                                            :title="usesCrossTension ? 'Use same tension' : 'Use different cross tension'">
                                            <v-icon>{{ usesCrossTension ? 'mdi-link' : 'mdi-link-variant-off'
                                            }}</v-icon>
                                        </v-btn>
                                    </div>
                                </v-col>

                                <!-- Priority Selection -->
                                <v-col cols="12" sm="6" md="3">
                                    <v-select v-model="formData.priority" :items="[
                                        { title: 'High Priority', value: 1 },
                                        { title: 'Medium Priority', value: 2 },
                                        { title: 'Low Priority', value: 3 }
                                    ]" item-title="title" item-value="value" label="Priority" variant="outlined"
                                        required>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-flag</v-icon>
                                        </template>
                                    </v-select>
                                </v-col>

                                <!-- Logo Field (Nuevo) -->
                                <v-col cols="12" md="12">
                                    <v-text-field v-model="formData.logo" label="Logo (optional)" variant="outlined"
                                        clearable>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-image-outline</v-icon>
                                        </template>
                                    </v-text-field>
                                </v-col>

                                <!-- Status (edit mode only) -->
                                <v-col cols="12" sm="6" md="3" v-if="mode === 'edit'">
                                    <v-select v-model="formData.status" :items="[
                                        { title: 'Pending', value: 'Pending' },
                                        { title: 'In Progress', value: 'InProgress' },
                                        { title: 'Completed', value: 'Completed' },
                                        { title: 'Cancelled', value: 'Cancelled' }
                                    ]" item-title="title" item-value="value" label="Status" variant="outlined"
                                        required>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-clock-outline</v-icon>
                                        </template>
                                    </v-select>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <v-card class="mb-6">
                        <v-card-title class="string-job-form__section-title">
                            <v-icon start>mdi-information-outline</v-icon>
                            Additional Information
                        </v-card-title>

                        <v-card-text class="pa-4">
                            <v-row>

                                <!-- Stringer Selection -->
                                <v-col cols="12" md="6">
                                    <v-select v-model="formData.stringerId" :items="stringerStore.stringerOptions"
                                        item-title="text" item-value="value" label="Stringer" variant="outlined"
                                        :loading="stringerStore.loading" clearable>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-account-wrench</v-icon>
                                        </template>
                                    </v-select>
                                </v-col>

                                <!-- Tournament Selection -->
                                <v-col cols="12" md="6">
                                    <v-select v-model="formData.tournamentId" :items="tournamentStore.tournamentOptions"
                                        item-title="text" item-value="value" label="Tournament" variant="outlined"
                                        :loading="tournamentStore.loading" clearable>
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-trophy</v-icon>
                                        </template>
                                    </v-select>
                                </v-col>

                                <v-col cols="12" sm="6" md="3">
                                    <v-text-field v-model.number="formData.price" label="Price (€)" variant="outlined"
                                        type="number" step="0.01" min="0" :prefix="'€'" density="comfortable">
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-cash</v-icon>
                                        </template>
                                    </v-text-field>
                                </v-col>

                                <!-- Notes Text Area -->
                                <v-col cols="12">
                                    <v-textarea v-model="formData.notes" label="Notes" variant="outlined" rows="3"
                                        clearable placeholder="Additional instructions or comments..."
                                        class="string-job-form__notes">
                                        <template v-slot:prepend>
                                            <v-icon color="primary">mdi-note-text</v-icon>
                                        </template>
                                    </v-textarea>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <!-- Form Actions -->
                    <div class="d-flex justify-end mb-8">
                        <v-btn color="secondary" variant="outlined" @click="cancelForm" :disabled="loading"
                            class="mr-4">
                            Cancel
                        </v-btn>

                        <v-btn color="primary" type="submit" :loading="loading"
                            :disabled="!playerSelected || !formData.racquetId">
                            {{ mode === 'create' ? 'Create Job' : 'Update Job' }}
                        </v-btn>
                    </div>
                </v-form>
            </div>
        </v-container>
    </div>
</template>

<style lang="scss" scoped>
.string-job-form {
    &__container {
        padding: $spacing-lg;
        max-width: 100%;
    }

    &__title {
        @include heading-1;
        color: $primary;
        margin-bottom: 0;
    }

    &__content {
        margin-top: $spacing-lg;
    }

    &__section-title {
        @include heading-3;
        padding: $spacing-md $spacing-lg;
        background-color: rgba($primary, 0.05);
        border-bottom: 1px solid rgba($primary, 0.1);
    }

    &__form {
        .v-card {
            @include card-shadow;
            overflow: hidden;
        }
    }

    &__notes {
        background-color: rgba($primary, 0.02);
        border-radius: $border-radius-md;
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