<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore, useAuthStore } from '../stores'

const userStore = useUserStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const showEditUserDialog = ref(false)
const showDeleteConfirmation = ref(false)
const showChangePasswordDialog = ref(false)

const userId = computed(() => {
    return route.params.id ? parseInt(route.params.id as string) : null
})

const user = computed(() => userStore.currentUser)

const userForm = ref({
    id: null as number | null,
    username: '',
    email: '',
    role: '',
    newPassword: '',
    confirmPassword: ''
})

const formErrors = ref({
    username: '',
    email: '',
    role: '',
    newPassword: '',
    confirmPassword: ''
})

const roleOptions = [
    { title: 'User', value: 'User' },
    { title: 'Stringer', value: 'Stringer' },
    { title: 'Admin', value: 'Admin' }
]

const canManageUsers = computed(() => {
    return authStore.isAdmin
})

onMounted(async () => {
    if (userId.value) {
        try {
            await userStore.fetchUserById(userId.value)
        } catch (error) {
            console.error('Error loading user details:', error)
        } finally {
            loading.value = false
        }
    } else {
        router.replace('/users')
    }
})

watch(() => userId.value, async (newUserId) => {
    if (newUserId) {
        loading.value = true

        try {
            await userStore.fetchUserById(newUserId)
        } catch (error) {
            console.error('Error loading user details:', error)
        } finally {
            loading.value = false
        }
    }
})

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
}

const getRoleColor = (role: string) => {
    switch (role) {
        case 'Admin': return 'error'
        case 'Stringer': return 'warning'
        case 'User': return 'success'
        default: return 'grey'
    }
}

const goBack = () => {
    router.back()
}

const returnToUsersList = () => {
    router.push('/users')
}

const openEditUserDialog = () => {
    if (!user.value) return

    userForm.value = {
        id: user.value.id,
        username: user.value.username,
        email: user.value.email,
        role: user.value.role,
        newPassword: '',
        confirmPassword: ''
    }

    formErrors.value = {
        username: '',
        email: '',
        role: '',
        newPassword: '',
        confirmPassword: ''
    }

    showEditUserDialog.value = true
}

const openChangePasswordDialog = () => {
    if (!user.value) return

    userForm.value = {
        id: user.value.id,
        username: user.value.username,
        email: user.value.email,
        role: user.value.role,
        newPassword: '',
        confirmPassword: ''
    }

    formErrors.value = {
        username: '',
        email: '',
        role: '',
        newPassword: '',
        confirmPassword: ''
    }

    showChangePasswordDialog.value = true
}

const openDeleteDialog = () => {
    showDeleteConfirmation.value = true
}

const validateUserForm = () => {
    let isValid = true

    if (!userForm.value.username.trim()) {
        formErrors.value.username = 'Username is required'
        isValid = false
    } else if (userForm.value.username.trim().length < 3) {
        formErrors.value.username = 'Username must be at least 3 characters'
        isValid = false
    } else {
        formErrors.value.username = ''
    }

    if (!userForm.value.email.trim()) {
        formErrors.value.email = 'Email is required'
        isValid = false
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(userForm.value.email)) {
            formErrors.value.email = 'Please enter a valid email address'
            isValid = false
        } else {
            formErrors.value.email = ''
        }
    }

    if (!userForm.value.role) {
        formErrors.value.role = 'Role is required'
        isValid = false
    } else {
        formErrors.value.role = ''
    }

    return isValid
}

const validatePasswordForm = () => {
    let isValid = true

    if (!userForm.value.newPassword) {
        formErrors.value.newPassword = 'New password is required'
        isValid = false
    } else if (userForm.value.newPassword.length < 8) {
        formErrors.value.newPassword = 'Password must be at least 8 characters'
        isValid = false
    } else {
        formErrors.value.newPassword = ''
    }

    if (!userForm.value.confirmPassword) {
        formErrors.value.confirmPassword = 'Please confirm the password'
        isValid = false
    } else if (userForm.value.confirmPassword !== userForm.value.newPassword) {
        formErrors.value.confirmPassword = 'Passwords do not match'
        isValid = false
    } else {
        formErrors.value.confirmPassword = ''
    }

    return isValid
}

