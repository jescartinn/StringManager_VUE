<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStringJobStore } from '@/stores'
import StringJobLabel from '@/components/StringJobLabel.vue'
import html2canvas from 'html2canvas'

const route = useRoute()
const router = useRouter()
const stringJobStore = useStringJobStore()

// Get job ID from route params
const jobId = computed(() => {
    return route.params.id ? parseInt(route.params.id as string) : null
})

// States for label generator
const loading = ref(false)
const error = ref<string | null>(null)
const job = computed(() => stringJobStore.currentJob)

const labelSettings = ref({
    size: 'medium' as 'small' | 'medium' | 'large',
    width: '340',
    height: 'auto',
    showQRCode: true,
    includePlayerInfo: true,
    includeRacquetInfo: true,
    includeStringInfo: true,
    includeTensionInfo: true,
    includeDateInfo: true,
    includeLogo: true,
    printable: false
})

// Load job data
onMounted(async () => {
    if (jobId.value) {
        try {
            loading.value = true
            await stringJobStore.fetchJobById(jobId.value)
        } catch (err) {
            console.error('Error loading job details:', err)
            error.value = 'Failed to load job details'
        } finally {
            loading.value = false
        }
    }
})

// Generate preview vs print mode
const isPrintMode = ref(false)

// Switch to print mode
const switchToPrintMode = () => {
    isPrintMode.value = true
    labelSettings.value.printable = true

    // Wait for the DOM to update
    setTimeout(() => {
        window.print()

        // Switch back after printing
        setTimeout(() => {
            isPrintMode.value = false
            labelSettings.value.printable = false
        }, 500)
    }, 300)
}

// Handle download label
const downloadLabel = async (labelElement: HTMLElement) => {
    try {
        loading.value = true

        // Use html2canvas to convert the label to an image
        const canvas = await html2canvas(labelElement, {
            backgroundColor: '#ffffff',
            scale: 2 // Higher resolution
        })

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Failed to create blob from canvas')
                return
            }

            // Create download link
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `string-job-label-${jobId.value}.png`

            // Trigger download
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

        }, 'image/png')
    } catch (err) {
        console.error('Error downloading label:', err)
        error.value = 'Failed to download label'
    } finally {
        loading.value = false
    }
}

// Go back to job details
const goBack = () => {
    router.push(`/jobs/${jobId.value}`)
}

// Update label settings
const updateLabelSize = (size: 'small' | 'medium' | 'large') => {
    labelSettings.value.size = size

    // Adjust width based on size
    switch (size) {
        case 'small':
            labelSettings.value.width = '280'
            break
        case 'large':
            labelSettings.value.width = '400'
            break
        default: // medium
            labelSettings.value.width = '340'
            break
    }
}
</script>

