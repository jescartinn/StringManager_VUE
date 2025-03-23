<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useDisplay } from 'vuetify'

const router = useRouter()
const authStore = useAuthStore()
const { mdAndDown } = useDisplay()

// Reference to control the display of different sections
const activeSection = ref('login') // 'login' or 'register'

// Navigation to login/register sections
const navigateTo = (section: string) => {
    activeSection.value = section
}

// Form data 
const loginForm = ref({
    username: '',
    password: '',
    remember: false
})

const registerForm = ref({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
})

// Handle login form submission
const handleLogin = async () => {
    if (!loginForm.value.username || !loginForm.value.password) {
        authStore.error = 'Please enter both username and password'
        return
    }

    await authStore.login(loginForm.value.username, loginForm.value.password)
}

// Handle register form submission
const handleRegister = async () => {
    // Basic validation
    if (!registerForm.value.username || !registerForm.value.email ||
        !registerForm.value.password || !registerForm.value.confirmPassword) {
        authStore.error = 'Please fill in all fields'
        return
    }

    if (registerForm.value.password !== registerForm.value.confirmPassword) {
        authStore.error = "Passwords don't match"
        return
    }

    await authStore.register({
        username: registerForm.value.username,
        email: registerForm.value.email,
        password: registerForm.value.password,
        confirmPassword: registerForm.value.confirmPassword
    })
}
</script>

