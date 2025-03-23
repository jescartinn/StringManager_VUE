<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

// Datos simulados para la demostración
const pendingJobs = ref(12)
const inProgressJobs = ref(5)
const completedJobsToday = ref(8)
const highPriorityJobs = ref(3)

const currentTournament = ref({
  id: 1,
  name: 'Australian Open 2025',
  remainingDays: 4
})

const topStringers = ref([
  { id: 1, stringerName: 'Juan Pérez', completedJobs: 24 },
  { id: 2, stringerName: 'María González', completedJobs: 18 },
  { id: 3, stringerName: 'Carlos Rodríguez', completedJobs: 15 }
])

const topPlayers = ref([
  { id: 1, playerName: 'Rafael Nadal', totalJobs: 14 },
  { id: 2, playerName: 'Novak Djokovic', totalJobs: 12 },
  { id: 3, playerName: 'Carlos Alcaraz', totalJobs: 10 }
])

const topStrings = ref([
  { id: 1, stringName: 'Babolat RPM Blast', totalUses: 22 },
  { id: 2, stringName: 'Luxilon ALU Power', totalUses: 18 },
  { id: 3, stringName: 'Tecnifibre Pro Red Code', totalUses: 15 }
])

const recentJobs = ref([
  {
    id: 1,
    playerName: 'Rafael Nadal',
    racquet: 'Babolat Pure Aero',
    mainString: 'RPM Blast',
    tension: '25kg',
    status: 'Completed',
    createdAt: '2025-03-22T14:30:00'
  },
  {
    id: 2,
    playerName: 'Novak Djokovic',
    racquet: 'Head Speed Pro',
    mainString: 'ALU Power',
    tension: '24kg',
    status: 'InProgress',
    createdAt: '2025-03-23T09:15:00'
  },
  {
    id: 3,
    playerName: 'Carlos Alcaraz',
    racquet: 'Babolat Pure Aero',
    mainString: 'Solinco Hyper-G',
    tension: '25kg',
    status: 'Pending',
    createdAt: '2025-03-23T10:45:00'
  },
  {
    id: 4,
    playerName: 'Iga Swiatek',
    racquet: 'Tecnifibre Tempo',
    mainString: 'Pro Red Code',
    tension: '24kg',
    status: 'Pending',
    createdAt: '2025-03-23T11:20:00'
  }
])

const isLoading = ref(true)
const router = useRouter()

onMounted(() => {
  // Simular carga de datos
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
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
  return Math.round((completedJobsToday.value / total) * 100)
})
</script>

<template>
  <div class="home">
    <v-container class="home__container">
      <v-row>
        <v-col cols="12">
          <h1 class="home__title">Dashboard</h1>
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
        <v-row>
          <!-- Left column: Recent jobs and completion % -->
          <v-col cols="12" md="8">
            <v-card class="home__card">
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
                  <v-btn color="primary" prepend-icon="mdi-eye">
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

              <v-card-text>
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
            <!-- Current Tournament Card -->
            <v-card class="home__card" v-if="currentTournament">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-trophy" color="primary"></v-icon>
                Current Tournament
              </v-card-title>

              <v-card-text>
                <h3 class="home__tournament-name">{{ currentTournament.name }}</h3>
                <p class="home__tournament-days">
                  <v-icon start color="warning" icon="mdi-calendar-clock"></v-icon>
                  {{ currentTournament.remainingDays }} days remaining
                </p>
                <v-btn block color="primary" class="mt-4" prepend-icon="mdi-tennis">
                  Tournament Details
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- Top Stringers Card -->
            <v-card class="home__card mt-4">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-account-group" color="primary"></v-icon>
                Top Stringers
              </v-card-title>

              <v-card-text>
                <v-list class="home__ranking-list">
                  <v-list-item v-for="(stringer, index) in topStringers" :key="stringer.id"
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
            <v-card class="home__card mt-4">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-tennis" color="primary"></v-icon>
                Top Players
              </v-card-title>

              <v-card-text>
                <v-list class="home__ranking-list">
                  <v-list-item v-for="(player, index) in topPlayers" :key="player.id" :title="player.playerName"
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
            <v-card class="home__card mt-4">
              <v-card-title class="home__card-title">
                <v-icon start icon="mdi-basketball" color="primary"></v-icon>
                Top Strings
              </v-card-title>

              <v-card-text>
                <v-list class="home__ranking-list">
                  <v-list-item v-for="(string, index) in topStrings" :key="string.id" :title="string.stringName"
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