const submitEditUser = async () => {
    if (!validateUserForm() || !userForm.value.id) return

    try {
        await userStore.updateUser(userForm.value.id, {
            username: userForm.value.username,
            email: userForm.value.email,
            role: userForm.value.role
        })

        showEditUserDialog.value = false
    } catch (error) {
        console.error('Error updating user:', error)
    }
}

const submitChangePassword = async () => {
    if (!validatePasswordForm() || !userForm.value.id) return

    try {
        // This would need to be implemented in the backend
        console.log('Changing password for user:', userForm.value.id)
        showChangePasswordDialog.value = false
    } catch (error) {
        console.error('Error changing password:', error)
    }
}

const deleteUser = async () => {
    if (!user.value) return

    try {
        const result = await userStore.deleteUser(user.value.id)
        if (result) {
            showDeleteConfirmation.value = false
            router.push('/users')
        }
    } catch (error) {
        console.error('Error deleting user:', error)
    }
}
</script>

<template>
    <div class="user-details">
        <v-container class="user-details__container">

            <!-- Page Header with Navigation -->
            <v-row>
                <v-col cols="12" sm="8">
                    <div class="d-flex align-center">
                        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-2"></v-btn>
                        <h1 class="user-details__title" v-if="user">
                            {{ user.username }}
                        </h1>
                    </div>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex justify-end align-center">
                    <v-btn color="primary" prepend-icon="mdi-format-list-bulleted" @click="returnToUsersList">
                        All Users
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-row class="mb-3" v-if="userStore.error">
                <v-col cols="12">
                    <v-alert type="error" variant="tonal" closable>
                        {{ userStore.error }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Loading State -->
            <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </div>

            <!-- User Not Found -->
            <v-card v-else-if="!user" class="text-center pa-8 mb-6 mt-6">
                <v-icon icon="mdi-alert-circle" size="64" color="warning" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">User Not Found</h3>
                <p class="mb-6">The requested user could not be found or you don't have permission to view it.</p>
                <v-btn color="primary" @click="returnToUsersList">Return to Users List</v-btn>
            </v-card>

            <!-- User Details Content -->
            <div v-else class="user-details__content">

                <!-- User Information Card -->
                <v-card class="mb-6">
                    <v-card-title class="user-details__section-title">
                        <v-icon start>mdi-account</v-icon>
                        User Information
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <v-row>
                            <v-col cols="12" md="6">
                                <div class="user-details__info-section">
                                    <div class="user-details__info-item">
                                        <span class="user-details__info-label">Username:</span>
                                        <span class="user-details__info-value">{{ user.username }}</span>
                                    </div>

                                    <div class="user-details__info-item">
                                        <span class="user-details__info-label">Email:</span>
                                        <span class="user-details__info-value">
                                            <a :href="`mailto:${user.email}`" class="user-details__info-link">
                                                {{ user.email }}
                                            </a>
                                        </span>
                                    </div>

                                    <div class="user-details__info-item">
                                        <span class="user-details__info-label">Role:</span>
                                        <v-chip :color="getRoleColor(user.role)" size="small" text-color="white"
                                            class="ml-0">
                                            {{ user.role }}
                                        </v-chip>
                                    </div>
                                </div>
                            </v-col>

                            <v-col cols="12" md="6">
                                <div class="user-details__info-section">
                                    <div class="user-details__info-item">
                                        <span class="user-details__info-label">Account Created:</span>
                                        <span class="user-details__info-value">{{ formatDate(user.createdAt) }}</span>
                                    </div>

                                    <div class="user-details__info-item">
                                        <span class="user-details__info-label">Last Login:</span>
                                        <span class="user-details__info-value">
                                            {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}
                                        </span>
                                    </div>

                                    <div class="user-details__info-item">
                                        <span class="user-details__info-label">User ID:</span>
                                        <span class="user-details__info-value">#{{ user.id }}</span>
                                    </div>
                                </div>
                            </v-col>
                        </v-row>

                        <v-divider class="my-4"></v-divider>

                        <div class="d-flex justify-end" v-if="canManageUsers">
                            <v-btn color="primary" variant="text" prepend-icon="mdi-pencil" class="mr-2"
                                @click="openEditUserDialog">
                                Edit User
                            </v-btn>
                            <v-btn color="warning" variant="text" prepend-icon="mdi-lock-reset" class="mr-2"
                                @click="openChangePasswordDialog">
                                Change Password
                            </v-btn>
                            <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="openDeleteDialog">
                                Delete User
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- User Activity Summary -->
                <v-card class="mb-6">
                    <v-card-title class="user-details__section-title">
                        <v-icon start>mdi-chart-box</v-icon>
                        Account Summary
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <v-row>
                            <v-col cols="12" sm="6" md="3">
                                <div class="user-details__stat-card">
                                    <div class="user-details__stat-value">{{ user.role }}</div>
                                    <div class="user-details__stat-label">Current Role</div>
                                </div>
                            </v-col>

                            <v-col cols="12" sm="6" md="3">
                                <div class="user-details__stat-card">
                                    <div class="user-details__stat-value">Active</div>
                                    <div class="user-details__stat-label">Account Status</div>
                                </div>
                            </v-col>

                            <v-col cols="12" sm="6" md="3">
                                <div class="user-details__stat-card">
                                    <div class="user-details__stat-value">{{ formatDate(user.createdAt) }}</div>
                                    <div class="user-details__stat-label">Member Since</div>
                                </div>
                            </v-col>

                            <v-col cols="12" sm="6" md="3">
                                <div class="user-details__stat-card">
                                    <div class="user-details__stat-value">
                                        {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}
                                    </div>
                                    <div class="user-details__stat-label">Last Access</div>
                                </div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Permissions Overview -->
                <v-card>
                    <v-card-title class="user-details__section-title">
                        <v-icon start>mdi-shield-check</v-icon>
                        Role Permissions
                    </v-card-title>

                    <v-card-text class="pa-4">
                        <div v-if="user.role === 'Admin'" class="user-details__permissions">
                            <v-chip color="success" size="small" class="mr-2 mb-2">Full System Access</v-chip>
                            <v-chip color="success" size="small" class="mr-2 mb-2">User Management</v-chip>
                            <v-chip color="success" size="small" class="mr-2 mb-2">Tournament Management</v-chip>
                            <v-chip color="success" size="small" class="mr-2 mb-2">Reports & Analytics</v-chip>
                            <v-chip color="success" size="small" class="mr-2 mb-2">Payment Management</v-chip>
                            <v-chip color="success" size="small" class="mr-2 mb-2">String Job Management</v-chip>
                        </div>

                        <div v-else-if="user.role === 'Stringer'" class="user-details__permissions">
                            <v-chip color="warning" size="small" class="mr-2 mb-2">String Job Management</v-chip>
                            <v-chip color="warning" size="small" class="mr-2 mb-2">Player Management</v-chip>
                            <v-chip color="warning" size="small" class="mr-2 mb-2">Racquet Management</v-chip>
                            <v-chip color="warning" size="small" class="mr-2 mb-2">String Management</v-chip>
                        </div>

                        <div v-else class="user-details__permissions">
                            <v-chip color="info" size="small" class="mr-2 mb-2">View Dashboard</v-chip>
                            <v-chip color="info" size="small" class="mr-2 mb-2">View String Jobs</v-chip>
                            <v-chip color="info" size="small" class="mr-2 mb-2">Profile Management</v-chip>
                        </div>

                        <p class="text-caption text-grey mt-4">
                            Permissions are automatically assigned based on the user's role.
                            Contact an administrator to modify user roles.
                        </p>
                    </v-card-text>
                </v-card>
            </div>
        </v-container>

        <!-- Edit User Dialog -->
        <v-dialog v-model="showEditUserDialog" max-width="600px">
            <v-card>
                <v-card-title class="text-h5 bg-primary text-white">Edit User</v-card-title>
                <v-card-text class="pt-4">
                    <v-form @submit.prevent="submitEditUser">
                        <v-text-field v-model="userForm.username" label="Username" :error-messages="formErrors.username"
                            required variant="outlined" density="comfortable" class="mb-3"></v-text-field>

                        <v-text-field v-model="userForm.email" label="Email" type="email"
                            :error-messages="formErrors.email" required variant="outlined" density="comfortable"
                            class="mb-3"></v-text-field>

                        <v-select v-model="userForm.role" label="Role" :items="roleOptions" item-title="title"
                            item-value="value" :error-messages="formErrors.role" required variant="outlined"
                            density="comfortable" class="mb-3"></v-select>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showEditUserDialog = false">Cancel</v-btn>
                    <v-btn color="primary" @click="submitEditUser" :loading="userStore.loading">Update User</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Change Password Dialog -->
        <v-dialog v-model="showChangePasswordDialog" max-width="500px">
            <v-card>
                <v-card-title class="text-h5 bg-warning text-white">Change User Password</v-card-title>
                <v-card-text class="pt-4">
                    <p class="mb-4">Change password for: <strong>{{ user?.username }}</strong></p>
                    <v-form @submit.prevent="submitChangePassword">
                        <v-text-field v-model="userForm.newPassword" label="New Password" type="password"
                            :error-messages="formErrors.newPassword" required variant="outlined" density="comfortable"
                            class="mb-3"></v-text-field>

                        <v-text-field v-model="userForm.confirmPassword" label="Confirm New Password" type="password"
                            :error-messages="formErrors.confirmPassword" required variant="outlined"
                            density="comfortable" class="mb-3"></v-text-field>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showChangePasswordDialog = false">Cancel</v-btn>
                    <v-btn color="warning" @click="submitChangePassword" :loading="userStore.loading">Change
                        Password</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Delete Confirmation Dialog -->
        <v-dialog v-model="showDeleteConfirmation" max-width="500px">
            <v-card>
                <v-card-title class="text-h5 bg-error text-white">Delete User</v-card-title>
                <v-card-text class="pt-4">
                    <p>Are you sure you want to delete this user?</p>
                    <p class="font-weight-bold">{{ user?.username }} ({{ user?.email }})</p>
                    <p class="text-caption text-grey mt-4">
                        This action cannot be undone. The user will lose access to the system immediately.
                    </p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showDeleteConfirmation = false">Cancel</v-btn>
                    <v-btn color="error" @click="deleteUser" :loading="userStore.loading">Delete User</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style lang="scss" scoped>
.user-details {
    &__container {
        padding: $spacing-lg;
        max-width: 100%;
    }

    &__title {
        @include heading-1;
        color: $primary;
        margin-bottom: 0;
    }

    &__content {
        margin-top: $spacing-lg;
    }

    &__section-title {
        @include heading-3;
        padding: $spacing-md $spacing-lg;
        background-color: rgba($primary, 0.05);
        border-bottom: 1px solid rgba($primary, 0.1);
    }

    &__info {
        &-section {
            padding: $spacing-md 0;
        }

        &-item {
            margin-bottom: $spacing-md;

            &:last-child {
                margin-bottom: 0;
            }
        }

        &-label {
            font-weight: $font-weight-medium;
            color: $text-secondary;
            display: block;
            margin-bottom: $spacing-xs;
        }

        &-value {
            font-size: $font-size-md;
        }

        &-link {
            color: $primary;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    &__stat {
        &-card {
            background-color: rgba($primary, 0.05);
            border-radius: $border-radius-md;
            padding: $spacing-md;
            text-align: center;
            height: 100%;
        }

        &-value {
            font-size: 1.5rem;
            font-weight: $font-weight-bold;
            margin-bottom: $spacing-xs;
            color: $primary;
        }

        &-label {
            font-size: $font-size-sm;
            color: $text-secondary;
        }
    }

    &__permissions {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-xs;
    }
}
</style>