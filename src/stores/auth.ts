import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/apiService'

// Define the User type
interface User {
    id: number
    username: string
    email: string
    role: string
    createdAt: string
    lastLoginAt: string | null
}

// Define the auth response type
interface AuthResponse {
    token: string
    user: User
    expiration: string
}

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()

    // State
    const token = ref<string | null>(localStorage.getItem('token'))
    const user = ref<User | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Try to load user from localStorage on initialization
    try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            user.value = JSON.parse(storedUser)
        }
    } catch (e) {
        console.error('Failed to parse stored user data', e)
    }

    // Getters
    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => user.value?.role === 'Admin')
    const isStringer = computed(() => user.value?.role === 'Stringer' || user.value?.role === 'Admin')

    // Actions
    async function login(username: string, password: string) {
        loading.value = true
        error.value = null

        try {
            // Make API request to login endpoint
            const data = await api.auth.login(username, password)

            // Save auth data
            token.value = data.token
            user.value = data.user

            // Save to localStorage
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data.user))

            // Navigate to dashboard
            router.push('/dashboard')
            return true
        } catch (e) {
            console.error('Login error:', e)
            error.value = e instanceof Error ? e.message : 'Invalid credentials. Please try again.'
            return false
        } finally {
            loading.value = false
        }
    }

    async function register(registerData: {
        username: string,
        email: string,
        password: string,
        confirmPassword: string
    }) {
        loading.value = true
        error.value = null

        try {
            // Make API request to register endpoint
            const data = await api.auth.register(registerData)

            // Save auth data
            token.value = data.token
            user.value = data.user

            // Save to localStorage
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data.user))

            // Navigate to dashboard
            router.push('/dashboard')
            return true
        } catch (e) {
            console.error('Registration error:', e)
            error.value = e instanceof Error ? e.message : 'Registration failed. Please try again.'
            return false
        } finally {
            loading.value = false
        }
    }

    async function checkAuth() {
        if (!token.value) return false

        loading.value = true

        try {
            // Verify token by fetching current user
            const userData = await api.auth.getCurrentUser()
            user.value = userData
            localStorage.setItem('user', JSON.stringify(userData))
            return true
        } catch (e) {
            console.error('Token validation error:', e)
            // If token is invalid, logout
            logout()
            return false
        } finally {
            loading.value = false
        }
    }

    function logout() {
        // Clear state
        token.value = null
        user.value = null

        // Clear localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        // Navigate to landing page
        router.push('/')
    }

    async function changePassword(currentPassword: string, newPassword: string) {
        loading.value = true
        error.value = null

        try {
            await api.auth.changePassword({
                currentPassword,
                newPassword,
                confirmPassword: newPassword
            })
            return true
        } catch (e) {
            console.error('Change password error:', e)
            error.value = e instanceof Error ? e.message : 'Failed to change password. Please try again.'
            return false
        } finally {
            loading.value = false
        }
    }

    // New method for updating profile
    async function updateProfile(profileData: { username: string, email: string }) {
        loading.value = true
        error.value = null

        try {
            // Check if user exists and has an ID
            if (!user.value || !user.value.id) {
                throw new Error('User information is missing')
            }

            // Create a user DTO that includes the current user's data
            const userDto = {
                id: user.value.id,
                username: profileData.username,
                email: profileData.email,
                role: user.value.role
            }

            // Update the user profile using the API
            await api.users.update(user.value.id, userDto)

            // Update the local user object
            if (user.value) {
                user.value.username = profileData.username
                user.value.email = profileData.email

                // Save updated user to localStorage
                localStorage.setItem('user', JSON.stringify(user.value))
            }

            return true
        } catch (e) {
            console.error('Update profile error:', e)
            error.value = e instanceof Error ? e.message : 'Failed to update profile. Please try again.'
            return false
        } finally {
            loading.value = false
        }
    }

    return {
        // State
        token,
        user,
        loading,
        error,

        // Getters
        isAuthenticated,
        isAdmin,
        isStringer,

        // Actions
        login,
        register,
        logout,
        checkAuth,
        changePassword,
        updateProfile
    }
})