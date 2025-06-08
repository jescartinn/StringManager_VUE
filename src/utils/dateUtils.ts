export interface TournamentDateInfo {
    status: 'upcoming' | 'active' | 'past'
    statusColor: 'info' | 'success' | 'grey'
    statusText: string
    daysText: string
    daysValue: number
}

export function getTournamentDateInfo(startDate: string, endDate: string): TournamentDateInfo {
    const today = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    today.setHours(12, 0, 0, 0)

    if (today < start) {
        // Torneo próximo
        const diffTime = start.getTime() - today.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return {
            status: 'upcoming',
            statusColor: 'info',
            statusText: 'Upcoming',
            daysText: 'Days until start',
            daysValue: days
        }
    } else if (today <= end) {
        // Torneo activo
        const diffTime = end.getTime() - today.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return {
            status: 'active',
            statusColor: 'success',
            statusText: 'Active',
            daysText: 'Days remaining',
            daysValue: days
        }
    } else {
        // Torneo terminado
        const diffTime = today.getTime() - end.getTime()
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return {
            status: 'past',
            statusColor: 'grey',
            statusText: 'Past',
            daysText: 'Days since ended',
            daysValue: days
        }
    }
}

export function getRemainingDays(endDate: string): number {
    const today = new Date()
    const end = new Date(endDate)

    end.setHours(23, 59, 59, 999)
    today.setHours(0, 0, 0, 0)

    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
}

export function formatDate(dateString: string): string {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
}