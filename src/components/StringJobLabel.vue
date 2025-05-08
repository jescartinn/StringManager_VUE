<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStringJobStore } from '@/stores'
import QRCode from 'qrcode'

const props = defineProps<{
    jobId: number | null,
    width: number | string
    height: number | string
    showQRCode: boolean
    size: 'small' | 'medium' | 'large'
    includePlayerInfo: boolean
    includeRacquetInfo: boolean
    includeStringInfo: boolean
    includeTensionInfo: boolean
    includeDateInfo: boolean
    includeLogo: boolean
    printable: boolean
}>()

const emit = defineEmits(['download'])

const stringJobStore = useStringJobStore()
const qrCodeURL = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// Get the current job from the store
const job = computed(() => {
    return stringJobStore.currentJob
})

// Generate label sizes based on the size prop
const labelSizes = computed(() => {
    switch (props.size) {
        case 'small':
            return {
                padding: '12px',
                fontSize: {
                    title: '14px',
                    subtitle: '12px',
                    text: '11px'
                }
            }
        case 'large':
            return {
                padding: '24px',
                fontSize: {
                    title: '20px',
                    subtitle: '16px',
                    text: '14px'
                }
            }
        default: // medium
            return {
                padding: '16px',
                fontSize: {
                    title: '16px',
                    subtitle: '14px',
                    text: '12px'
                }
            }
    }
})

// Format date
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
}

// Format tension
const formatTension = (mainTension?: number, crossTension?: number | null, isTensionInKg = true) => {
    if (!mainTension) return 'N/A'

    const unit = isTensionInKg ? 'kg' : 'lb'

    if (crossTension && crossTension !== mainTension) {
        return `${mainTension}/${crossTension} ${unit}`
    }

    return `${mainTension} ${unit}`
}

// Download the label as an image
const downloadLabel = () => {
    const labelElement = document.getElementById('string-job-label')
    if (!labelElement) return

    // Emit download event so parent can handle it
    emit('download', labelElement)
}

// Generate QR code
const generateQRCode = async () => {
    if (!job.value) return

    try {
        // Create a URL or data for the QR code
        const jobData = {
            id: job.value.id,
            player: job.value.player ? `${job.value.player.name} ${job.value.player.lastName}` : 'Unknown',
            racquet: job.value.racquet ? `${job.value.racquet.brand} ${job.value.racquet.model}` : 'Unknown',
            mainString: job.value.mainString ? `${job.value.mainString.brand} ${job.value.mainString.model}` : 'Unknown',
            tension: formatTension(job.value.mainTension, job.value.crossTension, job.value.isTensionInKg),
            date: formatDate(job.value.completedAt || job.value.createdAt)
        }

        const dataString = JSON.stringify(jobData)

        // Generate QR code
        qrCodeURL.value = await QRCode.toDataURL(dataString, {
            width: 100,
            margin: 1,
            color: {
                dark: '#1867c0',
                light: '#FFFFFF'
            }
        })
    } catch (err) {
        console.error('Error generating QR code:', err)
        error.value = 'Failed to generate QR code'
    }
}

// Watch for job ID changes
watch(() => props.jobId, async () => {
    loading.value = true

    try {
        if (props.jobId) {
            await stringJobStore.fetchJobById(props.jobId)

            if (props.showQRCode) {
                await generateQRCode()
            }
        }
    } catch (err) {
        console.error('Error loading job data:', err)
        error.value = 'Failed to load job data'
    } finally {
        loading.value = false
    }
}, { immediate: true })

// Watch QR code setting
watch(() => props.showQRCode, async (showQR) => {
    if (showQR && job.value) {
        await generateQRCode()
    }
})
</script>

