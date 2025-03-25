<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  useAuthStore,
  useDashboardStore,
  usePlayerStore,
  useStringerStore,
  useTournamentStore,
  useStringJobStore
} from './stores'

const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const playerStore = usePlayerStore()
const stringerStore = useStringerStore()
const tournamentStore = useTournamentStore()
const stringJobStore = useStringJobStore()
const route = useRoute()
const router = useRouter()

// Determine if we should show the app layout or just the router view
const showAppLayout = computed(() => {

  // If the route doesn't require auth (like landing page), don't show app layout
  if (route.meta.requiresAuth === false) {
    return false
  }

  // Otherwise, show app layout if authenticated
  return authStore.isAuthenticated
})

// Reference to the drawer state
const drawer = ref(false)

// Navigation items
const navigationItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', route: '/dashboard' },
  { title: 'String Jobs', icon: 'mdi-tennis', route: '/jobs' },
  { title: 'Players', icon: 'mdi-account-group', route: '/players' },
  { title: 'Racquets', icon: 'mdi-tennis-ball', route: '/racquets' },
  { title: 'Strings', icon: 'mdi-grid', route: '/strings' },
  { title: 'Stringers', icon: 'mdi-account-wrench', route: '/stringers' },
  { title: 'Tournaments', icon: 'mdi-trophy', route: '/tournaments' },
  { title: 'Reports', icon: 'mdi-chart-bar', route: '/reports' },
]

// Toggle the drawer
const toggleDrawer = () => {
  drawer.value = !drawer.value
}

// Computed properties for user display
const userInitials = computed(() => {
  if (!authStore.user?.username) return '';
  return authStore.user.username.split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase();
})

const userName = computed(() => {
  return authStore.user?.username || ''
})

const userRole = computed(() => {
  return authStore.user?.role || ''
})

// Notification counts from various stores
const pendingJobsCount = computed(() => stringJobStore.pendingJobs.length)
const highPriorityJobsCount = computed(() => stringJobStore.highPriorityJobs.length)

// Total notifications count
const notificationCount = computed(() => {
  let count = 0
  if (highPriorityJobsCount.value > 0) {
    count += highPriorityJobsCount.value
  }
  return count > 0 ? count : null
})

// Current tournament info
const currentTournament = computed(() => tournamentStore.activeTournament)

// Watch for login/logout
watch(() => authStore.isAuthenticated, (isAuthenticated, wasAuthenticated) => {
  // If user just logged in
  if (isAuthenticated && !wasAuthenticated) {
    // Let's ensure UI is updated before prefetching data
    nextTick(() => prefetchData())
  }
})

// Prefetch common data on application start
const prefetchData = async () => {
  // Only run if user is authenticated
  if (!authStore.isAuthenticated) return

  try {
    // Start loading data in parallel
    const fetchPromises = [
      // Fetch current tournament data
      tournamentStore.fetchCurrentTournament(),
      // Fetch basic dashboard stats
      dashboardStore.fetchDashboardStats(),
      // Fetch pending jobs
      stringJobStore.fetchJobsByStatus('Pending'),
      // Prefetch players and stringers for form select options
      playerStore.fetchPlayers(),
      stringerStore.fetchAllStringers()
    ]

    await Promise.all(fetchPromises)
  } catch (error) {
    console.error('Error prefetching application data:', error)
  }
}

// Wait for app to be ready, auth to be checked and then prefetch data
onMounted(async () => {
  // If user is authenticated, prefetch data
  if (authStore.isAuthenticated) {
    await prefetchData()
  }
})

// Watch for route changes to update currently viewed job/player/etc
watch(() => route.path, () => {
  // Auto-close drawer on mobile when navigating
  if (window.innerWidth < 960) {
    drawer.value = false
  }
})

// Handle logout
const handleLogout = async () => {
  await authStore.logout()
  // Reset all stores when logging out
  playerStore.reset()
  stringJobStore.clearCurrentJob()
  tournamentStore.reset()
  stringerStore.reset()
  dashboardStore.reset()
}

// Navigate to notifications view with appropriate filter
const viewNotifications = () => {
  if (highPriorityJobsCount.value > 0) {
    router.push({ path: '/jobs', query: { priority: 'high' } })
  } else {
    router.push('/jobs')
  }
}
</script>

