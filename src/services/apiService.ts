// API service to handle all API requests
const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7299/api';

// Helper function to get authorization header
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Generic HTTP request function
async function request(endpoint: string, options: any = {}) {
    const url = `${API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...(options.headers || {})
    };

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, config);

        // Handle 401 Unauthorized globally
        if (response.status === 401) {
            // Clear auth data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
            throw new Error('Your session has expired. Please log in again.');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Auth API
const auth = {
    login: (username: string, password: string) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }),

    register: (userData: any) =>
        request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),

    getCurrentUser: () =>
        request('/auth/user'),

    changePassword: (changePasswordData: any) =>
        request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(changePasswordData)
        })
};

// Players API
const players = {
    getAll: () => request('/players'),
    getById: (id: number) => request(`/players/${id}`),
    create: (playerData: any) =>
        request('/players', {
            method: 'POST',
            body: JSON.stringify(playerData)
        }),
    update: (id: number, playerData: any) =>
        request(`/players/${id}`, {
            method: 'PUT',
            body: JSON.stringify(playerData)
        }),
    delete: (id: number) =>
        request(`/players/${id}`, {
            method: 'DELETE'
        })
};

// Racquets API
const racquets = {
    getAll: () => request('/racquets'),
    getByPlayer: (playerId: number) => request(`/racquets?playerId=${playerId}`),
    getById: (id: number) => request(`/racquets/${id}`),
    create: (racquetData: any) =>
        request('/racquets', {
            method: 'POST',
            body: JSON.stringify(racquetData)
        }),
    update: (id: number, racquetData: any) =>
        request(`/racquets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(racquetData)
        }),
    delete: (id: number) =>
        request(`/racquets/${id}`, {
            method: 'DELETE'
        })
};

// StringTypes API
const stringTypes = {
    getAll: () => request('/stringtypes'),
    getById: (id: number) => request(`/stringtypes/${id}`),
    create: (stringTypeData: any) =>
        request('/stringtypes', {
            method: 'POST',
            body: JSON.stringify(stringTypeData)
        }),
    update: (id: number, stringTypeData: any) =>
        request(`/stringtypes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(stringTypeData)
        }),
    delete: (id: number) =>
        request(`/stringtypes/${id}`, {
            method: 'DELETE'
        })
};

// Stringers API
const stringers = {
    getAll: () => request('/stringers'),
    getById: (id: number) => request(`/stringers/${id}`),
    create: (stringerData: any) =>
        request('/stringers', {
            method: 'POST',
            body: JSON.stringify(stringerData)
        }),
    update: (id: number, stringerData: any) =>
        request(`/stringers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(stringerData)
        }),
    delete: (id: number) =>
        request(`/stringers/${id}`, {
            method: 'DELETE'
        })
};

// Tournaments API
const tournaments = {
    getAll: () => request('/tournaments'),
    getCurrent: () => request('/tournaments/current'),
    getById: (id: number) => request(`/tournaments/${id}`),
    create: (tournamentData: any) =>
        request('/tournaments', {
            method: 'POST',
            body: JSON.stringify(tournamentData)
        }),
    update: (id: number, tournamentData: any) =>
        request(`/tournaments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tournamentData)
        }),
    delete: (id: number) =>
        request(`/tournaments/${id}`, {
            method: 'DELETE'
        })
};

// StringJobs API
const stringJobs = {
    getAll: () => request('/stringjobs'),
    getByStatus: (status: string) => request(`/stringjobs?status=${status}`),
    getByTournament: (tournamentId: number) => request(`/stringjobs?tournamentId=${tournamentId}`),
    getByPlayer: (playerId: number) => request(`/stringjobs/player/${playerId}`),
    getByStringer: (stringerId: number) => request(`/stringjobs/stringer/${stringerId}`),
    getById: (id: number) => request(`/stringjobs/${id}`),
    create: (jobData: any) =>
        request('/stringjobs', {
            method: 'POST',
            body: JSON.stringify(jobData)
        }),
    update: (id: number, jobData: any) =>
        request(`/stringjobs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(jobData)
        }),
    complete: (id: number, completeData: any) =>
        request(`/stringjobs/${id}/complete`, {
            method: 'PATCH',
            body: JSON.stringify(completeData)
        }),
    cancel: (id: number, cancelReason: string) =>
        request(`/stringjobs/${id}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify(cancelReason)
        }),
    start: (id: number) =>
        request(`/stringjobs/${id}/start`, {
            method: 'PATCH'
        }),
    delete: (id: number) =>
        request(`/stringjobs/${id}`, {
            method: 'DELETE'
        })
};

// Dashboard API
const dashboard = {
    getStats: () => request('/dashboard/stats'),
    getDistribution: (tournamentId?: number) =>
        request(tournamentId ? `/dashboard/distribution?tournamentId=${tournamentId}` : '/dashboard/distribution')
};

// Users API (Admin only)
const users = {
    getAll: () => request('/users'),
    getById: (id: number) => request(`/users/${id}`),
    update: (id: number, userData: any) =>
        request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        }),
    delete: (id: number) =>
        request(`/users/${id}`, {
            method: 'DELETE'
        })
};

// Export all API services
export default {
    auth,
    players,
    racquets,
    stringTypes,
    stringers,
    tournaments,
    stringJobs,
    dashboard,
    users
};