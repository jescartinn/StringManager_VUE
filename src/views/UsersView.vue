<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useAuthStore } from '../stores'

const userStore = useUserStore()
const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const search = ref('')
const roleFilter = ref<string | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('createdAt')
const sortDesc = ref(true)
const showFilters = ref(false)
const showNewUserDialog = ref(false)
const showEditUserDialog = ref(false)
const showDeleteConfirmation = ref(false)
const showChangePasswordDialog = ref(false)

const userForm = ref({
    id: null as number | null,
    username: '',
    email: '',
    role: 'User',
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

onMounted(async () => {
    try {
        await userStore.fetchAllUsers()
    } catch (error) {
        console.error('Error initializing users view:', error)
    } finally {
        loading.value = false
    }
})

const filteredUsers = computed(() => {
    let filtered = [...userStore.users]

    if (search.value) {
        const searchLower = search.value.toLowerCase()
        filtered = filtered.filter(user => {
            const username = user.username.toLowerCase()
            const email = user.email.toLowerCase()
            return username.includes(searchLower) || email.includes(searchLower)
        })
    }

    if (roleFilter.value) {
        filtered = filtered.filter(user => user.role === roleFilter.value)
    }

    filtered = filtered.filter(user => user.id !== authStore.user?.id)

    filtered.sort((a, b) => {
        let aValue: any, bValue: any;

        if (sortBy.value === 'username') {
            aValue = a.username
            bValue = b.username
        } else if (sortBy.value === 'email') {
            aValue = a.email
            bValue = b.email
        } else if (sortBy.value === 'role') {
            aValue = a.role
            bValue = b.role
        } else if (sortBy.value === 'createdAt') {
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
        } else {
            aValue = a[sortBy.value as keyof typeof a]
            bValue = b[sortBy.value as keyof typeof b]
        }

        if (aValue === null || aValue === undefined) return sortDesc.value ? 1 : -1
        if (bValue === null || bValue === undefined) return sortDesc.value ? -1 : 1

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDesc.value ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue)
        }

        return sortDesc.value ? (bValue as number) - (aValue as number) : (aValue as number) - (bValue as number)
    })

    return filtered
})

