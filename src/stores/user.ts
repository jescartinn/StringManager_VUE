import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'
import { useAuthStore } from './auth'

// Define types
interface User {
  id: number
  username: string
  email: string
  role: string
  createdAt: string
  lastLoginAt?: string | null
}

interface UpdateUserDTO {
  username: string
  email: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  // Get auth store for checking permissions
  const authStore = useAuthStore()
  
  // State
  const users = ref<User[]>([])
  const currentUser = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Computed
  const userCount = computed(() => users.value.length)
  
  const adminUsers = computed(() => 
    users.value.filter(user => user.role === 'Admin')
  )
  
  const stringerUsers = computed(() => 
    users.value.filter(user => user.role === 'Stringer')
  )
  
  const regularUsers = computed(() => 
    users.value.filter(user => user.role === 'User')
  )
  
  const canManageUsers = computed(() => 
    authStore.isAuthenticated && authStore.isAdmin
  )

  // Helper to get user by id directly from store
  const getUserById = (id: number) => {
    return users.value.find(user => user.id === id) || null
  }

  // Actions
  async function fetchAllUsers() {
    // Only allow admin users to list all users
    if (!canManageUsers.value) {
      error.value = 'Unauthorized: Only administrators can access user list'
      return []
    }
    
    if (users.value.length > 0 && initialized.value) {
      return users.value // Return cached data if already fetched
    }
    
    loading.value = true
    error.value = null
    
    try {
      users.value = await api.users.getAll()
      initialized.value = true
      return users.value
    } catch (e) {
      console.error('Error fetching users:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch users'
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchUserById(id: number, forceRefresh = false) {
    // If we already have the user and aren't forcing a refresh, return the cached version
    if (!forceRefresh) {
      const existingUser = getUserById(id)
      if (existingUser) {
        currentUser.value = existingUser
        return existingUser
      }
    }
    
    // Check if the current user is admin or fetching their own record
    if (!canManageUsers.value && authStore.user?.id !== id) {
      error.value = 'Unauthorized: You can only access your own user details'
      return null
    }
    
    loading.value = true
    error.value = null
    
    try {
      const user = await api.users.getById(id)
      currentUser.value = user
      
      // Update the user in our local cache
      const index = users.value.findIndex(u => u.id === id)
      if (index !== -1) {
        users.value[index] = user
      } else {
        users.value.push(user)
      }
      
      return user
    } catch (e) {
      console.error(`Error fetching user ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to fetch user #${id}`
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: number, userData: UpdateUserDTO) {
    // Check if the current user is admin or updating their own record
    if (!canManageUsers.value && authStore.user?.id !== id) {
      error.value = 'Unauthorized: You can only update your own user details'
      return false
    }
    
    // Regular users can't change their role
    if (!canManageUsers.value && userData.role !== authStore.user?.role) {
      error.value = 'Unauthorized: You cannot change your role'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      await api.users.update(id, userData)
      
      // Update the user in the local state
      const index = users.value.findIndex(user => user.id === id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...userData }
      }
      
      // Also update currentUser if it's the one being updated
      if (currentUser.value && currentUser.value.id === id) {
        currentUser.value = { ...currentUser.value, ...userData }
      }
      
      // If the user updated their own profile, update the auth store
      if (authStore.user && authStore.user.id === id) {
        // Use auth store's own method to refresh user data
        await authStore.checkAuth()
      }
      
      return true
    } catch (e) {
      console.error(`Error updating user ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to update user #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id: number) {
    // Only admins can delete users
    if (!canManageUsers.value) {
      error.value = 'Unauthorized: Only administrators can delete users'
      return false
    }
    
    // Prevent deleting own account
    if (authStore.user?.id === id) {
      error.value = 'Cannot delete your own account'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      await api.users.delete(id)
      
      // Remove the user from the local state
      users.value = users.value.filter(user => user.id !== id)
      
      // Clear currentUser if it's the one being deleted
      if (currentUser.value && currentUser.value.id === id) {
        currentUser.value = null
      }
      
      return true
    } catch (e) {
      console.error(`Error deleting user ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to delete user #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  // Clear the current user selection
  function clearCurrentUser() {
    currentUser.value = null
  }

  // Reset store state
  function reset() {
    users.value = []
    currentUser.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    // State
    users,
    currentUser,
    loading,
    error,
    initialized,
    
    // Getters/Computed
    userCount,
    adminUsers,
    stringerUsers,
    regularUsers,
    canManageUsers,
    getUserById,
    
    // Actions
    fetchAllUsers,
    fetchUserById,
    updateUser,
    deleteUser,
    clearCurrentUser,
    reset
  }
})