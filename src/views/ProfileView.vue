<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores'

// Import store and router
const authStore = useAuthStore()
const router = useRouter()

// UI State
const loading = ref(false)
const showChangePasswordDialog = ref(false)
const passwordChanged = ref(false)
const success = ref(false)
const successMessage = ref('')
const formValid = ref(true)

// Form data
const profileForm = ref({
  username: '',
  email: ''
})

// Password form data
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Form errors
const profileErrors = ref({
  username: '',
  email: ''
})

const passwordErrors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Password strength computation
const passwordStrength = computed(() => {
  const password = passwordForm.value.newPassword
  if (!password) return 0

  let strength = 0

  // Length check
  if (password.length >= 8) strength++

  // Contains uppercase
  if (/[A-Z]/.test(password)) strength++

  // Contains lowercase
  if (/[a-z]/.test(password)) strength++

  // Contains numbers
  if (/\d/.test(password)) strength++

  // Contains special characters
  if (/[^A-Za-z0-9]/.test(password)) strength++

  return Math.min(strength, 4) // Normalize to max 4
})

const passwordStrengthColor = computed(() => {
  const strength = passwordStrength.value
  if (strength === 0) return 'error'
  if (strength === 1) return 'error'
  if (strength === 2) return 'warning'
  if (strength === 3) return 'success'
  return 'success'
})

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value
  if (strength === 0) return 'Very Weak'
  if (strength === 1) return 'Weak'
  if (strength === 2) return 'Medium'
  if (strength === 3) return 'Strong'
  return 'Very Strong'
})

// Password visibility
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Initialize component
onMounted(() => {
  // Populate form with current user data
  if (authStore.user) {
    profileForm.value.username = authStore.user.username || ''
    profileForm.value.email = authStore.user.email || ''
  }
})

// Validation functions
const validateProfileForm = () => {
  let isValid = true
  
  // Validate username
  if (!profileForm.value.username.trim()) {
    profileErrors.value.username = 'Username is required'
    isValid = false
  } else if (profileForm.value.username.trim().length < 3) {
    profileErrors.value.username = 'Username must be at least 3 characters'
    isValid = false
  } else {
    profileErrors.value.username = ''
  }
  
  // Validate email
  if (!profileForm.value.email.trim()) {
    profileErrors.value.email = 'Email is required'
    isValid = false
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profileForm.value.email)) {
      profileErrors.value.email = 'Please enter a valid email address'
      isValid = false
    } else {
      profileErrors.value.email = ''
    }
  }
  
  return isValid
}

const validatePasswordForm = () => {
  let isValid = true
  
  // Validate current password
  if (!passwordForm.value.currentPassword) {
    passwordErrors.value.currentPassword = 'Current password is required'
    isValid = false
  } else {
    passwordErrors.value.currentPassword = ''
  }
  
  // Validate new password
  if (!passwordForm.value.newPassword) {
    passwordErrors.value.newPassword = 'New password is required'
    isValid = false
  } else if (passwordForm.value.newPassword.length < 8) {
    passwordErrors.value.newPassword = 'Password must be at least 8 characters'
    isValid = false
  } else {
    passwordErrors.value.newPassword = ''
  }
  
  // Validate confirm password
  if (!passwordForm.value.confirmPassword) {
    passwordErrors.value.confirmPassword = 'Please confirm your new password'
    isValid = false
  } else if (passwordForm.value.confirmPassword !== passwordForm.value.newPassword) {
    passwordErrors.value.confirmPassword = 'Passwords do not match'
    isValid = false
  } else {
    passwordErrors.value.confirmPassword = ''
  }
  
  return isValid
}

// Update profile handler
const updateProfile = async () => {
  if (!validateProfileForm()) return
  
  loading.value = true
  success.value = false
  
  try {
    // Check if the user exists and has an ID
    if (!authStore.user || !authStore.user.id) {
      throw new Error('User information is missing')
    }
    
    // Proceed with the update
    const updated = await authStore.updateProfile({
      username: profileForm.value.username,
      email: profileForm.value.email
    })
    
    if (updated) {
      success.value = true
      successMessage.value = 'Profile updated successfully'
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('username')) {
        profileErrors.value.username = 'Username is already taken'
      } else if (error.message.includes('email')) {
        profileErrors.value.email = 'Email is already registered'
      } else {
        // Generic error
        alert('Error updating profile: ' + error.message)
      }
    }
  } finally {
    loading.value = false
  }
}