const paginatedUsers = computed(() => {
    const start = (page.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredUsers.value.slice(start, end)
})

const totalPages = computed(() => {
    return Math.ceil(filteredUsers.value.length / itemsPerPage.value)
})

const resetAndReload = async () => {
    search.value = ''
    roleFilter.value = null
    await userStore.fetchAllUsers()
}

const handleSort = (column: string) => {
    if (sortBy.value === column) {
        sortDesc.value = !sortDesc.value
    } else {
        sortBy.value = column
        sortDesc.value = false
    }
}

const openNewUserDialog = () => {
    userForm.value = {
        id: null,
        username: '',
        email: '',
        role: 'User',
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

    showNewUserDialog.value = true
}

const openEditUserDialog = (user: any) => {
    userForm.value = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
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

const openChangePasswordDialog = (user: any) => {
    userForm.value = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
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

const openDeleteDialog = (user: any) => {
    userForm.value = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        newPassword: '',
        confirmPassword: ''
    }

    showDeleteConfirmation.value = true
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

const submitNewUser = async () => {
    if (!validateUserForm()) return

    try {
        const userData = {
            username: userForm.value.username,
            email: userForm.value.email,
            password: userForm.value.newPassword,
            role: userForm.value.role
        }

        const result = await userStore.createUser(userData)
        if (result) {
            showNewUserDialog.value = false
            await userStore.fetchAllUsers()
        }
    } catch (error) {
        console.error('Error creating user:', error)
    }
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
        const result = await userStore.changeUserPassword(userForm.value.id, userForm.value.newPassword)
        if (result) {
            showChangePasswordDialog.value = false
        }
    } catch (error) {
        console.error('Error changing password:', error)
    }
}

const deleteUser = async () => {
    if (!userForm.value.id) return

    try {
        await userStore.deleteUser(userForm.value.id)
        showDeleteConfirmation.value = false
    } catch (error) {
        console.error('Error deleting user:', error)
    }
}

const viewUserDetails = (userId: number) => {
    router.push(`/users/${userId}`)
}

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

    if (showNewUserDialog.value) {
        if (!userForm.value.newPassword) {
            formErrors.value.newPassword = 'Password is required'
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
    }

    return isValid
}

const headers = [
    { title: 'ID', key: 'id', sortable: true },
    { title: 'Username', key: 'username', sortable: true },
    { title: 'Email', key: 'email', sortable: true },
    { title: 'Role', key: 'role', sortable: true },
    { title: 'Created', key: 'createdAt', sortable: true },
    { title: 'Last Login', key: 'lastLoginAt', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false }
]

const showErrorAlert = ref(true)

watch(() => userStore.error, (newError) => {
    if (newError) {
        showErrorAlert.value = true
    }
})
</script>

<template>
    <div class="users-view">
        <v-container class="users-view__container">

            <!-- Page Header -->
            <v-row class="mb-3">
                <v-col cols="12" sm="8">
                    <h1 class="users-view__title">User Management</h1>
                </v-col>
                <v-col cols="12" sm="4" class="d-flex justify-end align-center">
                    <v-btn class="mb-3" color="primary" prepend-icon="mdi-plus" @click="openNewUserDialog">
                        New User
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Error Alert -->
            <v-row class="mb-3" v-if="userStore.error && showErrorAlert">
                <v-col cols="12">
                    <v-alert type="error" variant="tonal" closable v-model="showErrorAlert">
                        {{ userStore.error }}
                    </v-alert>
                </v-col>
            </v-row>

            <!-- Filters and Search -->
            <v-card class="mb-12">
                <v-card-text>
                    <v-row class="align-center">
                        <v-col cols="12" md="9">
                            <v-text-field v-model="search" label="Search by username or email"
                                prepend-inner-icon="mdi-magnify" density="comfortable" hide-details
                                variant="outlined"></v-text-field>
                        </v-col>
                        <v-col cols="6" md="1">
                            <v-btn color="primary" variant="outlined" block @click="showFilters = !showFilters">
                                {{ showFilters ? 'Hide' : 'Filters' }}
                            </v-btn>
                        </v-col>
                        <v-col cols="6" md="2">
                            <v-btn color="primary" variant="outlined" block @click="resetAndReload">
                                Reset
                            </v-btn>
                        </v-col>
                    </v-row>

                    <!-- Expanded Filters -->
                    <v-expand-transition>
                        <div v-if="showFilters">
                            <v-divider class="my-3"></v-divider>
                            <v-row>
                                <v-col cols="12" md="4">
                                    <v-select v-model="roleFilter" label="Role" :items="roleOptions" item-title="title"
                                        item-value="value" variant="outlined" density="comfortable" clearable
                                        hide-details></v-select>
                                </v-col>
                            </v-row>
                        </div>
                    </v-expand-transition>
                </v-card-text>
            </v-card>

            <!-- No results placeholder -->
            <v-card v-if="!loading && filteredUsers.length === 0" class="mb-6 text-center py-8">
                <v-icon icon="mdi-account-question" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
                <h3 class="text-h5 mb-2">No users found</h3>
                <p class="text-body-1 mb-6 text-grey">Try adjusting your filters or add a new user.</p>
                <v-btn color="primary" prepend-icon="mdi-plus" @click="openNewUserDialog">Add New User</v-btn>
            </v-card>

            <!-- Users List Table -->
            <v-card v-else class="mb-6">
                <v-data-table-virtual :headers="headers" :items="paginatedUsers" :items-per-page="itemsPerPage"
                    :page="page" :loading="loading" class="users-view__table" hover
                    @update:options="(options: any) => page = options.page"
                    @click:row="(event: any, { item }: any) => viewUserDetails(item.id)">

                    <!-- Custom Header -->
                    <template v-slot:header.column="{ column }">
                        <div class="d-flex align-center">
                            {{ column.title }}
                            <v-btn v-if="column.key && column.key !== 'actions' && column.sortable"
                                icon="mdi-arrow-up-down" size="small" variant="text"
                                @click.stop="handleSort(column.key)"></v-btn>
                        </div>
                    </template>

                    <!-- Custom Columns -->
                    <template v-slot:item.role="{ item }">
                        <v-chip :color="getRoleColor(item.role)" size="small" text-color="white">
                            {{ item.role }}
                        </v-chip>
                    </template>

                    <template v-slot:item.createdAt="{ item }">
                        {{ formatDate(item.createdAt) }}
                    </template>

                    <template v-slot:item.lastLoginAt="{ item }">
                        {{ item.lastLoginAt ? formatDate(item.lastLoginAt) : 'Never' }}
                    </template>

                    <template v-slot:item.actions="{ item }">
                        <div class="d-flex align-center justify-end" @click.stop>
                            <v-menu>
                                <template v-slot:activator="{ props }">
                                    <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small"></v-btn>
                                </template>
                                <v-list class="pa-0">
                                    <v-list-item @click="viewUserDetails(item.id)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-eye</v-icon>
                                            View Details
                                        </v-list-item-title>
                                    </v-list-item>

                                    <v-divider></v-divider>

                                    <v-list-item @click="openEditUserDialog(item)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-pencil</v-icon>
                                            Edit User
                                        </v-list-item-title>
                                    </v-list-item>

                                    <v-list-item @click="openChangePasswordDialog(item)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-lock-reset</v-icon>
                                            Change Password
                                        </v-list-item-title>
                                    </v-list-item>

                                    <v-list-item @click="openDeleteDialog(item)">
                                        <v-list-item-title>
                                            <v-icon start>mdi-delete</v-icon>
                                            Delete User
                                        </v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </div>
                    </template>
                </v-data-table-virtual>

                <!-- Pagination Controls -->
                <div class="d-flex justify-center align-center pa-4">
                    <v-pagination v-model="page" :length="totalPages" :total-visible="7"
                        density="comfortable"></v-pagination>

                    <v-select v-model="itemsPerPage" :items="[10, 25, 50, 100]" label="Per page" density="compact"
                        class="ms-4" style="max-width: 120px;" hide-details></v-select>
                </div>
            </v-card>
        </v-container>

        <!-- New User Dialog -->
        <v-dialog v-model="showNewUserDialog" max-width="600px">
            <v-card>
                <v-card-title class="text-h5 bg-primary text-white">Add New User</v-card-title>
                <v-card-text class="pt-4">
                    <v-form @submit.prevent="submitNewUser">
                        <v-text-field v-model="userForm.username" label="Username" :error-messages="formErrors.username"
                            required variant="outlined" density="comfortable" class="mb-3"></v-text-field>

                        <v-text-field v-model="userForm.email" label="Email" type="email"
                            :error-messages="formErrors.email" required variant="outlined" density="comfortable"
                            class="mb-3"></v-text-field>

                        <v-select v-model="userForm.role" label="Role" :items="roleOptions" item-title="title"
                            item-value="value" :error-messages="formErrors.role" required variant="outlined"
                            density="comfortable" class="mb-3"></v-select>

                        <v-text-field v-model="userForm.newPassword" label="Password" type="password"
                            :error-messages="formErrors.newPassword" required variant="outlined" density="comfortable"
                            class="mb-3"></v-text-field>

                        <v-text-field v-model="userForm.confirmPassword" label="Confirm Password" type="password"
                            :error-messages="formErrors.confirmPassword" required variant="outlined"
                            density="comfortable" class="mb-3"></v-text-field>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="text" @click="showNewUserDialog = false">Cancel</v-btn>
                    <v-btn color="primary" @click="submitNewUser" :loading="userStore.loading">Create User</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

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
                    <p class="mb-4">Change password for: <strong>{{ userForm.username }}</strong></p>
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
                    <p class="font-weight-bold">{{ userForm.username }} ({{ userForm.email }})</p>
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
.users-view {
    &__container {
        padding: $spacing-lg;
        max-width: 100%;
    }

    &__title {
        @include heading-1;
        color: $primary;
        margin-bottom: $spacing-lg;
    }

    &__table {
        cursor: pointer;

        :deep(tr:hover) {
            background-color: rgba($primary, 0.05) !important;
        }
    }
}
</style>