<template>
  <!-- App Layout for authenticated users -->
  <v-app v-if="showAppLayout" class="app">
    <!-- App Bar -->
    <v-app-bar color="primary" app flat>
      <v-app-bar-nav-icon @click="toggleDrawer" color="white"></v-app-bar-nav-icon>
      <v-toolbar-title class="app__title">
        <span class="font-weight-bold">StringManager</span>
        <!-- Display current tournament if available -->
        <span v-if="currentTournament" class="ml-2 text-caption d-none d-md-inline-block">
          <v-chip color="secondary" size="small" class="ml-2">
            {{ currentTournament.name }}
          </v-chip>
        </span>
      </v-toolbar-title>
      <v-spacer></v-spacer>

      <!-- Pending Jobs Counter -->
      <v-btn icon color="white" class="app__nav-btn" :to="{ path: '/jobs', query: { status: 'pending' } }"
        :disabled="pendingJobsCount === 0">
        <v-badge :content="pendingJobsCount || undefined" color="warning">
          <v-icon>mdi-clock-outline</v-icon>
        </v-badge>
      </v-btn>

      <!-- Notifications / High Priority Jobs -->
      <v-btn icon color="white" class="app__nav-btn" @click="viewNotifications" :disabled="notificationCount === null">
        <v-badge :content="notificationCount || undefined" color="error">
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>

      <!-- User menu -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" class="app__user-btn" color="primary">
            <v-avatar color="secondary" size="32" class="app__user-avatar" v-if="authStore.user">
              {{ userInitials }}
            </v-avatar>
            <span class="app__user-name ml-2 d-none d-sm-inline-block" v-if="authStore.user">
              {{ userName }}
            </span>
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list class="pa-0">
          <v-list-item to="/profile">
            <v-list-item-title>
              <v-icon start>mdi-account</v-icon>
              Profile
            </v-list-item-title>
          </v-list-item>
          <v-list-item to="/settings">
            <v-list-item-title>
              <v-icon start>mdi-cog</v-icon>
              Settings
            </v-list-item-title>
          </v-list-item>
          <v-divider></v-divider>
          <v-list-item @click="handleLogout">
            <v-list-item-title>
              <v-icon start>mdi-logout</v-icon>
              Logout
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" app class="app__drawer">
      <div class="app__drawer-header">
        <div class="app__logo-container">
          <v-icon size="36" color="primary">mdi-tennis</v-icon>
          <h2 class="app__logo-text">StringManager</h2>
        </div>
      </div>

      <v-divider></v-divider>

      <!-- Current Tournament Banner (if exists) -->
      <v-alert v-if="currentTournament" color="secondary" variant="tonal" border="start" class="mt-2 mx-2"
        density="compact">
        <div class="text-subtitle-2">{{ currentTournament.name }}</div>
        <div class="text-caption">
          <v-icon size="small" start>mdi-calendar-clock</v-icon>
          {{ tournamentStore.getRemainingDays(currentTournament.id) }} days remaining
        </div>
      </v-alert>

      <!-- Navigation List -->
      <v-list class="app__nav-list">
        <v-list-item v-for="item in navigationItems" :key="item.title" :to="item.route"
          :active-class="'app__nav-item--active'" class="app__nav-item">
          <template v-slot:prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
          <!-- Badge for pending jobs -->
          <template v-if="item.title === 'String Jobs' && pendingJobsCount > 0" v-slot:append>
            <v-badge color="warning" :content="pendingJobsCount"></v-badge>
          </template>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="app__drawer-footer">
          <v-divider></v-divider>
          <div class="app__user-info" v-if="authStore.user">
            <v-avatar color="secondary" size="40" class="app__user-avatar">
              {{ userInitials }}
            </v-avatar>
            <div class="app__user-details">
              <div class="app__user-name">{{ userName }}</div>
              <div class="app__user-role">{{ userRole }}</div>
            </div>
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main class="app__main">
      <RouterView />
    </v-main>

    <!-- Global Loading Overlay -->
    <v-overlay v-if="authStore.loading" class="align-center justify-center">
      <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
    </v-overlay>
  </v-app>

  <!-- Simple layout for non-authenticated routes (like landing page) -->
  <RouterView v-else />
</template>

<style lang="scss" scoped>
.app {
  &__title {
    color: white;
    font-size: 1.25rem;
  }

  &__drawer {
    &-header {
      padding: $spacing-md $spacing-lg;
      height: 64px;
      @include flex-center;
    }

    &-footer {
      padding: $spacing-md;
    }
  }

  &__logo {
    &-container {
      @include flex(row, flex-start, center);
      gap: $spacing-sm;
    }

    &-text {
      color: $primary;
      font-size: 1.25rem;
      font-weight: $font-weight-bold;
      margin: 0;
    }
  }

  &__nav {
    &-item {
      padding: $spacing-md $spacing-lg;
      border-radius: 0;
      @include transition;

      &:hover {
        background-color: rgba($primary, 0.05);
      }

      &--active {
        background-color: rgba($primary, 0.1) !important;
        border-left: 3px solid $primary;

        :deep(.v-list-item-title) {
          color: $primary;
          font-weight: $font-weight-medium;
        }

        :deep(.v-icon) {
          color: $primary;
        }
      }
    }

    &-btn {
      margin: 0 $spacing-xs;
    }
  }

  &__main {
    background-color: $bg-light;
  }

  &__user {
    &-btn {
      margin-left: $spacing-sm;
      text-transform: none;
      letter-spacing: normal;
    }

    &-avatar {
      font-size: $font-size-sm;
    }

    &-name {
      font-weight: $font-weight-medium;
      font-size: $font-size-md;
      color: $text-primary;
      @include text-truncate;
    }

    &-role {
      font-size: $font-size-sm;
      color: $text-secondary;
    }

    &-info {
      @include flex(row, flex-start, center);
      padding: $spacing-md;
      gap: $spacing-md;
    }

    &-details {
      @include flex(column, center, flex-start);
      overflow: hidden;
    }
  }
}

// Mobile adaptations
@media (max-width: $breakpoint-sm) {
  .app {
    &__drawer {
      width: 256px !important;
    }
  }
}
</style>