<template>
    <div class="label-generator" :class="{ 'print-mode': isPrintMode }">
        <v-container class="label-generator__container" v-if="!isPrintMode">
            <!-- Page Header with Navigation -->
            <v-row>
                <v-col cols="12" sm="8">
                    <div class="d-flex align-center">
                        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-2"></v-btn>
                        <h1 class="label-generator__title">
                            Generate Label for String Job #{{ jobId }}
                        </h1>
                    </div>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex justify-end align-center">
                    <v-btn color="primary" prepend-icon="mdi-eye" @click="goBack">
                        Back to Job
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-row v-if="error">
                <v-col cols="12">
                    <v-alert type="error" variant="tonal" closable>
                        {{ error }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Loading Indicator -->
            <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 200px;">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </div>

            <!-- Content when job is loaded -->
            <div v-else-if="job" class="label-generator__content">
                <v-row>
                    <!-- Label Settings Panel -->
                    <v-col cols="12" md="4">
                        <v-card class="mb-6">
                            <v-card-title class="label-generator__section-title">
                                <v-icon start>mdi-cog</v-icon>
                                Label Settings
                            </v-card-title>

                            <v-card-text class="pa-4">
                                <div class="label-settings">
                                    <!-- Label Size -->
                                    <div class="mb-4">
                                        <div class="text-subtitle-1 mb-2">Label Size</div>
                                        <v-btn-toggle v-model="labelSettings.size" mandatory color="primary"
                                            density="comfortable">
                                            <v-btn value="small" @click="updateLabelSize('small')">
                                                Small
                                            </v-btn>
                                            <v-btn value="medium" @click="updateLabelSize('medium')">
                                                Medium
                                            </v-btn>
                                            <v-btn value="large" @click="updateLabelSize('large')">
                                                Large
                                            </v-btn>
                                        </v-btn-toggle>
                                    </div>

                                    <!-- Content Options -->
                                    <div class="mb-4">
                                        <div class="text-subtitle-1 mb-2">Content Options</div>

                                        <v-switch v-model="labelSettings.includePlayerInfo" color="primary"
                                            label="Include Player Info"></v-switch>

                                        <v-switch v-model="labelSettings.includeRacquetInfo" color="primary"
                                            label="Include Racquet Info"></v-switch>

                                        <v-switch v-model="labelSettings.includeStringInfo" color="primary"
                                            label="Include String Info"></v-switch>

                                        <v-switch v-model="labelSettings.includeTensionInfo" color="primary"
                                            label="Include Tension Info"></v-switch>

                                        <v-switch v-model="labelSettings.includeDateInfo" color="primary"
                                            label="Include Date Info"></v-switch>

                                        <v-switch v-model="labelSettings.includeLogo" color="primary"
                                            label="Include Logo"></v-switch>

                                        <v-switch v-model="labelSettings.showQRCode" color="primary"
                                            label="Include QR Code"></v-switch>
                                    </div>

                                    <div class="d-flex flex-column gap-4">
                                        <v-btn class="mb-4" color="primary" block prepend-icon="mdi-printer"
                                            @click="switchToPrintMode" :loading="loading">
                                            Print Label
                                        </v-btn>
                                    </div>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>

                    <!-- Label Preview -->
                    <v-col cols="12" md="8">
                        <v-card class="mb-6">
                            <v-card-title class="label-generator__section-title">
                                <v-icon start>mdi-eye</v-icon>
                                Label Preview
                            </v-card-title>

                            <v-card-text class="pa-4 d-flex justify-center">
                                <div class="label-preview-container">
                                    <StringJobLabel :jobId="jobId" :width="labelSettings.width"
                                        :height="labelSettings.height" :showQRCode="labelSettings.showQRCode"
                                        :size="labelSettings.size" :includePlayerInfo="labelSettings.includePlayerInfo"
                                        :includeRacquetInfo="labelSettings.includeRacquetInfo"
                                        :includeStringInfo="labelSettings.includeStringInfo"
                                        :includeTensionInfo="labelSettings.includeTensionInfo"
                                        :includeDateInfo="labelSettings.includeDateInfo"
                                        :includeLogo="labelSettings.includeLogo" :printable="labelSettings.printable"
                                        @download="downloadLabel" />
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </div>

            <!-- No job found -->
            <div v-else class="text-center py-8">
                <v-icon icon="mdi-alert-circle" size="64" color="warning" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">Job Not Found</h3>
                <p class="mb-6">The job you're trying to create a label for could not be found.</p>
                <v-btn color="primary" @click="router.push('/jobs')">Return to Jobs List</v-btn>
            </div>
        </v-container>

        <!-- Print Mode View (minimal) -->
        <div v-if="isPrintMode" class="print-container">
            <StringJobLabel :jobId="jobId" :width="labelSettings.width" :height="labelSettings.height"
                :showQRCode="labelSettings.showQRCode" :size="labelSettings.size"
                :includePlayerInfo="labelSettings.includePlayerInfo"
                :includeRacquetInfo="labelSettings.includeRacquetInfo"
                :includeStringInfo="labelSettings.includeStringInfo"
                :includeTensionInfo="labelSettings.includeTensionInfo" :includeDateInfo="labelSettings.includeDateInfo"
                :includeLogo="labelSettings.includeLogo" :printable="true" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.label-generator {
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

    .label-preview-container {
        padding: $spacing-md;
        display: flex;
        justify-content: center;
        max-width: 100%;
    }
}

// Print mode styles
.print-mode {
    .label-generator__container {
        display: none;
    }
}

.print-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
}

@media print {
    body {
        margin: 0;
        padding: 0;
    }

    .print-container {
        padding: 0;
    }
}
</style>