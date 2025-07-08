import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone } from "date-fns-tz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Timezone utilities for Brasília (UTC-3)
const BRASILIA_TIMEZONE = 'America/Sao_Paulo'

export function formatDateBrasilia(date: string | Date): string {
  return formatInTimeZone(new Date(date), BRASILIA_TIMEZONE, 'dd/MM/yyyy')
}

export function formatTimeBrasilia(date: string | Date): string {
  return formatInTimeZone(new Date(date), BRASILIA_TIMEZONE, 'HH:mm:ss')
}

export function formatDateTimeBrasilia(date: string | Date): string {
  return formatInTimeZone(new Date(date), BRASILIA_TIMEZONE, 'dd/MM/yyyy \'às\' HH:mm:ss')
}

export function getCurrentBrasiliaTimestamp(): string {
  return formatInTimeZone(new Date(), BRASILIA_TIMEZONE, 'dd/MM/yyyy \'às\' HH:mm:ss')
}
