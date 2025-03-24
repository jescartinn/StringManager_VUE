<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/apiService'

// Data for dashboard
const pendingJobs = ref(0)
const inProgressJobs = ref(0)
const completedJobsToday = ref(0)
const highPriorityJobs = ref(0)

const currentTournament = ref(null)
const topStringers = ref([])
const topPlayers = ref([])
const topStrings = ref([])
const recentJobs = ref([])

const isLoading = ref(true)
const error = ref(null)
const router = useRouter()

// Fetch all dashboard data
const fetchDashboardData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    // Get dashboard stats
    const dashboardStats = await api.dashboard.getStats()
    
    // Update dashboard data with real values
    pendingJobs.value = dashboardStats.pendingJobs
    inProgressJobs.value = dashboardStats.inProgressJobs
    completedJobsToday.value = dashboardStats.completedJobsToday
    highPriorityJobs.value = dashboardStats.highPriorityJobs
    currentTournament.value = dashboardStats.currentTournament
    topStringers.value = dashboardStats.topStringers
    topPlayers.value = dashboardStats.topPlayers
    topStrings.value = dashboardStats.topStrings
    
    // Get recent jobs (5 most recent)
    const allJobs = await api.stringJobs.getAll()
    // Sort jobs by createdAt date (newest first) and take the first 5
    recentJobs.value = allJobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(job => ({
        id: job.id,
        playerName: job.player ? `${job.player.name} ${job.player.lastName}` : 'Unknown',
        racquet: job.racquet ? `${job.racquet.brand} ${job.racquet.model}` : 'Unknown',
        mainString: job.mainString ? `${job.mainString.brand} ${job.mainString.model}` : 'N/A',
        tension: job.isTensionInKg ? `${job.mainTension}kg` : `${job.mainTension}lb`,
        status: job.status,
        createdAt: job.createdAt
      }))
  } catch (e) {
    console.error('Error fetching dashboard data:', e)
    error.value = 'Failed to load dashboard data. Please try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})

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

// Función para formatear fecha
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Cálculo del porcentaje de completitud total de los trabajos
const completionPercentage = computed(() => {
  const total = pendingJobs.value + inProgressJobs.value + completedJobsToday.value
  if (total === 0) return 0
  return Math.round((completedJobsToday.value / total) * 100)
})

const handleRetry = () => {
  fetchDashboardData()
}

const navigateToJobs = () => {
  router.push('/jobs')
}

const navigateToTournament = (id: number) => {
  router.push(`/tournaments/${id}`)
}
</script>

<template>
  <div class="home">
    <v-container class="home__container">
      <v-row>
        <v-col cols="12">
          <h1 class="home__title">Dashboard</h1>
        </v-col>
      </v-row>

      <!-- Error state -->
      <v-row v-if="error && !isLoading">
        <v-col cols="12">
          <v-alert type="error" variant="tonal">
            {{ error }}
            <template v-slot:append>
              <v-btn color="error" variant="text" @click="handleRetry">
                Retry
              </v-btn>
            </template>
          </v-alert>
        </v-col>
      </v-row>

      <!-- Skeleton loaders -->
      <template v-if="isLoading">
        <v-row>
          <v-col v-for="i in 4" :key="i" cols="12" sm="6" md="3">
            <v-skeleton-loader type="card" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="8">
            <v-skeleton-loader type="table" />
          </v-col>
          <v-col cols="12" md="4">
            <v-skeleton-loader type="list-item-three-line" />
            <v-skeleton-loader type="list-item-three-line" />
          </v-col>
        </v-row>
      </template>

      <!-- Dashboard content -->
      <template v-else>
        <!-- Stats cards -->
        <v-row class="home__stats">
          <v-col cols="12" sm="6" md="3">
            <v-card class="home__stats-card">
              <v-card-text>
                <div class="home__stats-card__content">
                  <div>
                    <p class="home__stats-card__label">Pending Jobs</p>
                    <p class="home__stats-card__value">{{ pendingJobs }}</p>
                  </div>
                  <v-icon size="36" color="warning" icon="mdi-clock-outline"></v-icon>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card class="home__stats-card">
              <v-card-text>
                <div class="home__stats-card__content">
                  <div>
                    <p class="home__stats-card__label">In Progress</p>
                    <p class="home__stats-card__value">{{ inProgressJobs }}</p>
                  </div>
                  <v-icon size="36" color="info" icon="mdi-progress-wrench"></v-icon>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card class="home__stats-card">
              <v-card-text>
                <div class="home__stats-card__content">
                  <div>
                    <p class="home__stats-card__label">Completed Today</p>
                    <p class="home__stats-card__value">{{ completedJobsToday }}</p>
                  </div>
                  <v-icon size="36" color="success" icon="mdi-check-circle-outline"></v-icon>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card class="home__stats-card">
              <v-card-text>
                <div class="home__stats-card__content">
                  <div>
                    <p class="home__stats-card__label">High Priority</p>
                    <p class="home__stats-card__value">{{ highPriorityJobs }}</p>
                  </div>
                  <v-icon size="36" color="error" icon="mdi-alert-circle-outline"></v-icon>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Main dashboard content -->
        <v-row v-if="!recentJobs.length && !topStringers.length">
          <v-col cols="12">
            <v-card class="home__card">
              <v-card-text class="text-center py-8">
                <v-icon icon="mdi-tennis" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">No data available</h3>
                <p class="text-body-1 mb-6 text-grey">There are no stringing jobs in the system yet.</p>
                <v-btn color="primary" prepend-icon="mdi-plus">Create First Job</v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-else>
          <!-- Left column: Recent jobs and completion % -->
          <v-col cols="12" md="8">
            <v-card class="home__card" v-if="recentJobs.length">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-tennis" color="primary"></v-icon>
                Recent Stringing Jobs
              </v-card-title>

              <v-card-text>
                <v-table class="home__table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Racquet</th>
                      <th>String</th>
                      <th>Tension</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="job in recentJobs" :key="job.id" class="home__table-row">
                      <td>{{ job.playerName }}</td>
                      <td>{{ job.racquet }}</td>
                      <td>{{ job.mainString }}</td>
                      <td>{{ job.tension }}</td>
                      <td>
                        <v-chip size="small" :color="getStatusColor(job.status)" text-color="white">
                          {{ job.status }}
                        </v-chip>
                      </td>
                      <td>{{ formatDate(job.createdAt) }}</td>
                    </tr>
                  </tbody>
                </v-table>

                <div class="d-flex justify-end mt-4">
                  <v-btn color="primary" prepend-icon="mdi-eye" @click="navigateToJobs">
                    View All Jobs
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>

            <!-- Completion Rate Card -->
            <v-card class="home__card mt-4">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-chart-arc" color="primary"></v-icon>
                Today's Completion Rate
              </v-card-title>

              <v-card-text class="pt-4">
                <div class="home__progress-container">
                  <v-progress-circular :rotate="360" :size="100" :width="15" :model-value="completionPercentage"
                    color="primary" class="home__progress-circle">
                    {{ completionPercentage }}%
                  </v-progress-circular>

                  <div class="home__progress-stats">
                    <div class="home__progress-stat">
                      <v-icon color="warning" icon="mdi-clock-outline"></v-icon>
                      <span>Pending: {{ pendingJobs }}</span>
                    </div>
                    <div class="home__progress-stat">
                      <v-icon color="info" icon="mdi-progress-wrench"></v-icon>
                      <span>In Progress: {{ inProgressJobs }}</span>
                    </div>
                    <div class="home__progress-stat">
                      <v-icon color="success" icon="mdi-check-circle-outline"></v-icon>
                      <span>Completed: {{ completedJobsToday }}</span>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Right column: Tournament and top lists -->
          <v-col cols="12" md="4">
            <!-- Current Tournament Card - Always shown -->
            <v-card class="home__card">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-trophy" color="primary"></v-icon>
                Current Tournament
              </v-card-title>

              <v-card-text class="pt-4">
                <!-- Content when there is an active tournament -->
                <template v-if="currentTournament">
                  <h3 class="home__tournament-name">{{ currentTournament.name }}</h3>
                  <p class="home__tournament-days">
                    <v-icon start color="warning" icon="mdi-calendar-clock"></v-icon>
                    {{ currentTournament.remainingDays }} days remaining
                  </p>
                  <v-btn block color="primary" class="mt-4" prepend-icon="mdi-tennis" 
                    @click="navigateToTournament(currentTournament.id)">
                    Tournament Details
                  </v-btn>
                </template>
                
                <!-- Content when there is no active tournament -->
                <template v-else>
                  <div class="home__tournament-empty">
                    <v-icon icon="mdi-calendar-remove" size="56" color="grey-lighten-1" class="mb-3"></v-icon>
                    <h3 class="text-h6 text-grey-darken-1">No Active Tournament</h3>
                    <p class="text-body-2 text-grey mb-4">There is no tournament currently running.</p>
                    <v-btn block color="primary" prepend-icon="mdi-calendar" to="/tournaments">
                      View All Tournaments
                    </v-btn>
                  </div>
                </template>
              </v-card-text>
            </v-card>

            <!-- Top Stringers Card -->
            <v-card class="home__card mt-4" v-if="topStringers.length">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-account-group" color="primary"></v-icon>
                Top Stringers
              </v-card-title>

              <v-card-text class="pt-4">
                <v-list class="home__ranking-list">
                  <v-list-item v-for="(stringer, index) in topStringers" :key="stringer.stringerId"
                    :title="stringer.stringerName" :subtitle="`${stringer.completedJobs} jobs completed`">
                    <template v-slot:prepend>
                      <v-avatar color="primary" class="white--text">
                        {{ index + 1 }}
                      </v-avatar>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>

            <!-- Top Players Card -->
            <v-card class="home__card mt-4" v-if="topPlayers.length">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-tennis" color="primary"></v-icon>
                Top Players
              </v-card-title>

              <v-card-text class="pt-4">
                <v-list class="home__ranking-list">
                  <v-list-item v-for="(player, index) in topPlayers" :key="player.playerId" :title="player.playerName"
                    :subtitle="`${player.totalJobs} total jobs`">
                    <template v-slot:prepend>
                      <v-avatar color="secondary" class="white--text">
                        {{ index + 1 }}
                      </v-avatar>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>

            <!-- Top Strings Card -->
            <v-card class="home__card mt-4" v-if="topStrings.length">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-basketball" color="primary"></v-icon>
                Top Strings
              </v-card-title>

              <v-card-text class="pt-4">
                <v-list class="home__ranking-list">
                  <v-list-item v-for="(string, index) in topStrings" :key="string.stringId" :title="string.stringName"
                    :subtitle="`${string.totalUses} total uses`">
                    <template v-slot:prepend>
                      <v-avatar color="accent" class="white--text">
                        {{ index + 1 }}
                      </v-avatar>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>
  </div>
</template>

<style lang="scss" scoped>
.home {
  &__container {
    padding: $spacing-lg;
    max-width: 100%;
  }

  &__title {
    @include heading-1;
    color: $primary;
    margin-bottom: $spacing-lg;
  }

  &__stats {
    margin-bottom: $spacing-lg;

    &-card {
      height: 100%;
      @include transition;

      &:hover {
        transform: translateY(-4px);
        @include card-shadow;
      }

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

  &__card {
    @include card-shadow;
    margin-bottom: $spacing-md;
    overflow: hidden;

    &-title {
      @include heading-3;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      padding-bottom: $spacing-md;
      padding-top: $spacing-md;
    }
  }

  &__table {
    &-row {
      &:hover {
        background-color: rgba($primary, 0.05);
      }
    }
  }

  &__tournament {
    &-name {
      @include heading-3;
      color: $primary;
      margin-bottom: $spacing-xs;
      margin-top: $spacing-xs;
    }

    &-days {
      @include flex(row, flex-start, center);
      @include body-text;
      color: $warning;
    }
    
    &-empty {
      @include flex(column, center, center);
      padding: $spacing-lg 0;
      text-align: center;
    }
  }

  &__progress {
    &-container {
      @include flex(row, space-around, center, wrap);
      padding: $spacing-md 0;

      @include respond-above(md) {
        @include flex(row, space-between, center, nowrap);
      }
    }

    &-circle {
      font-weight: $font-weight-bold;
      margin-bottom: $spacing-md;

      @include respond-above(md) {
        margin-bottom: 0;
      }
    }

    &-stats {
      @include flex(column, center, flex-start);
      gap: $spacing-md;
    }

    &-stat {
      @include flex(row, flex-start, center);
      gap: $spacing-sm;
      @include body-text;
    }
  }

  &__ranking-list {
    padding: 0;
  }
}

// Apply status colors
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