<template>
    <div class="landing">
        <v-container fluid class="landing__container pa-0">
            <!-- Mobile Header - Only visible on small screens -->
            <div class="landing__mobile-header">
                <div class="landing__logo landing__logo--mobile">
                    <v-icon size="36" color="primary" icon="mdi-tennis"></v-icon>
                    <h1 class="landing__logo-text">StringManager</h1>
                </div>
            </div>

            <v-row no-gutters>
                <!-- Left side - Promotional content -->
                <v-col cols="12" md="7" class="landing__promo">
                    <div class="landing__promo-content">
                        <!-- Logo - Hidden on mobile since we show it in the header -->
                        <div class="landing__logo landing__logo--desktop">
                            <v-icon size="48" color="white" icon="mdi-tennis"></v-icon>
                            <h1 class="landing__logo-text">StringManager</h1>
                        </div>

                        <div class="landing__tagline">
                            <h2>Professional Tennis Stringing Management System</h2>
                            <p>Streamline your tennis stringing operations, track player preferences, and manage
                                tournament workflows with ease.</p>
                        </div>

                        <div class="landing__features">
                            <div class="landing__feature">
                                <v-icon size="36" color="white" icon="mdi-tennis-ball"></v-icon>
                                <div>
                                    <h3>Manage Racquets</h3>
                                    <p>Track player racquets, specifications and stringing history</p>
                                </div>
                            </div>

                            <div class="landing__feature">
                                <v-icon size="36" color="white" icon="mdi-calendar-clock"></v-icon>
                                <div>
                                    <h3>Tournament Support</h3>
                                    <p>Schedule and prioritize stringing jobs during tournaments</p>
                                </div>
                            </div>

                            <div class="landing__feature">
                                <v-icon size="36" color="white" icon="mdi-chart-box"></v-icon>
                                <div>
                                    <h3>Analytics Dashboard</h3>
                                    <p>Track performance metrics and string preferences</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </v-col>

                <!-- Right side - Auth forms -->
                <v-col cols="12" md="5" class="landing__auth">
                    <v-card class="landing__auth-card mx-auto">
                        <!-- Card tabs -->
                        <div class="landing__auth-tabs">
                            <button class="landing__auth-tab"
                                :class="{ 'landing__auth-tab--active': activeSection === 'login' }"
                                @click="navigateTo('login')">
                                Login
                            </button>
                            <button class="landing__auth-tab"
                                :class="{ 'landing__auth-tab--active': activeSection === 'register' }"
                                @click="navigateTo('register')">
                                Register
                            </button>
                        </div>

                        <v-card-text class="landing__auth-content">
                            <!-- Login form -->
                            <div v-if="activeSection === 'login'" class="landing__form">
                                <h2 class="landing__form-title">Welcome Back</h2>

                                <v-alert v-if="authStore.error" type="error" density="compact" variant="tonal"
                                    class="mb-4">
                                    {{ authStore.error }}
                                </v-alert>

                                <v-form @submit.prevent="handleLogin">
                                    <v-text-field v-model="loginForm.username" label="Username"
                                        prepend-inner-icon="mdi-account" variant="outlined" required
                                        autocomplete="username"></v-text-field>

                                    <v-text-field v-model="loginForm.password" label="Password"
                                        prepend-inner-icon="mdi-lock" type="password" variant="outlined" required
                                        autocomplete="current-password"></v-text-field>

                                    <div class="d-flex justify-space-between align-center mb-6 flex-wrap">
                                        <v-checkbox v-model="loginForm.remember" label="Remember me" hide-details
                                            density="compact"></v-checkbox>
                                        <a href="#" class="text-body-2 text-decoration-none mt-2">Forgot password?</a>
                                    </div>

                                    <v-btn color="primary" block size="large" type="submit" :loading="authStore.loading"
                                        class="landing__submit-btn">
                                        Login
                                    </v-btn>
                                </v-form>

                                <!-- Mobile only: link to register -->
                                <div class="landing__mobile-switch-section text-center mt-6">
                                    <p>Don't have an account?</p>
                                    <v-btn variant="text" color="primary" @click="navigateTo('register')">
                                        Create Account
                                    </v-btn>
                                </div>
                            </div>

                            <!-- Register form -->
                            <div v-if="activeSection === 'register'" class="landing__form">
                                <h2 class="landing__form-title">Create Account</h2>

                                <v-alert v-if="authStore.error" type="error" density="compact" variant="tonal"
                                    class="mb-4">
                                    {{ authStore.error }}
                                </v-alert>

                                <v-form @submit.prevent="handleRegister">
                                    <v-text-field v-model="registerForm.username" label="Username"
                                        prepend-inner-icon="mdi-account" variant="outlined" required
                                        autocomplete="username"></v-text-field>

                                    <v-text-field v-model="registerForm.email" label="Email"
                                        prepend-inner-icon="mdi-email" variant="outlined" required type="email"
                                        autocomplete="email"></v-text-field>

                                    <v-text-field v-model="registerForm.password" label="Password"
                                        prepend-inner-icon="mdi-lock" type="password" variant="outlined" required
                                        autocomplete="new-password"></v-text-field>

                                    <v-text-field v-model="registerForm.confirmPassword" label="Confirm Password"
                                        prepend-inner-icon="mdi-lock-check" type="password" variant="outlined" required
                                        autocomplete="new-password"></v-text-field>

                                    <v-btn color="primary" block size="large" type="submit" :loading="authStore.loading"
                                        class="landing__submit-btn mt-2">
                                        Register
                                    </v-btn>
                                </v-form>

                                <!-- Mobile only: link to login -->
                                <div class="landing__mobile-switch-section text-center mt-6">
                                    <p>Already have an account?</p>
                                    <v-btn variant="text" color="primary" @click="navigateTo('login')">
                                        Login
                                    </v-btn>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </div>
</template>

