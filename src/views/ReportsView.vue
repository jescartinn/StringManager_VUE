<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useDashboardStore, useStringJobStore, useStringTypeStore, usePlayerStore, useTournamentStore } from '../stores'
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const statusChartRef = ref<HTMLCanvasElement | null>(null);
const stringBrandChartRef = ref<HTMLCanvasElement | null>(null);
const tensionChartRef = ref<HTMLCanvasElement | null>(null);
const stringUsageChartRef = ref<HTMLCanvasElement | null>(null);
const tensionDistChartRef = ref<HTMLCanvasElement | null>(null);

let statusChart: Chart | null = null;
let stringBrandChart: Chart | null = null;
let tensionChart: Chart | null = null;
let stringUsageChart: Chart | null = null;
let tensionDistChart: Chart | null = null;

const dashboardStore = useDashboardStore()
const stringJobStore = useStringJobStore()
const stringTypeStore = useStringTypeStore()
const playerStore = usePlayerStore()
const tournamentStore = useTournamentStore()

const loading = ref(true)
const selectedReport = ref('overview')
const selectedTimeframe = ref('all')
const selectedTournament = ref<number | null>(null)
const showFilters = ref(false)

const dateRange = ref({
  start: '',
  end: ''
})

const reportOptions = [
  { title: 'Overview', value: 'overview', icon: 'mdi-chart-box' },
  { title: 'String Usage', value: 'strings', icon: 'mdi-grid' },
  { title: 'Tension Distribution', value: 'tension', icon: 'mdi-gauge' },
  { title: 'Stringer Performance', value: 'stringers', icon: 'mdi-account-wrench' },
  { title: 'Player Activity', value: 'players', icon: 'mdi-account-group' }
]

const timeframeOptions = [
  { title: 'All Time', value: 'all' },
  { title: 'This Year', value: 'year' },
  { title: 'This Month', value: 'month' },
  { title: 'This Week', value: 'week' },
  { title: 'Custom Range', value: 'custom' }
]

onMounted(async () => {
  try {
    await dashboardStore.fetchDistributionStats()

    await stringJobStore.fetchAllJobs()

    await Promise.all([
      stringTypeStore.fetchAllStringTypes(),
      playerStore.fetchPlayers(),
      tournamentStore.fetchAllTournaments()
    ])

    if (tournamentStore.activeTournament) {
      selectedTournament.value = tournamentStore.activeTournament.id
    }
  } catch (error) {
    console.error('Error loading report data:', error)
  } finally {
    loading.value = false
  }
})

watch(selectedTournament, async (newTournamentId) => {
  if (newTournamentId) {
    loading.value = true
    try {
      await dashboardStore.fetchDistributionStats(newTournamentId)
    } catch (error) {
      console.error('Error loading tournament stats:', error)
    } finally {
      loading.value = false
    }
  } else {
    loading.value = true
    try {
      await dashboardStore.fetchDistributionStats()
    } catch (error) {
      console.error('Error loading overall stats:', error)
    } finally {
      loading.value = false
    }
  }
})

const filteredJobs = computed(() => {
  let filtered = [...stringJobStore.stringJobs]

  if (selectedTournament.value) {
    filtered = filtered.filter(job => job.tournamentId === selectedTournament.value)
  }

  if (selectedTimeframe.value !== 'all') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (selectedTimeframe.value === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      filtered = filtered.filter(job => new Date(job.createdAt) >= startOfYear)
    } else if (selectedTimeframe.value === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      filtered = filtered.filter(job => new Date(job.createdAt) >= startOfMonth)
    } else if (selectedTimeframe.value === 'week') {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
      filtered = filtered.filter(job => new Date(job.createdAt) >= startOfWeek)
    } else if (selectedTimeframe.value === 'custom' && dateRange.value.start && dateRange.value.end) {
      const startDate = new Date(dateRange.value.start)
      const endDate = new Date(dateRange.value.end)
      endDate.setHours(23, 59, 59, 999) // End of day

      filtered = filtered.filter(job => {
        const jobDate = new Date(job.createdAt)
        return jobDate >= startDate && jobDate <= endDate
      })
    }
  }

  return filtered
})

