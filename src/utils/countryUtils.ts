import { countries } from 'countries-list'

export interface CountryOption {
    value: string  // ISO code (e.g. 'US')
    title: string  // Display name (e.g. 'United States (US)')
}

export function getCountryOptions(): CountryOption[] {
    return Object.entries(countries).map(([code, country]) => ({
        value: code,
        title: `${country.name} (${code})`
    })).sort((a, b) => a.title.localeCompare(b.title))
}

export function getCountryName(countryCode: string | null | undefined): string {
    if (!countryCode) return ''
    return (countries as Record<string, any>)[countryCode]?.name || countryCode
}

export function getCountryFlag(countryCode: string | null | undefined): string {
    if (!countryCode) return ''
    return (countries as Record<string, any>)[countryCode]?.emoji || ''
}