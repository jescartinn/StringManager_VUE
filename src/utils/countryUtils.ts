import { countries } from 'countries-list'

export interface CountryOption {
    value: string  // ISO code (e.g. 'US')
    title: string  // Display name (e.g. 'United States (US)')
}

// Get all countries as options for select components
export function getCountryOptions(): CountryOption[] {
    return Object.entries(countries).map(([code, country]) => ({
        value: code,
        title: `${country.name} (${code})`
    })).sort((a, b) => a.title.localeCompare(b.title))
}

// Get country name from country code
export function getCountryName(countryCode: string | null | undefined): string {
    if (!countryCode) return ''
    return (countries as Record<string, any>)[countryCode]?.name || countryCode
}

// Get flag emoji for a country code
export function getCountryFlag(countryCode: string | null | undefined): string {
    if (!countryCode) return ''
    return (countries as Record<string, any>)[countryCode]?.emoji || ''
}