<template>
    <div class="string-job-label-component">
        <!-- Loading state -->
        <div v-if="loading" class="loading-container">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-container">
            <p class="error-text">{{ error }}</p>
        </div>

        <!-- Label content -->
        <div v-else-if="job" id="string-job-label" class="string-job-label" :class="{ 'printable': printable }" :style="{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            padding: labelSizes.padding
        }">

            <!-- Header with logo -->
            <div class="label-header" v-if="includeLogo">
                <div class="label-logo">
                    <v-icon size="large" color="primary">mdi-tennis</v-icon>
                    <span class="label-title" :style="{ fontSize: labelSizes.fontSize.title }">StringManager</span>
                </div>
                <div class="label-id" :style="{ fontSize: labelSizes.fontSize.subtitle }">
                    #{{ job.id }}
                </div>
            </div>

            <div class="label-content">
                <!-- Player info -->
                <div class="label-section" v-if="includePlayerInfo && job.player">
                    <div class="label-section-title" :style="{ fontSize: labelSizes.fontSize.subtitle }">
                        <v-icon small>mdi-account</v-icon> Player
                    </div>
                    <div class="label-section-content" :style="{ fontSize: labelSizes.fontSize.text }">
                        {{ job.player.name }} {{ job.player.lastName }}
                    </div>
                </div>

                <!-- Racquet info -->
                <div class="label-section" v-if="includeRacquetInfo && job.racquet">
                    <div class="label-section-title" :style="{ fontSize: labelSizes.fontSize.subtitle }">
                        <v-icon small>mdi-tennis-ball</v-icon> Racquet
                    </div>
                    <div class="label-section-content" :style="{ fontSize: labelSizes.fontSize.text }">
                        {{ job.racquet.brand }} {{ job.racquet.model }}
                    </div>
                </div>

                <!-- String info -->
                <div class="label-section" v-if="includeStringInfo && job.mainString">
                    <div class="label-section-title" :style="{ fontSize: labelSizes.fontSize.subtitle }">
                        <v-icon small>mdi-grid</v-icon> String
                    </div>
                    <div class="label-section-content" :style="{ fontSize: labelSizes.fontSize.text }">
                        <div>{{ job.mainString.brand }} {{ job.mainString.model }}</div>
                        <div v-if="job.crossString && job.crossString.id !== job.mainString.id">
                            Cross: {{ job.crossString.brand }} {{ job.crossString.model }}
                        </div>
                    </div>
                </div>

                <!-- Tension info -->
                <div class="label-section" v-if="includeTensionInfo">
                    <div class="label-section-title" :style="{ fontSize: labelSizes.fontSize.subtitle }">
                        <v-icon small>mdi-gauge</v-icon> Tension
                    </div>
                    <div class="label-section-content" :style="{ fontSize: labelSizes.fontSize.text }">
                        {{ formatTension(job.mainTension, job.crossTension, job.isTensionInKg) }}
                    </div>
                </div>

                <!-- Date info -->
                <div class="label-section" v-if="includeDateInfo">
                    <div class="label-section-title" :style="{ fontSize: labelSizes.fontSize.subtitle }">
                        <v-icon small>mdi-calendar</v-icon> Date
                    </div>
                    <div class="label-section-content" :style="{ fontSize: labelSizes.fontSize.text }">
                        {{ formatDate(job.completedAt || job.createdAt) }}
                    </div>
                </div>
            </div>

            <!-- QR code -->
            <div class="label-qr-code" v-if="showQRCode && qrCodeURL">
                <img :src="qrCodeURL" alt="Job QR Code" class="qr-code-image" />
            </div>
        </div>

        <!-- No job found -->
        <div v-else class="no-job-container">
            <p>No job data available</p>
        </div>

        <!-- Download button -->
        <div class="actions" v-if="!loading && job && !printable">
            <v-btn color="primary" @click="downloadLabel" prepend-icon="mdi-download">
                Download Label
            </v-btn>
        </div>
    </div>
</template>

<style scoped>
.string-job-label-component {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.string-job-label {
    border: 1px solid #ddd;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
}

.printable {
    box-shadow: none;
    border: none;
}

.label-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
}

.label-logo {
    display: flex;
    align-items: center;
    gap: 8px;
}

.label-title {
    font-weight: bold;
    color: #1867c0;
}

.label-id {
    font-weight: bold;
    color: #666;
}

.label-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.label-section {
    margin-bottom: 8px;
}

.label-section-title {
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;
    color: #666;
}

.label-section-content {
    margin-top: 2px;
    padding-left: 24px;
}

.label-qr-code {
    display: flex;
    justify-content: center;
    margin-top: 12px;
}

.qr-code-image {
    max-width: 100px;
    max-height: 100px;
}

.loading-container,
.error-container,
.no-job-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100px;
    width: 100%;
}

.error-text {
    color: red;
}

.actions {
    margin-top: 16px;
}

@media print {
    .actions {
        display: none;
    }

    .string-job-label {
        box-shadow: none;
        border: none;
    }
}
</style>