// Open change password dialog
const openChangePasswordDialog = () => {
  // Reset form
  passwordForm.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  
  // Reset errors
  passwordErrors.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  
  passwordChanged.value = false
  showChangePasswordDialog.value = true
}

// Change password handler
const changePassword = async () => {
  if (!validatePasswordForm()) return
  
  loading.value = true
  passwordChanged.value = false
  
  try {
    const success = await authStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    )
    
    if (success) {
      passwordChanged.value = true
      // Reset form after success
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }
  } catch (error) {
    console.error('Error changing password:', error)
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('current password')) {
        passwordErrors.value.currentPassword = 'Current password is incorrect'
      } else {
        // Generic error
        alert('Error changing password: ' + error.message)
      }
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="profile-view">
    <v-container class="profile-view__container">
      <!-- Page header -->
      <v-row>
        <v-col cols="12">
          <h1 class="profile-view__title">Profile Settings</h1>
        </v-col>
      </v-row>

      <!-- Success message -->
      <v-row v-if="success">
        <v-col cols="12">
          <v-alert type="success" variant="tonal" closable>
            {{ successMessage }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Error message -->
      <v-row v-if="authStore.error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable>
            {{ authStore.error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Main content -->
      <v-row>
        <v-col cols="12">
          <!-- Profile information card -->
          <v-card class="profile-view__card mb-6">
            <v-card-title class="profile-view__section-title">
              <v-icon start>mdi-account</v-icon>
              Profile Information
            </v-card-title>

            <v-card-text class="pt-4">
              <v-form @submit.prevent="updateProfile" v-model="formValid">
                <!-- User Avatar -->
                <div class="d-flex justify-center mb-6">
                  <v-avatar color="primary" size="120">
                    <span class="text-h3 text-white">{{ authStore.user?.username.charAt(0).toUpperCase() }}</span>
                  </v-avatar>
                </div>

                <!-- User role badge -->
                <div class="d-flex justify-center mb-6">
                  <v-chip color="secondary" size="large">
                    {{ authStore.user?.role }}
                  </v-chip>
                </div>

                <!-- Username field -->
                <v-text-field
                  v-model="profileForm.username"
                  label="Username"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  :error-messages="profileErrors.username"
                  class="mb-4"
                ></v-text-field>

                <!-- Email field -->
                <v-text-field
                  v-model="profileForm.email"
                  label="Email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  :error-messages="profileErrors.email"
                  class="mb-4"
                ></v-text-field>

                <!-- Account created info -->
                <div class="profile-view__info-item mb-4">
                  <span class="profile-view__info-label">Account Created:</span>
                  <span class="profile-view__info-value">{{ authStore.user?.createdAt ? new Date(authStore.user.createdAt).toLocaleDateString() : 'N/A' }}</span>
                </div>

                <!-- Last login info (if available) -->
                <div v-if="authStore.user?.lastLoginAt" class="profile-view__info-item mb-4">
                  <span class="profile-view__info-label">Last Login:</span>
                  <span class="profile-view__info-value">{{ new Date(authStore.user.lastLoginAt).toLocaleString() }}</span>
                </div>

                <!-- Action buttons -->
                <div class="d-flex justify-space-between mt-6">
                  <v-btn 
                    color="secondary" 
                    variant="text" 
                    prepend-icon="mdi-lock" 
                    @click="openChangePasswordDialog"
                  >
                    Change Password
                  </v-btn>

                  <v-btn 
                    color="primary" 
                    type="submit" 
                    :loading="loading"
                    :disabled="!formValid"
                  >
                    Update Profile
                  </v-btn>
                </div>
              </v-form>
            </v-card-text>
          </v-card>

          <!-- Application settings card (expandable in future) -->
          <v-card class="profile-view__card">
            <v-card-title class="profile-view__section-title">
              <v-icon start>mdi-cog</v-icon>
              Application Settings
            </v-card-title>

            <v-card-text class="pa-3">
              <!-- Settings can be added here in the future -->
              <p class="text-center py-4 text-grey">Additional settings will be available in future updates.</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Change password dialog -->
    <v-dialog v-model="showChangePasswordDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="profile-view__section-title">
          <v-icon start>mdi-lock</v-icon>
          Change Password
        </v-card-title>

        <v-card-text class="pt-4">
          <!-- Success message -->
          <v-alert v-if="passwordChanged" type="success" variant="tonal" class="mb-4">
            Password changed successfully.
          </v-alert>

          <v-form @submit.prevent="changePassword">
            <!-- Current password -->
            <v-text-field
              v-model="passwordForm.currentPassword"
              label="Current Password"
              prepend-inner-icon="mdi-lock-outline"
              :type="showCurrentPassword ? 'text' : 'password'"
              variant="outlined"
              :error-messages="passwordErrors.currentPassword"
              :append-inner-icon="showCurrentPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showCurrentPassword = !showCurrentPassword"
              class="mb-4"
            ></v-text-field>

            <!-- New password -->
            <v-text-field
              v-model="passwordForm.newPassword"
              label="New Password"
              prepend-inner-icon="mdi-lock"
              :type="showNewPassword ? 'text' : 'password'"
              variant="outlined"
              :error-messages="passwordErrors.newPassword"
              :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showNewPassword = !showNewPassword"
              hint="Password must be at least 8 characters"
              persistent-hint
              class="mb-2"
            ></v-text-field>

            <!-- Password strength indicator -->
            <div v-if="passwordForm.newPassword" class="mb-4">
              <div class="d-flex align-center">
                <v-progress-linear :color="passwordStrengthColor"
                                  :model-value="(passwordStrength / 4) * 100" height="10"
                                  rounded></v-progress-linear>
                <span class="ms-2 text-body-2" :class="`text-${passwordStrengthColor}`">
                  {{ passwordStrengthText }}
                </span>
              </div>
              <div class="text-caption mt-1">
                <span v-if="passwordStrength < 3">
                  For a stronger password, include uppercase letters, numbers, and special
                  characters.
                </span>
              </div>
            </div>

            <!-- Confirm password -->
            <v-text-field
              v-model="passwordForm.confirmPassword"
              label="Confirm Password"
              prepend-inner-icon="mdi-lock-check"
              :type="showConfirmPassword ? 'text' : 'password'"
              variant="outlined"
              :error-messages="passwordErrors.confirmPassword"
              :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showConfirmPassword = !showConfirmPassword"
              class="mb-4"
            ></v-text-field>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showChangePasswordDialog = false">
            Close
          </v-btn>
          <v-btn color="primary" @click="changePassword" :loading="loading" :disabled="!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword">
            Change Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style lang="scss" scoped>
.profile-view {
  &__container {
    padding: $spacing-lg;
    max-width: 100%;
  }

  &__title {
    @include heading-1;
    color: $primary;
    margin-bottom: $spacing-lg;
  }

  &__card {
    @include card-shadow;
    overflow: hidden;
  }

  &__section-title {
    @include heading-3;
    padding: $spacing-md $spacing-lg;
    background-color: rgba($primary, 0.05);
    border-bottom: 1px solid rgba($primary, 0.1);
  }

  &__info-item {
    display: flex;
    flex-direction: column;
    padding: $spacing-sm 0;
  }

  &__info-label {
    color: $text-secondary;
    font-size: $font-size-sm;
    margin-bottom: $spacing-xs;
  }

  &__info-value {
    font-size: $font-size-md;
  }

  // Media queries for responsive layout
  @media (max-width: $breakpoint-md) {
    &__container {
      padding: $spacing-md;
    }
  }

  @media (max-width: $breakpoint-sm) {
    &__container {
      padding: $spacing-sm;
    }
  }
}
</style>