const statusData = computed(() => {
  const distribution = dashboardStore.distributionStats?.statusDistribution || []
  return {
    labels: distribution.map(item => item.status),
    datasets: [{
      data: distribution.map(item => item.count),
      backgroundColor: [
        '#ffcc80', // Pending (warning)
        '#64b5f6', // In Progress (info)
        '#81c784', // Completed (success)
        '#e57373'  // Cancelled (error)
      ]
    }]
  }
})

const tensionData = computed(() => {
  const distribution = dashboardStore.distributionStats?.tensionDistribution || []
  return {
    labels: distribution.map(item => item.range),
    datasets: [{
      data: distribution.map(item => item.count),
      backgroundColor: '#41b883'
    }]
  }
})

const stringBrandData = computed(() => {
  const distribution = dashboardStore.distributionStats?.stringBrandDistribution || []
  return {
    labels: distribution.map(item => item.brand),
    datasets: [{
      data: distribution.map(item => item.count),
      backgroundColor: distribution.map((_, index) => {
        const hue = 160 + (index * 20) % 60 // Variations of green/blue
        return `hsl(${hue}, 70%, 50%)`
      })
    }]
  }
})

const stringUsageData = computed(() => {
  const stringMap = new Map<number, { id: number, name: string, count: number }>()

  filteredJobs.value.forEach(job => {
    if (job.mainStringId) {
      const id = job.mainStringId
      const name = job.mainString ? `${job.mainString.brand} ${job.mainString.model}` : `String #${id}`

      if (!stringMap.has(id)) {
        stringMap.set(id, { id, name, count: 0 })
      }

      stringMap.get(id)!.count++
    }

    if (job.crossStringId && job.crossStringId !== job.mainStringId) {
      const id = job.crossStringId
      const name = job.crossString ? `${job.crossString.brand} ${job.crossString.model}` : `String #${id}`

      if (!stringMap.has(id)) {
        stringMap.set(id, { id, name, count: 0 })
      }

      stringMap.get(id)!.count++
    }
  })

  return Array.from(stringMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10
})

const tensionDistributionData = computed(() => {
  const tensionMap = new Map<string, number>()

  filteredJobs.value.forEach(job => {
    if (!job.mainTension) return

    let tension = job.mainTension
    if (!job.isTensionInKg) {
      tension = Math.round(tension * 0.453592) // Convert lb to kg
    }

    let range: string
    if (tension < 20) range = 'Under 20kg'
    else if (tension < 22) range = '20-21.9kg'
    else if (tension < 24) range = '22-23.9kg'
    else if (tension < 26) range = '24-25.9kg'
    else if (tension < 28) range = '26-27.9kg'
    else range = '28kg+'

    tensionMap.set(range, (tensionMap.get(range) || 0) + 1)
  })

  const allRanges = ['Under 20kg', '20-21.9kg', '22-23.9kg', '24-25.9kg', '26-27.9kg', '28kg+']

  allRanges.forEach(range => {
    if (!tensionMap.has(range)) {
      tensionMap.set(range, 0)
    }
  })

  return allRanges.map(range => ({
    range,
    count: tensionMap.get(range) || 0
  }))
})

const stringerPerformanceData = computed(() => {
  const stringerMap = new Map<number, {
    id: number,
    name: string,
    completed: number,
    inProgress: number,
    avgJobsPerDay: number,
    totalJobs: number
  }>()

  filteredJobs.value.forEach(job => {
    if (!job.stringerId) return

    const id = job.stringerId
    const name = job.stringer ? `${job.stringer.name} ${job.stringer.lastName}` : `Stringer #${id}`

    if (!stringerMap.has(id)) {
      stringerMap.set(id, {
        id,
        name,
        completed: 0,
        inProgress: 0,
        avgJobsPerDay: 0,
        totalJobs: 0
      })
    }

    const stringer = stringerMap.get(id)!
    stringer.totalJobs++

    if (job.status === 'Completed') {
      stringer.completed++
    } else if (job.status === 'InProgress') {
      stringer.inProgress++
    }
  })

  if (filteredJobs.value.length > 0) {
    const dates = filteredJobs.value
      .filter(job => job.completedAt) // Only consider completed jobs
      .map(job => new Date(job.completedAt!).toDateString()) // Get unique dates

    const uniqueDates = new Set(dates)
    const numberOfDays = Math.max(uniqueDates.size, 1) // Avoid division by zero

    stringerMap.forEach(stringer => {
      stringer.avgJobsPerDay = parseFloat((stringer.completed / numberOfDays).toFixed(1))
    })
  }

  return Array.from(stringerMap.values())
    .sort((a, b) => b.completed - a.completed)
})

const playerActivityData = computed(() => {
  const playerMap = new Map<number, {
    id: number,
    name: string,
    totalJobs: number,
    pendingJobs: number,
    lastActivity: Date | null
  }>()

  filteredJobs.value.forEach(job => {
    const id = job.playerId
    const name = job.player ? `${job.player.name} ${job.player.lastName}` : `Player #${id}`

    if (!playerMap.has(id)) {
      playerMap.set(id, {
        id,
        name,
        totalJobs: 0,
        pendingJobs: 0,
        lastActivity: null
      })
    }

    const player = playerMap.get(id)!
    player.totalJobs++

    if (job.status === 'Pending' || job.status === 'InProgress') {
      player.pendingJobs++
    }

    const jobDate = job.completedAt ? new Date(job.completedAt) : new Date(job.createdAt)
    if (!player.lastActivity || jobDate > player.lastActivity) {
      player.lastActivity = jobDate
    }
  })

  return Array.from(playerMap.values())
    .sort((a, b) => b.totalJobs - a.totalJobs)
})

const totals = computed(() => {
  const jobs = filteredJobs.value
  return {
    totalJobs: jobs.length,
    completedJobs: jobs.filter(job => job.status === 'Completed').length,
    inProgressJobs: jobs.filter(job => job.status === 'InProgress').length,
    pendingJobs: jobs.filter(job => job.status === 'Pending').length,
    cancelledJobs: jobs.filter(job => job.status === 'Cancelled').length
  }
})

const formatDate = (date: Date | null): string => {
  if (!date) return 'N/A'
  return date.toLocaleDateString()
}

const applyFilters = () => {
  if (selectedTimeframe.value === 'custom' && (!dateRange.value.start || !dateRange.value.end)) {
    return
  }

  showFilters.value = false
}

const resetFilters = () => {
  selectedTimeframe.value = 'all'
  selectedTournament.value = null
  dateRange.value = { start: '', end: '' }
}

const initCharts = () => {
  destroyCharts();

  if (!loading.value && dashboardStore.distributionStats) {
    if (statusChartRef.value && statusData.value.labels.length > 0) {
      statusChart = new Chart(statusChartRef.value, {
        type: 'pie',
        data: statusData.value,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    if (stringBrandChartRef.value && stringBrandData.value.labels.length > 0) {
      stringBrandChart = new Chart(stringBrandChartRef.value, {
        type: 'pie',
        data: stringBrandData.value,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    if (tensionChartRef.value && tensionData.value.labels.length > 0) {
      tensionChart = new Chart(tensionChartRef.value, {
        type: 'bar',
        data: {
          labels: tensionData.value.labels,
          datasets: [{
            label: 'Number of Jobs',
            data: tensionData.value.datasets[0].data,
            backgroundColor: tensionData.value.datasets[0].backgroundColor
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    if (stringUsageChartRef.value && stringUsageData.value.length > 0) {
      const labels = stringUsageData.value.map(item => item.name);
      const data = stringUsageData.value.map(item => item.count);

      stringUsageChart = new Chart(stringUsageChartRef.value, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Usage Count',
            data: data,
            backgroundColor: '#41b883'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true
            }
          }
        }
      });
    }

    if (tensionDistChartRef.value && tensionDistributionData.value.length > 0) {
      const labels = tensionDistributionData.value.map(item => item.range);
      const data = tensionDistributionData.value.map(item => item.count);

      tensionDistChart = new Chart(tensionDistChartRef.value, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Number of Jobs',
            data: data,
            backgroundColor: '#64b5f6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }
};

const destroyCharts = () => {
  if (statusChart) {
    statusChart.destroy();
    statusChart = null;
  }

  if (stringBrandChart) {
    stringBrandChart.destroy();
    stringBrandChart = null;
  }

  if (tensionChart) {
    tensionChart.destroy();
    tensionChart = null;
  }

  if (stringUsageChart) {
    stringUsageChart.destroy();
    stringUsageChart = null;
  }

  if (tensionDistChart) {
    tensionDistChart.destroy();
    tensionDistChart = null;
  }
};

onUnmounted(() => {
  destroyCharts();
});

watch(
  [
    () => loading.value,
    () => dashboardStore.distributionStats,
    () => selectedReport.value,
    () => filteredJobs.value.length
  ],
  () => {
    setTimeout(initCharts, 100);
  }
);

watch(
  [selectedTimeframe, selectedTournament, dateRange],
  () => {
    if (!loading.value) {
      setTimeout(initCharts, 100);
    }
  },
  { deep: true }
);

onMounted(async () => {
  try {
    await dashboardStore.fetchDistributionStats();
    await stringJobStore.fetchAllJobs();
    await Promise.all([
      stringTypeStore.fetchAllStringTypes(),
      playerStore.fetchPlayers(),
      tournamentStore.fetchAllTournaments()
    ]);

    if (tournamentStore.activeTournament) {
      selectedTournament.value = tournamentStore.activeTournament.id;
    }

    setTimeout(initCharts, 100);
  } catch (error) {
    console.error('Error loading report data:', error);
  } finally {
    loading.value = false;
  }
});

const showErrorAlert = ref(true)

watch(() => dashboardStore.error, (newError) => {
  if (newError) {
    showErrorAlert.value = true
  }
})
</script>

<template>
  <div class="reports-view">
    <v-container class="reports-view__container">

      <!-- Page Header -->
      <v-row class="mb-3">
        <v-col cols="12" md="8">
          <h1 class="reports-view__title">Reports & Analytics</h1>
        </v-col>
      </v-row>

      <!-- Error Alert -->
      <v-row class="mb-3" v-if="dashboardStore.error && showErrorAlert">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable v-model="showErrorAlert">
            {{ dashboardStore.error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Filters and Report Selection -->
      <v-card class="mb-12">
        <v-card-text>
          <v-row class="align-center">

            <!-- Report Selector -->
            <v-col cols="12" md="6">
              <v-select v-model="selectedReport" label="Select Report" :items="reportOptions" item-title="title"
                item-value="value" variant="outlined" density="comfortable" hide-details>
                <template v-slot:prepend-inner>
                  <v-icon color="primary">{{reportOptions.find(r => r.value === selectedReport)?.icon}}</v-icon>
                </template>
              </v-select>
            </v-col>

            <!-- Timeframe and Filter Controls -->
            <v-col cols="6" md="3">
              <v-btn color="primary" variant="outlined" block @click="showFilters = !showFilters">
                {{ showFilters ? 'Hide Filters' : 'Show Filters' }}
              </v-btn>
            </v-col>
            <v-col cols="6" md="3">
              <v-btn color="primary" variant="outlined" block @click="resetFilters">
                Reset Filters
              </v-btn>
            </v-col>
          </v-row>

          <!-- Expanded Filters -->
          <v-expand-transition>
            <div v-if="showFilters">
              <v-divider class="my-3"></v-divider>
              <v-row>

                <!-- Timeframe Filter -->
                <v-col cols="12" md="4">
                  <v-select v-model="selectedTimeframe" label="Time Period" :items="timeframeOptions" item-title="title"
                    item-value="value" variant="outlined" density="comfortable" hide-details></v-select>
                </v-col>

                <!-- Tournament Filter -->
                <v-col cols="12" md="4">
                  <v-select v-model="selectedTournament" label="Tournament" :items="tournamentStore.tournamentOptions"
                    clearable item-title="text" item-value="value" variant="outlined" density="comfortable"
                    hide-details></v-select>
                </v-col>

                <!-- Date Range (if Custom) -->
                <v-col cols="12" md="4" v-if="selectedTimeframe === 'custom'">
                  <v-row dense>
                    <v-col cols="6">
                      <v-text-field v-model="dateRange.start" label="Start Date" type="date" variant="outlined"
                        density="comfortable" hide-details></v-text-field>
                    </v-col>
                    <v-col cols="6">
                      <v-text-field v-model="dateRange.end" label="End Date" type="date" variant="outlined"
                        density="comfortable" hide-details></v-text-field>
                    </v-col>
                  </v-row>
                </v-col>

                <!-- Apply Button -->
                <v-col cols="12" class="d-flex justify-end">
                  <v-btn color="primary" @click="applyFilters">Apply Filters</v-btn>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <!-- No Data State -->
      <v-card v-else-if="filteredJobs.length === 0" class="mb-6 text-center py-8">
        <v-icon icon="mdi-chart-box" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h5 mb-2">No data available</h3>
        <p class="text-body-1 mb-6 text-grey">
          There is no data available for the selected filters.
        </p>
        <v-btn color="primary" @click="resetFilters">Reset Filters</v-btn>
      </v-card>

      <!-- Report Content -->
      <template v-else>

        <!-- Overview Report -->
        <div v-if="selectedReport === 'overview'" class="reports-view__report">

          <!-- Stats Summary -->
          <v-row class="reports-view__stats mb-6">
            <v-col cols="6" md="3">
              <v-card class="reports-view__stats-card">
                <v-card-text>
                  <div class="reports-view__stats-card__content">
                    <div>
                      <p class="reports-view__stats-card__label">Total Jobs</p>
                      <p class="reports-view__stats-card__value">{{ totals.totalJobs }}</p>
                    </div>
                    <v-icon size="36" color="primary" icon="mdi-tennis"></v-icon>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card class="reports-view__stats-card">
                <v-card-text>
                  <div class="reports-view__stats-card__content">
                    <div>
                      <p class="reports-view__stats-card__label">Completed</p>
                      <p class="reports-view__stats-card__value">{{ totals.completedJobs }}</p>
                    </div>
                    <v-icon size="36" color="success" icon="mdi-check-circle-outline"></v-icon>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card class="reports-view__stats-card">
                <v-card-text>
                  <div class="reports-view__stats-card__content">
                    <div>
                      <p class="reports-view__stats-card__label">In Progress</p>
                      <p class="reports-view__stats-card__value">{{ totals.inProgressJobs }}</p>
                    </div>
                    <v-icon size="36" color="info" icon="mdi-progress-wrench"></v-icon>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card class="reports-view__stats-card">
                <v-card-text>
                  <div class="reports-view__stats-card__content">
                    <div>
                      <p class="reports-view__stats-card__label">Pending</p>
                      <p class="reports-view__stats-card__value">{{ totals.pendingJobs }}</p>
                    </div>
                    <v-icon size="36" color="warning" icon="mdi-clock-outline"></v-icon>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Distribution Charts -->
          <v-row>

            <!-- Status Distribution -->
            <v-col cols="12" md="6">
              <v-card class="reports-view__chart-card">
                <v-card-title class="reports-view__section-title">
                  <v-icon start>mdi-pie-chart</v-icon>
                  Status Distribution
                </v-card-title>
                <v-card-text>
                  <div v-if="statusData.labels.length > 0" class="reports-view__chart-container">
                    <canvas id="statusChart" ref="statusChartRef"></canvas>
                    <div class="reports-view__chart-legend">
                      <div v-for="(label, i) in statusData.labels" :key="label" class="reports-view__chart-legend-item">
                        <span class="reports-view__chart-legend-color"
                          :style="{ backgroundColor: statusData.datasets[0].backgroundColor[i] }"></span>
                        <span>{{ label }}: {{ statusData.datasets[0].data[i] }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center py-8">
                    <p>No status distribution data available</p>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- String Brand Distribution -->
            <v-col cols="12" md="6">
              <v-card class="reports-view__chart-card">
                <v-card-title class="reports-view__section-title">
                  <v-icon start>mdi-grid</v-icon>
                  String Brand Distribution
                </v-card-title>
                <v-card-text>
                  <div v-if="stringBrandData.labels.length > 0" class="reports-view__chart-container">
                    <canvas id="stringBrandChart" ref="stringBrandChartRef"></canvas>
                    <div class="reports-view__chart-legend">
                      <div v-for="(label, i) in stringBrandData.labels.slice(0, 5)" :key="label"
                        class="reports-view__chart-legend-item">
                        <span class="reports-view__chart-legend-color"
                          :style="{ backgroundColor: stringBrandData.datasets[0].backgroundColor[i] }"></span>
                        <span>{{ label }}: {{ stringBrandData.datasets[0].data[i] }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center py-8">
                    <p>No string brand distribution data available</p>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Tension Distribution -->
            <v-col cols="12">
              <v-card class="reports-view__chart-card">
                <v-card-title class="reports-view__section-title">
                  <v-icon start>mdi-gauge</v-icon>
                  Tension Distribution
                </v-card-title>
                <v-card-text>
                  <div v-if="tensionData.labels.length > 0" class="reports-view__chart-container">
                    <canvas id="tensionChart" ref="tensionChartRef"></canvas>
                  </div>
                  <div v-else class="text-center py-8">
                    <p>No tension distribution data available</p>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- String Usage Report -->
        <div v-else-if="selectedReport === 'strings'" class="reports-view__report">
          <v-card class="mb-6">
            <v-card-title class="reports-view__section-title">
              <v-icon start>mdi-grid</v-icon>
              String Usage Report
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" lg="6">

                  <!-- String Usage Chart -->
                  <div class="reports-view__chart-container">
                    <canvas id="stringUsageChart" ref="stringUsageChartRef"></canvas>
                  </div>
                </v-col>
                <v-col cols="12" lg="6">

                  <!-- String Usage Table -->
                  <v-table class="reports-view__table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>String</th>
                        <th class="text-right">Usage Count</th>
                        <th class="text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(string, index) in stringUsageData" :key="string.id">
                        <td>{{ index + 1 }}</td>
                        <td>{{ string.name }}</td>
                        <td class="text-right">{{ string.count }}</td>
                        <td class="text-right">
                          {{ Math.round((string.count / filteredJobs.length) * 100) }}%
                        </td>
                      </tr>
                      <tr v-if="stringUsageData.length === 0">
                        <td colspan="4" class="text-center">No string usage data available</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </div>

        <!-- Tension Distribution Report -->
        <div v-else-if="selectedReport === 'tension'" class="reports-view__report">
          <v-card class="mb-6">
            <v-card-title class="reports-view__section-title">
              <v-icon start>mdi-gauge</v-icon>
              Tension Distribution Report
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" lg="6">

                  <!-- Tension Distribution Chart -->
                  <div class="reports-view__chart-container">
                    <canvas id="tensionDistChart" ref="tensionDistChartRef"></canvas>
                  </div>
                </v-col>
                <v-col cols="12" lg="6">

                  <!-- Tension Distribution Table -->
                  <v-table class="reports-view__table">
                    <thead>
                      <tr>
                        <th>Tension Range</th>
                        <th class="text-right">Count</th>
                        <th class="text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="range in tensionDistributionData" :key="range.range">
                        <td>{{ range.range }}</td>
                        <td class="text-right">{{ range.count }}</td>
                        <td class="text-right">
                          {{ Math.round((range.count / filteredJobs.length) * 100) || 0 }}%
                        </td>
                      </tr>
                      <tr v-if="tensionDistributionData.length === 0">
                        <td colspan="3" class="text-center">No tension data available</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </div>

        <!-- Stringer Performance Report -->
        <div v-else-if="selectedReport === 'stringers'" class="reports-view__report">
          <v-card class="mb-6">
            <v-card-title class="reports-view__section-title">
              <v-icon start>mdi-account-wrench</v-icon>
              Stringer Performance Report
            </v-card-title>
            <v-card-text>
              <v-table class="reports-view__table">
                <thead>
                  <tr>
                    <th>Stringer</th>
                    <th class="text-right">Completed Jobs</th>
                    <th class="text-right">In Progress</th>
                    <th class="text-right">Avg Jobs/Day</th>
                    <th class="text-right">Total Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stringer in stringerPerformanceData" :key="stringer.id">
                    <td>{{ stringer.name }}</td>
                    <td class="text-right">{{ stringer.completed }}</td>
                    <td class="text-right">{{ stringer.inProgress }}</td>
                    <td class="text-right">{{ stringer.avgJobsPerDay }}</td>
                    <td class="text-right">{{ stringer.totalJobs }}</td>
                  </tr>
                  <tr v-if="stringerPerformanceData.length === 0">
                    <td colspan="5" class="text-center">No stringer performance data available</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </div>

        <!-- Player Activity Report -->
        <div v-else-if="selectedReport === 'players'" class="reports-view__report">
          <v-card class="mb-6">
            <v-card-title class="reports-view__section-title">
              <v-icon start>mdi-account-group</v-icon>
              Player Activity Report
            </v-card-title>
            <v-card-text>
              <v-table class="reports-view__table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th class="text-right">Total Jobs</th>
                    <th class="text-right">Pending Jobs</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="player in playerActivityData" :key="player.id">
                    <td>{{ player.name }}</td>
                    <td class="text-right">{{ player.totalJobs }}</td>
                    <td class="text-right">{{ player.pendingJobs }}</td>
                    <td>{{ formatDate(player.lastActivity) }}</td>
                  </tr>
                  <tr v-if="playerActivityData.length === 0">
                    <td colspan="4" class="text-center">No player activity data available</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </div>
      </template>
    </v-container>
  </div>
</template>

<style lang="scss" scoped>
.reports-view {
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

  &__stats {
    margin-bottom: $spacing-lg;

    &-card {
      height: 100%;
      @include card-shadow;

      &__content {
        @include flex-between;
      }

      &__label {
        @include small-text;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }

      &__value {
        @include heading-2;
        margin: 0;
      }
    }
  }

  &__chart {
    &-card {
      @include card-shadow;
      margin-bottom: $spacing-md;
      overflow: hidden;
      height: 100%;
      min-height: 400px;

      @include respond-to(xs) {
        margin-bottom: $spacing-sm;
        min-height: 350px;

        :deep(.v-card-text) {
          padding: $spacing-xs !important;
        }
      }

      @include respond-to(sm) {
        min-height: 380px;

        :deep(.v-card-text) {
          padding: $spacing-sm !important;
        }
      }
    }

    &-container {
      padding: $spacing-md;
      height: 300px;
      position: relative;

      @include respond-to(xs) {
        height: 200px;
        padding: $spacing-sm;
      }

      @include respond-to(sm) {
        height: 220px;
        padding: $spacing-sm;
      }
    }

    &-legend {
      margin-top: $spacing-md;
      @include flex(row, center, center, wrap);
      gap: $spacing-sm;

      &-item {
        @include flex(row, flex-start, center);
        gap: $spacing-xs;
        margin-right: $spacing-md;
      }

      &-color {
        width: 16px;
        height: 16px;
        border-radius: 4px;
      }
    }
  }

  &__table {
    border-collapse: collapse;
    width: 100%;

    th {
      font-weight: $font-weight-medium;
      color: $text-secondary;
      text-align: left;
    }

    tr:nth-child(even) {
      background-color: rgba($primary, 0.03);
    }
  }

  &__report {
    margin-top: $spacing-lg;
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