// API service to handle all API requests with TypeScript types
const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7299/api';

// Interfaces - Auth
export interface LoginDTO {
  username: string
  password: string
}

export interface RegisterDTO {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface ChangePasswordDTO {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface User {
  id: number
  username: string
  email: string
  role: string
  createdAt: string
  lastLoginAt: string | null
}

export interface AuthResponse {
  token: string
  user: User
  expiration: string
}

// Interfaces - Player
export interface Player {
  id: number
  name: string
  lastName: string
  countryCode?: string
}

export interface CreatePlayerDTO {
  name: string
  lastName: string
  countryCode?: string
}

export interface UpdatePlayerDTO {
  name: string
  lastName: string
  countryCode?: string
}

// Interfaces - Racquet
export interface Racquet {
  id: number
  playerId: number
  brand: string
  model: string
  serialNumber?: string
  headSize?: number
  notes?: string
  player?: Player
}

export interface CreateRacquetDTO {
  playerId: number
  brand: string
  model: string
  serialNumber?: string
  headSize?: number
  notes?: string
}

export interface UpdateRacquetDTO {
  brand: string
  model: string
  serialNumber?: string
  headSize?: number
  notes?: string
}

// Interfaces - StringType
export interface StringType {
  id: number
  brand: string
  model: string
  gauge?: string
  material?: string
  color?: string
}

export interface CreateStringTypeDTO {
  brand: string
  model: string
  gauge?: string
  material?: string
  color?: string
}

export interface UpdateStringTypeDTO {
  brand: string
  model: string
  gauge?: string
  material?: string
  color?: string
}

// Interfaces - Stringer
export interface Stringer {
  id: number
  name: string
  lastName: string
  email?: string
  phoneNumber?: string
}

export interface CreateStringerDTO {
  name: string
  lastName: string
  email?: string
  phoneNumber?: string
}

export interface UpdateStringerDTO {
  name: string
  lastName: string
  email?: string
  phoneNumber?: string
}

// Interfaces - Tournament
export interface Tournament {
  id: number
  name: string
  startDate: string
  endDate: string
  location?: string
  category?: string
}

export interface CreateTournamentDTO {
  name: string
  startDate: string
  endDate: string
  location?: string
  category?: string
}

export interface UpdateTournamentDTO {
  name: string
  startDate: string
  endDate: string
  location?: string
  category?: string
}

// Interfaces - StringJob
export interface StringJob {
  id: number
  playerId: number
  player?: Player
  racquetId: number
  racquet?: Racquet
  mainStringId?: number
  mainString?: StringType
  crossStringId?: number
  crossString?: StringType
  stringerId?: number
  stringer?: Stringer
  tournamentId?: number
  tournament?: Tournament
  createdAt: string
  completedAt?: string
  mainTension: number
  crossTension?: number
  isTensionInKg: boolean
  logo?: string
  status: string
  notes?: string
  priority?: number
  price: number
  isPaid: boolean
}

export interface CreateStringJobDTO {
  playerId: number
  racquetId: number
  mainStringId?: number
  crossStringId?: number
  stringerId?: number
  tournamentId?: number
  mainTension: number
  crossTension?: number
  isTensionInKg: boolean
  logo?: string
  notes?: string
  priority?: number
  price?: number
}

export interface UpdateStringJobDTO {
  mainStringId?: number
  crossStringId?: number
  stringerId?: number
  mainTension: number
  crossTension?: number
  isTensionInKg: boolean
  logo?: string
  status: string
  notes?: string
  priority?: number
  price?: number
}

export interface CompleteStringJobDTO {
  completedAt: string
  notes?: string
}

// Interface for label data
export interface LabelDto {
  jobId: number
  playerName: string
  playerLastName: string
  racquetBrand: string
  racquetModel: string
  stringBrand: string
  stringModel: string
  crossStringBrand?: string
  crossStringModel?: string
  mainTension: number
  crossTension?: number
  isTensionInKg: boolean
  dateCompleted: string
  logo?: string
  qrCodeData?: string
}

// Interface for generate label request
export interface GenerateLabelDto {
  jobId: number
  includePlayerInfo?: boolean
  includeRacquetInfo?: boolean
  includeStringInfo?: boolean
  includeTensionInfo?: boolean
  includeDateInfo?: boolean
  includeLogo?: boolean
  generateQRCode?: boolean
  labelSize?: 'small' | 'medium' | 'large'
}

// Interfaces - Dashboard
export interface DashboardStats {
  pendingJobs: number
  inProgressJobs: number
  completedJobsToday: number
  highPriorityJobs: number
  currentTournament: {
    id: number
    name: string
    remainingDays: number
  } | null
  topStringers: Array<{
    stringerId: number
    stringerName: string
    completedJobs: number
  }>
  topPlayers: Array<{
    playerId: number
    playerName: string
    totalJobs: number
  }>
  topStrings: Array<{
    stringId: number
    stringName: string
    totalUses: number
  }>
}

export interface DistributionStats {
  statusDistribution: Array<{
    status: string
    count: number
  }>
  tensionDistribution: Array<{
    range: string
    count: number
  }>
  stringBrandDistribution: Array<{
    brand: string
    count: number
  }>
}

// RequestInit with generic type for request options
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any
}

// Helper function to get authorization header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Generic HTTP request function
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const config: RequestInit = {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401 && endpoint.includes('/auth/login')) {
      throw new Error('Credenciales inválidas.');
    }

    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
      throw new Error('Su sesión ha expirado. Por favor, inicie sesión de nuevo.');
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null as unknown as T;
    }

    // Special handling for 404 Not Found responses for player-related requests
    if (response.status === 404) {
      if (endpoint.includes('/player/')) {
        // For player-specific endpoints, return an empty array instead of throwing an error
        if (Array.isArray([] as unknown as T)) {
          return [] as unknown as T;
        }
        return null as unknown as T;
      } else {
        return null as unknown as T;
      }
    }

    if (!response.ok) {
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'message' in errorData) {
          throw new Error(errorData.message as string);
        }
      } catch (parseError) {
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    }

    return await response.text() as unknown as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Auth API
