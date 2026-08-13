import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DateFields {
  date_start?: string | null
  date_end?: string | null
  date_year_start?: number | null
  date_year_end?: number | null
  date_precision?: string | null
}

const COMPACT_MONTHS = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// Uppercase-month case-file date label, e.g. "JUN 24, 1947" — used by the
// Timeline and Map pages' hover cards, distinct from formatDate's prose style.
export function formatDateCompact(event: DateFields): string {
  if (event.date_start) {
    const [y, m, d] = event.date_start.split('-')
    if (event.date_precision === 'day') return `${COMPACT_MONTHS[+m]} ${+d}, ${y}`
    if (event.date_precision === 'month') return `${COMPACT_MONTHS[+m]} ${y}`
    return y
  }
  return event.date_year_start ? String(event.date_year_start) : ''
}

export function formatDate(event: DateFields): string {
  if (event.date_start) {
    try {
      const d = new Date(event.date_start)
      if (event.date_precision === 'day') return format(d, 'MMM d, yyyy')
      if (event.date_precision === 'month') return format(d, 'MMM yyyy')
      if (event.date_precision === 'year_range') {
        if (event.date_end) return `${format(d, 'yyyy')}–${format(new Date(event.date_end), 'yyyy')}`
        return format(d, 'yyyy')
      }
      return format(d, 'yyyy')
    } catch {
      return event.date_start.slice(0, 10)
    }
  }
  if (event.date_year_start && event.date_year_end && event.date_year_end !== event.date_year_start)
    return `${event.date_year_start}–${event.date_year_end}`
  if (event.date_year_start) return `${event.date_year_start}`
  return 'Date unknown'
}
