import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/apiService'

interface User {
    id: number
    username: string
    email: string
    role: string
    createdAt: string
    lastLoginAt: string | null
}

export const useAuthStore = defineStore('auth', () => {
    const router = useRouter()

    const token = ref<string | null>(localStorage.getItem('token'))
    const user = ref<User | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            user.value = JSON.parse(storedUser)
        }
    } catch (e) {
        console.error('Failed to parse stored user data', e)
    }

    const isAuthenticated = computed(() => !!token.value)
    const isAdmin = computed(() => user.value?.role === 'Admin')
    const isStringer = computed(() => user.value?.role === 'Stringer' || user.value?.role === 'Admin')

    async function login(username: string, password: string) {
        loading.value = true
        error.value = null

        try {
            const data = await api.auth.login(username, password)

            token.value = data.token
            user.value = data.user

            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data.user))

            router.push('/dashboard')
            return true
        } catch (e) {
            console.error('Login error:', e)
            error.value = e instanceof Error ? e.message : 'Credenciales inválidas.'
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
            const data = await api.auth.register(registerData)

            token.value = data.token
            user.value = data.user

            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(data.user))

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
            const userData = await api.auth.getCurrentUser()
            user.value = userData
            localStorage.setItem('user', JSON.stringify(userData))
            return true
        } catch (e) {
            console.error('Token validation error:', e)
            logout()
            return false
        } finally {
            loading.value = false
        }
    }

    function logout() {
        token.value = null
        user.value = null

        localStorage.removeItem('token')
        localStorage.removeItem('user')

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

    async function updateProfile(profileData: { username: string, email: string }) {
        loading.value = true
        error.value = null

        try {
            if (!user.value || !user.value.id) {
                throw new Error('User information is missing')
            }

            const userDto = {
                id: user.value.id,
                username: profileData.username,
                email: profileData.email,
                role: user.value.role
            }

            await api.users.update(user.value.id, userDto)

            if (user.value) {
                user.value.username = profileData.username
                user.value.email = profileData.email

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

    async function refreshUserData() {
        if (!isAuthenticated.value) return false;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.auth.refreshUserData();

            token.value = response.token;
            user.value = response.user;

            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            return true;
        } catch (e) {
            console.error('Error refreshing user data:', e);
            error.value = e instanceof Error ? e.message : 'Failed to refresh user data';
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function checkForRoleChanges() {
        try {
            const currentUser = await api.auth.getCurrentUser();

            if (user.value && currentUser.role !== user.value.role) {
                await refreshUserData();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking role changes:', error);
            return false;
        }
    }

    return {
        token,
        user,
        loading,
        error,

        isAuthenticated,
        isAdmin,
        isStringer,

        login,
        register,
        logout,
        checkAuth,
        changePassword,
        updateProfile,
        refreshUserData,
        checkForRoleChanges
    }
})