const auth = {
  login: (username: string, password: string): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { username, password }
    }),

  register: (userData: RegisterDTO): Promise<AuthResponse> =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: userData
    }),

  getCurrentUser: (): Promise<User> =>
    request<User>('/auth/user'),

  changePassword: (changePasswordData: ChangePasswordDTO): Promise<void> =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: changePasswordData
    })
};

// Players API
const players = {
  getAll: (): Promise<Player[]> =>
    request<Player[]>('/players'),

  getById: (id: number): Promise<Player> =>
    request<Player>(`/players/${id}`),

  create: (playerData: CreatePlayerDTO): Promise<Player> =>
    request<Player>('/players', {
      method: 'POST',
      body: playerData
    }),

  update: (id: number, playerData: UpdatePlayerDTO): Promise<void> =>
    request<void>(`/players/${id}`, {
      method: 'PUT',
      body: playerData
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/players/${id}`, {
      method: 'DELETE'
    })
};

// Racquets API
const racquets = {
  getAll: (): Promise<Racquet[]> =>
    request<Racquet[]>('/racquets'),

  getByPlayer: (playerId: number): Promise<Racquet[]> =>
    request<Racquet[]>(`/racquets?playerId=${playerId}`),

  getById: (id: number): Promise<Racquet> =>
    request<Racquet>(`/racquets/${id}`),

  create: (racquetData: CreateRacquetDTO): Promise<Racquet> =>
    request<Racquet>('/racquets', {
      method: 'POST',
      body: racquetData
    }),

  update: (id: number, racquetData: UpdateRacquetDTO): Promise<void> =>
    request<void>(`/racquets/${id}`, {
      method: 'PUT',
      body: racquetData
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/racquets/${id}`, {
      method: 'DELETE'
    })
};

// StringTypes API
const stringTypes = {
  getAll: (): Promise<StringType[]> =>
    request<StringType[]>('/stringtypes'),

  getById: (id: number): Promise<StringType> =>
    request<StringType>(`/stringtypes/${id}`),

  create: (stringTypeData: CreateStringTypeDTO): Promise<StringType> =>
    request<StringType>('/stringtypes', {
      method: 'POST',
      body: stringTypeData
    }),

  update: (id: number, stringTypeData: UpdateStringTypeDTO): Promise<void> =>
    request<void>(`/stringtypes/${id}`, {
      method: 'PUT',
      body: stringTypeData
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/stringtypes/${id}`, {
      method: 'DELETE'
    })
};

// Stringers API
const stringers = {
  getAll: (): Promise<Stringer[]> =>
    request<Stringer[]>('/stringers'),

  getById: (id: number): Promise<Stringer> =>
    request<Stringer>(`/stringers/${id}`),

  create: (stringerData: CreateStringerDTO): Promise<Stringer> =>
    request<Stringer>('/stringers', {
      method: 'POST',
      body: stringerData
    }),

  update: (id: number, stringerData: UpdateStringerDTO): Promise<void> =>
    request<void>(`/stringers/${id}`, {
      method: 'PUT',
      body: stringerData
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/stringers/${id}`, {
      method: 'DELETE'
    })
};

// Tournaments API
const tournaments = {
  getAll: (): Promise<Tournament[]> =>
    request<Tournament[]>('/tournaments'),

  getCurrent: (): Promise<Tournament> =>
    request<Tournament>('/tournaments/current'),

  getById: (id: number): Promise<Tournament> =>
    request<Tournament>(`/tournaments/${id}`),

  create: (tournamentData: CreateTournamentDTO): Promise<Tournament> =>
    request<Tournament>('/tournaments', {
      method: 'POST',
      body: tournamentData
    }),

  update: (id: number, tournamentData: UpdateTournamentDTO): Promise<void> =>
    request<void>(`/tournaments/${id}`, {
      method: 'PUT',
      body: tournamentData
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/tournaments/${id}`, {
      method: 'DELETE'
    })
};

// StringJobs API
const stringJobs = {
  getAll: (): Promise<StringJob[]> =>
    request<StringJob[]>('/stringjobs'),

  getByStatus: (status: string): Promise<StringJob[]> =>
    request<StringJob[]>(`/stringjobs?status=${status}`),

  getByTournament: (tournamentId: number): Promise<StringJob[]> =>
    request<StringJob[]>(`/stringjobs?tournamentId=${tournamentId}`),

  getByPlayer: (playerId: number): Promise<StringJob[]> =>
    request<StringJob[]>(`/stringjobs/player/${playerId}`),

  getByStringer: (stringerId: number): Promise<StringJob[]> =>
    request<StringJob[]>(`/stringjobs/stringer/${stringerId}`),

  getById: (id: number): Promise<StringJob> =>
    request<StringJob>(`/stringjobs/${id}`),

  getUnpaidByPlayer: (playerId: number): Promise<StringJob[]> =>
    request<StringJob[]>(`/stringjobs/player/${playerId}/unpaid`),

  markAsPaid: (id: number): Promise<void> =>
    request<void>(`/stringjobs/${id}/paid`, {
      method: 'PATCH'
    }),

  create: (jobData: CreateStringJobDTO): Promise<StringJob> =>
    request<StringJob>('/stringjobs', {
      method: 'POST',
      body: jobData
    }),

  update: (id: number, jobData: UpdateStringJobDTO): Promise<void> =>
    request<void>(`/stringjobs/${id}`, {
      method: 'PUT',
      body: jobData
    }),

  complete: (id: number, completeData: CompleteStringJobDTO): Promise<void> =>
    request<void>(`/stringjobs/${id}/complete`, {
      method: 'PATCH',
      body: completeData
    }),

  cancel: (id: number, cancelReason: string): Promise<void> =>
    request<void>(`/stringjobs/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(cancelReason)
    }),

  start: (id: number): Promise<void> =>
    request<void>(`/stringjobs/${id}/start`, {
      method: 'PATCH'
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/stringjobs/${id}`, {
      method: 'DELETE'
    })
};

// Dashboard API
const dashboard = {
  getStats: (): Promise<DashboardStats> =>
    request<DashboardStats>('/dashboard/stats'),

  getDistribution: (tournamentId?: number): Promise<DistributionStats> =>
    request<DistributionStats>(tournamentId ? `/dashboard/distribution?tournamentId=${tournamentId}` : '/dashboard/distribution')
};

// Users API (Admin only)
const users = {
  getAll: (): Promise<User[]> =>
    request<User[]>('/users'),

  getById: (id: number): Promise<User> =>
    request<User>(`/users/${id}`),

  update: (id: number, userData: Partial<User>): Promise<void> =>
    request<void>(`/users/${id}`, {
      method: 'PUT',
      body: userData
    }),

  delete: (id: number): Promise<void> =>
    request<void>(`/users/${id}`, {
      method: 'DELETE'
    })
};

// Label API
const labels = {
  generateLabel: (generateLabelDto: GenerateLabelDto): Promise<LabelDto> =>
    request<LabelDto>('/labels', {
      method: 'POST',
      body: generateLabelDto
    }),

  getQRCodeData: (jobId: number): Promise<string> =>
    request<string>(`/labels/${jobId}/qrcode`)
}

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
  users,
  labels
};