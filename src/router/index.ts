import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LandingPage from '../views/LandingPage.vue'
import StringJobsView from '@/views/StringJobsView.vue'

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
      path: '/stringjobs',
      name: 'stringjobs',
      component: StringJobsView,
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
    // Otherwise proceed normally
    next();
  }
})

export default router