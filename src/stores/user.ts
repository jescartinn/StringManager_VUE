import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/apiService'
import { useAuthStore } from './auth'

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

export interface CreateUserDTO {
  username: string
  email: string
  password: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  const users = ref<User[]>([])
  const currentUser = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

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

  const getUserById = (id: number) => {
    return users.value.find(user => user.id === id) || null
  }

  async function fetchAllUsers() {
    if (!canManageUsers.value) {
      error.value = 'Unauthorized: Only administrators can access user list'
      return []
    }

    if (users.value.length > 0 && initialized.value) {
      return users.value
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
    if (!forceRefresh) {
      const existingUser = getUserById(id)
      if (existingUser) {
        currentUser.value = existingUser
        return existingUser
      }
    }

    if (!canManageUsers.value && authStore.user?.id !== id) {
      error.value = 'Unauthorized: You can only access your own user details'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const user = await api.users.getById(id)
      currentUser.value = user

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
    if (!canManageUsers.value && authStore.user?.id !== id) {
      error.value = 'Unauthorized: You can only update your own user details'
      return false
    }

    if (!canManageUsers.value && userData.role !== authStore.user?.role) {
      error.value = 'Unauthorized: You cannot change your role'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const completeUserData = {
        id: id,
        username: userData.username,
        email: userData.email,
        role: userData.role
      }

      await api.users.update(id, completeUserData)

      const index = users.value.findIndex(user => user.id === id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...userData }
      }

      if (currentUser.value && currentUser.value.id === id) {
        currentUser.value = { ...currentUser.value, ...userData }
      }

      if (authStore.user && authStore.user.id === id) {
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
    if (!canManageUsers.value) {
      error.value = 'Unauthorized: Only administrators can delete users'
      return false
    }

    if (authStore.user?.id === id) {
      error.value = 'Cannot delete your own account'
      return false
    }

    loading.value = true
    error.value = null

    try {
      await api.users.delete(id)

      users.value = users.value.filter(user => user.id !== id)

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

  async function createUser(userData: CreateUserDTO) {
    if (!canManageUsers.value) {
      error.value = 'Unauthorized: Only administrators can create users'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const newUser = await api.users.create(userData)
      users.value.push(newUser)
      return newUser
    } catch (e) {
      console.error('Error creating user:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create user'
      return null
    } finally {
      loading.value = false
    }
  }

  async function changeUserPassword(id: number, newPassword: string) {
    if (!canManageUsers.value) {
      error.value = 'Unauthorized: Only administrators can change user passwords'
      return false
    }

    loading.value = true
    error.value = null

    try {
      await api.users.changeUserPassword(id, newPassword)
      return true
    } catch (e) {
      console.error(`Error changing password for user ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to change password for user #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  async function changeUserRole(id: number, role: string) {
    if (!canManageUsers.value) {
      error.value = 'Unauthorized: Only administrators can change user roles'
      return false
    }

    loading.value = true
    error.value = null

    try {
      await api.users.changeUserRole(id, role)

      const index = users.value.findIndex(user => user.id === id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], role }
      }

      if (currentUser.value && currentUser.value.id === id) {
        currentUser.value = { ...currentUser.value, role }
      }

      return true
    } catch (e) {
      console.error(`Error changing role for user ${id}:`, e)
      error.value = e instanceof Error ? e.message : `Failed to change role for user #${id}`
      return false
    } finally {
      loading.value = false
    }
  }

  function clearCurrentUser() {
    currentUser.value = null
  }

  function reset() {
    users.value = []
    currentUser.value = null
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    users,
    currentUser,
    loading,
    error,
    initialized,
    userCount,
    adminUsers,
    stringerUsers,
    regularUsers,
    canManageUsers,

    getUserById,
    fetchAllUsers,
    fetchUserById,
    updateUser,
    deleteUser,
    clearCurrentUser,
    createUser,
    changeUserPassword,
    changeUserRole,
    reset
  }
})