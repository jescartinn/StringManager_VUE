import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/DashboardView.vue'
import LandingPage from '@/views/LandingPage.vue'
import StringJobsView from '@/views/StringJobsView.vue'
import StringJobForm from '@/components/StringJobForm.vue'
import StringJobDetails from '@/components/StringJobDetails.vue'
import PlayersView from '@/views/PlayersView.vue'
import PlayerDetails from '@/components/PlayerDetails.vue'
import RacquetsView from '@/views/RacquetsView.vue'
import RacquetDetails from '@/components/RacquetDetails.vue'
import StringsView from '@/views/StringsView.vue'
import StringersView from '@/views/StringersView.vue'
import StringerDetails from '@/components/StringerDetails.vue'
import TournamentsView from '@/views/TournamentsView.vue'
import TournamentDetails from '@/components/TournamentDetails.vue'
import ReportsView from '@/views/ReportsView.vue'
import ProfileView from '@/views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingPage,
      meta: { requiresAuth: false }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true }
    },
    {
      path: '/jobs',
      name: 'jobs',
      component: StringJobsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/jobs/new',
      name: 'new-job',
      component: StringJobForm,
      meta: { requiresAuth: true }
    },
    {
      path: '/jobs/:id',
      name: 'job-details',
      component: StringJobDetails,
      meta: { requiresAuth: true }
    },
    {
      path: '/jobs/edit/:id',
      name: 'edit-job',
      component: StringJobForm,
      meta: { requiresAuth: true }
    },
    {
      path: '/players',
      name: 'players',
      component: PlayersView,
      meta: { requiresAuth: true }
    },
    {
      path: '/players/:id',
      name: 'player-details',
      component: PlayerDetails,
      meta: { requiresAuth: true }
    },
    {
      path: '/racquets',
      name: 'racquets',
      component: RacquetsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/racquets/:id',
      name: 'racquet-details',
      component: RacquetDetails,
      meta: { requiresAuth: true }
    },
    {
      path: '/strings',
      name: 'strings',
      component: StringsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/stringers',
      name: 'stringers',
      component: StringersView,
      meta: { requiresAuth: true }
    },
    {
      path: '/stringers/:id',
      name: 'stringer-details',
      component: StringerDetails,
      meta: { requiresAuth: true }
    },
    {
      path: '/tournaments',
      name: 'tournaments',
      component: TournamentsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/tournaments/:id',
      name: 'tournament-details',
      component: TournamentDetails,
      meta: { requiresAuth: true }
    },
    {
      path: '/reports',
      name: 'reports',
      component: ReportsView,
      meta: { requiresAuth: true }
    },

    // Catch-all route to redirect to landing page
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// Navigation guard to check authentication for protected routes
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false; // Default to requiring auth if not specified
  const isAuthenticated = localStorage.getItem('token') !== null;

  if (requiresAuth && !isAuthenticated) {
    // If route requires auth but user is not authenticated, redirect to landing
    next({ name: 'landing' });
  } else if (!requiresAuth && isAuthenticated) {
    // If user is already authenticated and tries to access landing page, redirect to dashboard
    next({ name: 'dashboard' });
  } else {
    next();
  }
})

export default router