<style lang="scss" scoped>
.landing {
    min-height: 100vh;
    background-color: $bg-light;

    &__container {
        min-height: 100vh;
    }

    // Mobile header
    &__mobile-header {
        display: none;
        padding: $spacing-md;
        background-color: white;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 10;

        @media (max-width: $breakpoint-md) {
            display: block;
        }
    }

    // Promotional side
    &__promo {
        background-color: $primary;
        color: white;
        min-height: 100vh;
        position: relative;
        overflow: hidden;

        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2334495e' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E") repeat;
            z-index: 0;
        }

        &-content {
            position: relative;
            z-index: 1;
            padding: $spacing-xl;
            height: 100%;
            @include flex(column, center, flex-start);
            max-width: 600px;
            margin: 0 auto;

            @media (max-width: $breakpoint-md) {
                padding: $spacing-lg $spacing-md;
            }
        }
    }

    &__logo {
        @include flex(row, flex-start, center);
        gap: $spacing-md;
        margin-bottom: $spacing-xl;

        &--mobile {
            margin-bottom: 0;
            justify-content: center;

            .landing__logo-text {
                color: $primary;
                font-size: 1.75rem;
            }
        }

        &--desktop {
            @media (max-width: $breakpoint-md) {
                display: none;
            }
        }

        &-text {
            font-size: 2.5rem;
            font-weight: 700;
            margin: 0;

            @media (max-width: $breakpoint-md) {
                font-size: 2rem;
            }
        }
    }

    &__tagline {
        margin-bottom: $spacing-xl;

        h2 {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: $spacing-md;
            line-height: 1.2;

            @media (max-width: $breakpoint-md) {
                font-size: 1.75rem;
            }
        }

        p {
            font-size: 1.25rem;
            opacity: 0.9;
            max-width: 500px;

            @media (max-width: $breakpoint-md) {
                font-size: 1.1rem;
            }
        }
    }

    &__features {
        @include flex(column, flex-start, flex-start);
        gap: $spacing-xl;

        @media (max-width: $breakpoint-md) {
            gap: $spacing-lg;
        }
    }

    &__feature {
        @include flex(row, flex-start, flex-start);
        gap: $spacing-md;

        h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 $spacing-xs 0;

            @media (max-width: $breakpoint-md) {
                font-size: 1.15rem;
            }
        }

        p {
            margin: 0;
            opacity: 0.9;

            @media (max-width: $breakpoint-md) {
                font-size: 0.95rem;
            }
        }
    }

    // Auth side
    &__auth {
        @include flex(column, center, center);
        padding: $spacing-lg !important;

        @media (max-width: $breakpoint-md) {
            padding: $spacing-lg !important;
        }

        &-card {
            width: 100%;
            max-width: 480px;
            border-radius: $border-radius-lg;
            overflow: hidden;
            box-shadow: $shadow-light !important;

            @media (max-width: $breakpoint-md) {
                max-width: 100%;
                margin-top: 1rem;
                border-radius: $border-radius-md;
            }
        }

        &-tabs {
            @include flex(row, stretch, center);
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);

            @media (max-width: $breakpoint-md) {
                // Hide tabs on mobile as we'll have toggle buttons in the form
                display: none;
            }
        }

        &-tab {
            flex: 1;
            padding: $spacing-md;
            background: none;
            border: none;
            font-weight: 500;
            font-size: 1rem;
            cursor: pointer;
            position: relative;

            &--active {
                color: $primary;

                &::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background-color: $primary;
                }
            }

            &:hover:not(.landing__auth-tab--active) {
                background-color: rgba(0, 0, 0, 0.03);
            }
        }

        &-content {
            padding: $spacing-lg;

            @media (max-width: $breakpoint-md) {
                padding: $spacing-md;
            }
        }
    }

    &__form {
        &-title {
            text-align: center;
            margin-bottom: $spacing-xl;
            color: $text-primary;
            font-weight: 600;

            @media (max-width: $breakpoint-md) {
                margin-bottom: $spacing-lg;
                font-size: 1.5rem;
            }
        }
    }

    &__submit-btn {
        margin-top: $spacing-md;
        min-height: 48px; // Ensure button is easy to tap on mobile
    }

    &__mobile-switch-section {
        display: none;

        @media (max-width: $breakpoint-md) {
            display: block;
            margin-top: $spacing-xl;
            padding-top: $spacing-md;
            border-top: 1px solid rgba(0, 0, 0, 0.1);

            p {
                margin-bottom: $spacing-xs;
                color: $text-secondary;
            }
        }
    }

    // Mobile responsive adjustments
    @media (max-width: $breakpoint-md) {
        &__promo {
            min-height: auto;
            padding: $spacing-lg 0;

            // Make promo section collapsible on smaller screens for better UX
            max-height: 600px;
            overflow-y: auto;
        }

        &__auth {
            padding: $spacing-md;
        }
    }

    // For very small screens
    @media (max-width: $breakpoint-sm) {
        &__promo {
            // Optional: On very small screens, make the promo section even more compact
            padding: $spacing-md 0;
        }

        &__feature {
            align-items: center; // Align icon with text better on small screens
        }
    }
}
</style>